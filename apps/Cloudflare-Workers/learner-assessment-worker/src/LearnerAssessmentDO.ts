// apps/learner-assessment-worker/src/LearnerAssessmentDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';
import { VerbatimAnalyzer, TranscriptQualityResult } from './VerbatimAnalyzer';

/** A diarized ASR segment returned by `runAsrOnWav` */
interface TranscribedSegment {
	peerId: string;
	role: string;
	text: string;
	start: number; // seconds offset from session start
}

/** Per-word detail coming from Deepgram */
interface WordInfo {
	peerId: string;
	role: string;
	word: string;
	start: number; // seconds
	end: number;   // seconds
	conf: number;  // 0-1 confidence
}

type SessionMode = 'robo' | 'normal';

enum CharliState {
	Idle = 'idle',
	AwaitingQuestion = 'awaiting_question'
}

// Safe to adjust: Total thinking time for robo-teacher responses (milliseconds)
// - Higher values = longer delays but encourage more thoughtful responses
// - Lower values = faster responses but may feel rushed for complex thoughts
// - Recommended range: 4000-7000ms (4-7 seconds)
// BUILD_FORCE_RESET: Session-specific metadata storage fix
const THINKING_TIME_MS = 5000;

type DGSocket = {
	ws: WebSocket;                  // open WS to Deepgram
	ready: Promise<void>;           // resolves when {"type":"listening"} arrives
	segments: TranscribedSegment[]; // all segs we’ve received so far
	lastSpeechTime: number;         // timestamp of last speech activity
	silenceStartTime: number;       // timestamp when silence started
	endpointingTimer: any;          // timer for endpointing detection
	utteranceEndTimer: any;         // timer for utterance end detection
	customThinkingTimer?: any;      // custom thinking time timer
	lastInterimText?: string;       // latest interim transcript text
	pendingThinkingProcess?: boolean; // flag for thinking process state
};

// const DG_MODEL    = 'nova-2';
// const DG_LANGUAGE = 'es-MX';

export class LearnerAssessmentDO extends DurableObject<Env> {
	/* ------------------------------------------------------------------ */
	private app   = new Hono();
	protected state: DurableObjectState;
	private words: WordInfo[] = [];

	/* runtime */
	private dgSocket: DGSocket | null = null;
	private reconnectAt: number = 0;
	private replyCooldownUntil = 0;     // epoch ms
	private static readonly REPLY_COOLDOWN_MS = 2_000;
	private lastThrottleLog = 0;        // rate-limit the spam
	private lastForwardLog  = 0;        // ditto for forward logs

	private flushInFlight = false;      // single-flight lock
	private lastLearnerText = '';       // dedupe identical transcripts
	private utteranceCounter = 0;       // monotonic utterance ID
	private lastChunkTime = 0;          // throttle for DG 10 msg/s limit
	private static readonly MIN_CHUNK_INTERVAL_MS = 50; // 5 msg/s = 50ms between chunks
	private connectBannerLogged = false;   // ← new
	private modeBannerLogged = false;
	
	// 🔍 VERBATIM TRANSCRIPT CAPTURE: Store raw Deepgram responses for analysis
	private verbatimCaptureData: Array<{
		timestamp: number;
		messageType: 'interim' | 'speech_final' | 'is_final';
		text: string;
		confidence: number;
		speaker: string;
		role: string;
		start: number;
		duration: number;
		rawMessage: any;
	}> = [];
	
	// 🔬 DEEPGRAM QA MODE: Skip scorecard generation for verbatim testing
	private skipScorecard: boolean = false;
	/* ------------------------------------------------------------------ */

	constructor(state: DurableObjectState, env: Env) {
		console.log(`[DEBUG-SEGMENTS] DO Constructor called - new instance created`);
		super(state, env);
		this.state = state;


		/* ────────── POST /audio/:roomId ────────── */
		this.app.post('/audio/:roomId', async c => {
			return this.handleAudioRequest(c);
		});

		/* ────────── POST /audio/:roomId{.*} fallback for timestamp suffixes ────────── */
		this.app.post('/audio/:roomId{.*}', async c => {
			return this.handleAudioRequest(c);
		});


		/* ────────── POST /bell/:roomId ────────── */
		this.app.post('/bell/:roomId', async c => {
			const roomId = c.req.param('roomId');
			const peerId = c.req.query('peerId') ?? 'unknown';
			const ts = Number(c.req.query('ts')) || Date.now();

			const key = `bells:${roomId}`;
			const bells = (await this.state.storage.get<{peerId:string,ts:number}[]>(key)) ?? [];
			bells.push({ peerId, ts });
			await this.state.storage.put(key, bells);

			return c.json({ ok: true });
		});

	}

	private async handleAudioRequest(c: any) {
		/* 1. params & query ------------------------------------------------ */
		const roomId = c.req.param('roomId');
		const q      = c.req.query();
		const action = q['action'];
		const role   = q['role']   ?? 'unknown';
		const peerId = q['peerId'] ?? 'unknown';

		// 🎯 AIRTIGHT LOGGING: Debug logging for end-session requests
		if (action === 'end-session') {
			console.log(`🎯 [HANDLE-AUDIO] END-SESSION REQUEST RECEIVED - roomId: ${roomId}, action: ${action}`);
			console.log(`🎯 [HANDLE-AUDIO] Full query params:`, JSON.stringify(q));
			console.log(`🎯 [HANDLE-AUDIO] Request URL: ${c.req.url}`);
			console.log(`🎯 [HANDLE-AUDIO] Request method: ${c.req.method}`);
			console.log(`🎯 [HANDLE-AUDIO] Current segments count: ${this.dgSocket?.segments?.length || 0}`);
			console.log(`🎯 [HANDLE-AUDIO] Deepgram socket state: ${this.dgSocket?.ws?.readyState || 'null'}`);
		}

		const requestedRobo = q['roboMode'] === 'true';
		const sessionIdStr  = q['sessionId'];
		const learnerIdStr  = q['learnerId'];
		this.skipScorecard = q['skipScorecard'] === 'true';
		const deepgramQA = q['deepgramQA'] === 'true';

		/* 2. store metadata or handle end-session ------------------------- */
		const metaKey = `metaWritten:${sessionIdStr}`;
		if (sessionIdStr && learnerIdStr && !(await this.state.storage.get(metaKey))) {
			console.log(`[LearnerAssessmentDO] Storing session metadata - sessionId: ${sessionIdStr}, learnerId: ${learnerIdStr}`);
			await this.storeSessionMetadata(sessionIdStr, learnerIdStr);
			await this.state.storage.put(metaKey, true);
			console.log(`[LearnerAssessmentDO] ✅ Session metadata stored successfully`);
		} else {
			console.log(`[LearnerAssessmentDO] Skipping metadata storage - sessionId: ${sessionIdStr}, learnerId: ${learnerIdStr}, metaWritten: ${await this.state.storage.get(metaKey)}`);
		}

		if (action === 'end-session') {
			console.log(`🎯 [END-SESSION] 🏁 Session ending for room ${roomId} - starting scorecard generation process`);
			console.log(`🎯 [END-SESSION] Session metadata - sessionId: ${sessionIdStr}, learnerId: ${learnerIdStr}`);
			console.log(`🎯 [END-SESSION] Skip scorecard: ${this.skipScorecard} (Deepgram QA mode: ${this.skipScorecard ? 'YES' : 'NO'})`);
			console.log(`🎯 [END-SESSION] Deepgram socket exists: ${!!this.dgSocket}`);
			console.log(`🎯 [END-SESSION] Segments available: ${this.dgSocket?.segments?.length || 0}`);
			
			try {
				// Send CloseStream message before closing Deepgram connection
				if (this.dgSocket?.ws.readyState === WebSocket.OPEN) {
					console.log(`🎯 [END-SESSION] ✅ Closing Deepgram stream with ${this.dgSocket.segments?.length || 0} collected segments`);
					this.dgSocket.ws.send(JSON.stringify({ type: "CloseStream" }));
				} else {
					console.warn(`🎯 [END-SESSION] ⚠️ WARNING: Deepgram socket not open during session end - readyState: ${this.dgSocket?.ws.readyState || 'null'}`);
				}
				
				// CRITICAL FIX: Extract segments BEFORE closing to prevent race condition
				const collectedSegments = this.dgSocket?.segments || [];
				console.log(`🎯 [END-SESSION] 🚀 Extracted ${collectedSegments.length} segments before closing socket`);
				
				console.log(`🎯 [END-SESSION] 🚀 Calling transcribeAndDiarizeAll for roomId: ${roomId}`);
				await this.transcribeAndDiarizeAll(roomId, collectedSegments);
				
				console.log(`🎯 [END-SESSION] ✅ transcribeAndDiarizeAll completed successfully`);
				this.dgSocket?.ws.close(1000);
				console.log(`🎯 [END-SESSION] [DEBUG-SEGMENTS] Clearing dgSocket, segments lost: ${this.dgSocket?.segments?.length || 0}, reason: session-end`);
				this.dgSocket = null;
				
				console.log(`🎯 [END-SESSION] 🎉 End-session processing completed successfully`);
				return c.json({ status: 'transcription completed' });
			} catch (err) {
				console.error(`🎯 [END-SESSION] ❌ CRITICAL ERROR in end-session processing:`, err);
				console.error(`🎯 [END-SESSION] Error stack:`, err instanceof Error ? err.stack : 'No stack trace');
				return c.json({ status: 'completed with errors', error: String(err) }, 200);
			}
		}

		/* 3. decide session mode once ------------------------------------ */
		await this.initializeSessionMode(requestedRobo);
		
		/* 3b. store deepgramQA flag for robo mode calls ------------------ */
		if ((await this.state.storage.get('deepgramQA')) === undefined) {
			const deepgramQABool = deepgramQA === true || deepgramQA === 'true';
			await this.state.storage.put('deepgramQA', deepgramQABool);
			console.log(`[LearnerAssessmentDO] deepgramQA mode: ${deepgramQABool ? 'enabled' : 'disabled'}`);
		}

		/* 4. read + validate chunk --------------------------------------- */
		const chunk = new Uint8Array(await c.req.arrayBuffer());
		if (chunk.length === 0)       return c.text('No audio data', 400);
		if (chunk.length > 16_384) { console.error('[LearnerAssessmentDO] chunk too large'); return c.text('Chunk too large', 400); }


		/* 5 a. drop chunks during Deepgram back-off ---------------------- */
		if (this.reconnectAt > Date.now()) {
			// DG is still in cool-down; ignore this PCM frame.
			return c.json({
				status: 'dg_backoff',
				retryAfterMs: this.reconnectAt - Date.now()
			});
		}

		/* 5 b. send to Deepgram & persist -------------------------------- */

		// Send to Deepgram in BOTH modes (normal and robo)
		try {
			const dg = await this.getOrInitDG(roomId);
			await dg.ready; // ensure DG said "listening"

			// Throttle chunks to respect Deepgram's 10 msg/s limit
			const now = Date.now();
			const timeSinceLastChunk = now - this.lastChunkTime;
			if (timeSinceLastChunk < LearnerAssessmentDO.MIN_CHUNK_INTERVAL_MS) {
				// Say it once every 2 s at most
				if (now - this.lastThrottleLog > 2_000) {
					console.log('[DG] throttling burst (dropping fast packets)');
					this.lastThrottleLog = now;
				}
				return c.json({ status: 'throttled' });
			}
			this.lastChunkTime = now;

			// Send binary PCM frames directly
			dg.ws.send(chunk.buffer);

			// Optional insight: one line per packet that *did* go through
			if (now - this.lastForwardLog > 1_000) {            // 1-s guard
				console.log('[DG] → forwarded', chunk.length, 'bytes');
				this.lastForwardLog = now;
			}
		} catch (err) {
			console.error(`[LearnerAssessmentDO] Deepgram error: ${err}`);
			// Set back-off on connection failure
			this.reconnectAt = Date.now() + 5000;
			// Continue processing - robo mode will get empty transcript
		}

		// PCM chunk metadata for minimal session tracking
		await this.saveChunkMetadata(roomId, peerId, role);

		return c.json({ status: 'ok' });
	}

	/* ─────────────────────────── Deepgram socket ──────────────────────── */
	private async getOrInitDG(roomId: string): Promise<DGSocket> {
		if (this.dgSocket) return this.dgSocket;

		// Check if we need to wait before reconnecting
		if (this.reconnectAt > Date.now()) {
			throw new Error(`Deepgram reconnect back-off active until ${new Date(this.reconnectAt)}`);
		}

		const wsURL = new URL('wss://api.deepgram.com/v1/listen');
		wsURL.searchParams.set('model',            'nova-2');      // ASR model
		wsURL.searchParams.set('language',         'es-MX');      // locale
		wsURL.searchParams.set('sample_rate',      '48000');      // PCM rate
		wsURL.searchParams.set('encoding',         'linear16');   // PCM encoding
		wsURL.searchParams.set('diarize',          'true');       // speaker IDs

		// 🔄 Remove utterance_end_ms limit to allow longer thinking time (5-10s)
		wsURL.searchParams.set('interim_results',  'true');
		wsURL.searchParams.set('endpointing', '8000');      // 8s audio silence → speech_final (longer thinking time)
		// wsURL.searchParams.set('utterance_end_ms', '5000'); // REMOVED - was limiting thinking time to 5s

		// Enable VAD events as backup for endpointing
		wsURL.searchParams.set('vad_events', 'true');  // Voice activity detection backup

		// 🎯 VERBATIM TRANSCRIPTION: Disable all auto-correction for learner mistake detection
		wsURL.searchParams.set('smart_format', 'false');     // No auto-formatting (preserves raw speech)
		// wsURL.searchParams.set('punctuate', 'false');        // No auto-punctuation (preserves speech flow)
		wsURL.searchParams.set('profanity_filter', 'false'); // No profanity replacement (preserves all words)

		// wsURL.searchParams.set('keywords', 'hey charli'); // DISABLED - might interfere
		// wsURL.searchParams.set('keywords_priority', 'high'); // DISABLED

		console.log('[DG] ALWAYS LOG: connecting with URL:', wsURL.toString());
		if (!this.connectBannerLogged) {
			console.log('[DG] connecting with NEW PARAMS (8s endpointing, no utterance_end_ms)', wsURL.toString());
			this.connectBannerLogged = true;
		}
		const dgWS = new WebSocket(wsURL.toString(), ['token', this.env.DEEPGRAM_API_KEY]);
		(dgWS as unknown as { binaryType: string }).binaryType = 'arraybuffer';

		let resolve!: () => void, reject!: (e:any) => void;
		const ready = new Promise<void>((r, j) => { resolve = r; reject = j; });

		dgWS.addEventListener('open', () => {
			console.log('[DG] open - ready to receive audio');
			resolve();
		});

		dgWS.addEventListener('error', e  => {
			console.log('[DG] error event:', e);
			console.log('[DG] error message:', e.message || 'no message');
			console.log('[DG] error type:', e.type || 'no type');
		});
		dgWS.addEventListener('close', e  => {
			console.log('[DG] close code:', e.code, 'reason:', e.reason || 'no reason');
			console.log(`[DEBUG-SEGMENTS] Clearing dgSocket, segments lost: ${this.dgSocket?.segments?.length || 0}, reason: ws-close`);
			this.dgSocket = null; // Clean up socket reference
			if (e.code !== 1000) {
				// Abnormal close - set 2 second back-off
				this.reconnectAt = Date.now() + 2000;
				console.log(`[DG] Setting reconnect back-off until ${new Date(this.reconnectAt)}`);
				reject(new Error(`WS closed code=${e.code}`));
			}
		});
		dgWS.addEventListener('message', async evt => {
			const msg = JSON.parse(evt.data as string);

			if (msg.type === 'Error' || msg.error) {
				console.log('[DG] WS error payload:', JSON.stringify(msg));
				reject(new Error(msg.error || msg));
				return;
			}

			if (msg.type === 'listening' || msg.type === 'connection_established') {
				console.log('[DG] listening');
				// Broadcast that Deepgram is ready to listen
				this.broadcastToRoom(roomId, 'deepgramListening', {}).catch(err =>
					console.error('[DG] Failed to broadcast deepgramListening:', err)
				);
				resolve();
				return;
			}

			// Handle smart-listen events
			if (msg.type === 'speech_started') {
				console.log('[DG] speech started');
				return;
			}

			// Handle VAD events for voice activity detection
			if (msg.type === 'SpeechStarted') {
				console.log('[DG-VAD] Speech activity started');
				if (this.dgSocket) {
					this.dgSocket.lastSpeechTime = Date.now();
					// Clear any pending silence timers
					if (this.dgSocket.endpointingTimer) {
						clearTimeout(this.dgSocket.endpointingTimer);
						this.dgSocket.endpointingTimer = null;
					}
				}
				return;
			}

			if (msg.type === 'UtteranceEnd') {
				console.log('[DG-VAD] Utterance ended - could trigger response after longer pause');
				// This gives us more control over when to consider speech "done"
				// without the 5-second utterance_end_ms limit
				return;
			}

			// Log ALL Results messages for debugging with analysis
			if (msg.type === 'Results') {
				const text = msg.channel?.alternatives?.[0]?.transcript;
				const hasText = Boolean(text && text.trim());
				const now = Date.now();

				console.log(`[DG-DEBUG] Results message - hasText: ${hasText}, text: "${text || 'empty'}"`);

				// 🔍 VERBATIM CAPTURE: Store ALL Deepgram responses for later analysis
				if (hasText) {
					console.log(`[VERBATIM-DEBUG] About to capture: "${text}"`);
					const speaker = String(msg.channel?.speaker ?? '0');
					const role = speaker === '0' ? 'learner' : 'teacher';
					const confidence = msg.channel?.alternatives?.[0]?.confidence || 0;
					const start = msg.start ?? 0;
					const duration = msg.duration ?? 0;
					
					let messageType: 'interim' | 'speech_final' | 'is_final';
					if (msg.speech_final === true) {
						messageType = 'speech_final';
					} else if (msg.is_final === true) {
						messageType = 'is_final';
					} else {
						messageType = 'interim';
					}

					this.verbatimCaptureData.push({
						timestamp: now,
						messageType,
						text: text || '',
						confidence,
						speaker,
						role,
						start,
						duration,
						rawMessage: JSON.parse(JSON.stringify(msg)) // Deep clone
					});

					console.log(`[VERBATIM-CAPTURE] Stored ${messageType} transcript: "${text}" (${role}, conf: ${confidence})`);
				}

				// Track speech timing for endpointing analysis
				if (hasText && !msg.speech_final && !msg.is_final) {
					// Interim results indicate ongoing speech
					if (this.dgSocket) {
						this.dgSocket.lastSpeechTime = now;
						// Clear any silence tracking during active speech
						if (this.dgSocket.silenceStartTime > 0) {
							console.log(`[DG-TIMING] Speech resumed after ${(now - this.dgSocket.silenceStartTime)}ms of silence`);
							this.dgSocket.silenceStartTime = 0;
						}
						// Clear any pending timers during active speech
						if (this.dgSocket.endpointingTimer) {
							clearTimeout(this.dgSocket.endpointingTimer);
							this.dgSocket.endpointingTimer = null;
							console.log(`[DG-TIMING] Cleared endpointing timer due to ongoing speech`);
						}
						if (this.dgSocket.utteranceEndTimer) {
							clearTimeout(this.dgSocket.utteranceEndTimer);
							this.dgSocket.utteranceEndTimer = null;
							console.log(`[DG-TIMING] Cleared utterance_end timer due to ongoing speech`);
						}
					}
				} else if (!hasText && this.dgSocket && this.dgSocket.lastSpeechTime > 0) {
					// Empty interim results might indicate silence starting
					if (this.dgSocket.silenceStartTime === 0) {
						this.dgSocket.silenceStartTime = now;
						console.log(`[DG-TIMING] Silence detected, starting countdown timers`);

						// Start 3-second endpointing countdown
						this.dgSocket.endpointingTimer = setTimeout(() => {
							console.log(`[DG-TIMING] ⏰ 3-second endpointing threshold reached - expecting speech_final soon`);
						}, 3000);

						// Start 5-second utterance_end countdown
						this.dgSocket.utteranceEndTimer = setTimeout(() => {
							console.log(`[DG-TIMING] ⏰ 5-second utterance_end threshold reached - expecting is_final soon`);
						}, 5000);
					}
				}

				// Enhanced timing analysis for final results
				const silenceDuration = this.dgSocket?.silenceStartTime && this.dgSocket.silenceStartTime > 0 ?
					(now - this.dgSocket.silenceStartTime) : 0;
				const timeSinceLastSpeech = this.dgSocket?.lastSpeechTime && this.dgSocket.lastSpeechTime > 0 ?
					(now - this.dgSocket.lastSpeechTime) : 0;

				console.log(`[DG-ANALYSIS] ${msg.speech_final ? 'SPEECH_FINAL' : msg.is_final ? 'IS_FINAL_ONLY' : 'INTERIM'}: "${text || ''}" | confidence: ${msg.channel?.alternatives?.[0]?.confidence || 0} | duration: ${msg.duration} | start: ${msg.start}`);
				console.log(`[DG-TIMING] Silence: ${silenceDuration}ms, Since last speech: ${timeSinceLastSpeech}ms`);

				// Full raw message for detailed analysis
				console.log(`[DG-DEBUG] Raw message:`, JSON.stringify(msg, null, 2));
			}

			// Handle speech_final messages (high confidence, for scorecard)
			if (msg.type === 'Results' && msg.speech_final === true) {
				const text = msg.channel?.alternatives?.[0]?.transcript;
				const speaker = String(msg.channel?.speaker ?? '0');
				const role = speaker === '0' ? 'learner' : 'teacher';
				const start = msg.start ?? 0;
				const duration = msg.duration ?? 0;

				if (text) {
					const now = Date.now();
					const actualSilence = this.dgSocket?.silenceStartTime && this.dgSocket.silenceStartTime > 0 ?
						(now - this.dgSocket.silenceStartTime) : 0;
					const timeSinceLastSpeech = this.dgSocket?.lastSpeechTime && this.dgSocket.lastSpeechTime > 0 ?
						(now - this.dgSocket.lastSpeechTime) : 0;

					console.log(`[DG] speech_final ${role} utterance (⏱ ${duration.toFixed(2)}s): "${text}"`);
					console.log(`[DG-TIMING] ✅ speech_final fired after ${actualSilence}ms silence, ${timeSinceLastSpeech}ms since last speech`);

					// Clear timing trackers since we got the expected speech_final
					if (this.dgSocket) {
						if (this.dgSocket.endpointingTimer) {
							clearTimeout(this.dgSocket.endpointingTimer);
							this.dgSocket.endpointingTimer = null;
							console.log(`[DG-TIMING] Cleared endpointing timer (speech_final succeeded)`);
						}
						if (this.dgSocket.utteranceEndTimer) {
							clearTimeout(this.dgSocket.utteranceEndTimer);
							this.dgSocket.utteranceEndTimer = null;
							console.log(`[DG-TIMING] Cleared utterance_end timer (speech_final succeeded)`);
						}
						this.dgSocket.silenceStartTime = 0;
						this.dgSocket.lastSpeechTime = 0;
					}
					console.log(`[DG] speech_final=${msg.speech_final}, is_final=${msg.is_final}, duration=${duration}s, start=${start}s`);

					const seg: TranscribedSegment = {
						peerId: speaker,
						role,
						start,
						text
					};
					console.log(`[DEBUG-SEGMENTS] Adding segment: "${seg.text}" (${seg.role}) - total segments: ${this.dgSocket!.segments.length + 1}`);
			this.dgSocket!.segments.push(seg);

					// For robo mode, trigger utterance processing for learner speech
					if (role === 'learner') {
						const sessionMode = await this.getSessionMode();
						console.log(`[DG] Learner speech detected in ${sessionMode} mode: "${text}"`);
						if (sessionMode === 'robo' && !this.dgSocket?.pendingThinkingProcess) {
							console.log(`[DG] Triggering flushUtterance for speech_final: "${text}"`);
							this.flushUtterance(roomId, text).catch(err =>
								console.error('[DG] robo utterance processing error:', err)
							);
						} else if (sessionMode === 'robo' && this.dgSocket?.pendingThinkingProcess) {
							console.log(`[DG] Skipping speech_final processing - already handling via thinking timer: "${text}"`);
						}
					}
				}
			}
			// Handle interim results to track ongoing speech and implement custom thinking time
			else if (msg.type === 'Results' && !msg.is_final && !msg.speech_final) {
				const text = msg.channel?.alternatives?.[0]?.transcript?.trim();
				const speaker = String(msg.channel?.speaker ?? '0');
				const role = speaker === '0' ? 'learner' : 'teacher';

				if (text && role === 'learner' && this.dgSocket) {
					// Update latest interim text and speech timing
					this.dgSocket.lastInterimText = text;
					this.dgSocket.lastSpeechTime = Date.now();

					// Clear any existing thinking timer since speech is ongoing
					if (this.dgSocket.customThinkingTimer) {
						clearTimeout(this.dgSocket.customThinkingTimer);
						this.dgSocket.customThinkingTimer = null;
						this.dgSocket.pendingThinkingProcess = false;
						console.log('[DG-THINKING] Cleared thinking timer - learner speech ongoing');
					}
				}
			}
			// Handle is_final with custom thinking time logic
			else if (msg.type === 'Results' && msg.is_final === true && msg.speech_final !== true) {
				const text = msg.channel?.alternatives?.[0]?.transcript;
				const speaker = String(msg.channel?.speaker ?? '0');
				const role = speaker === '0' ? 'learner' : 'teacher';
				const start = msg.start ?? 0;
				const duration = msg.duration ?? 0;

				// CRITICAL FIX: Add segment to array for all text (learner and teacher)
				// This ensures segments are captured for scorecard generation
				if (text && this.dgSocket) {
					const seg: TranscribedSegment = {
						peerId: speaker,
						role,
						start,
						text
					};
					console.log(`[DEBUG-SEGMENTS] Adding is_final segment: "${seg.text}" (${seg.role}) - total segments: ${this.dgSocket.segments.length + 1}`);
					this.dgSocket.segments.push(seg);
				}

				// Broadcast Deepgram processing state for learner speech
				if (text && role === 'learner') {
					await this.broadcastToRoom(roomId, 'processingState', { state: 'deepgram_processing' });
				}

				if (text && role === 'learner' && this.dgSocket) {
					const now = Date.now();
					const timeSinceLastSpeech = this.dgSocket.lastSpeechTime > 0 ?
						(now - this.dgSocket.lastSpeechTime) : 0;

					console.log(`[DG-THINKING] is_final received for learner after ${timeSinceLastSpeech}ms: "${text}"`);

					// If this is a premature is_final (< 5 seconds since last speech), start thinking timer
					if (timeSinceLastSpeech < 5000) {
						const thinkingTimeMs = THINKING_TIME_MS;
						const remainingThinkingTime = thinkingTimeMs - timeSinceLastSpeech;

						console.log(`[DG-THINKING] 🧠 Starting ${remainingThinkingTime}ms thinking timer for: "${text}"`);

						// Broadcast thinking time state
						await this.broadcastToRoom(roomId, 'processingState', {
							state: 'thinking_time_system',
							remainingTime: remainingThinkingTime
						});

						// Set flag to prevent speech_final from also processing this utterance
						this.dgSocket.pendingThinkingProcess = true;

						// Clear any existing timer
						if (this.dgSocket.customThinkingTimer) {
							clearTimeout(this.dgSocket.customThinkingTimer);
						}

						// Start new thinking timer
						this.dgSocket.customThinkingTimer = setTimeout(async () => {
							console.log(`[DG-THINKING] ⏰ Thinking time expired, processing utterance: "${text}"`);

							// Clear thinking time state
							await this.broadcastToRoom(roomId, 'processingState', { state: 'idle' });

							// Use the most recent interim text if available, otherwise use the is_final text
							const finalText = this.dgSocket?.lastInterimText || text;

							const sessionMode = await this.getSessionMode();
							if (sessionMode === 'robo') {
								console.log(`[DG-THINKING] Triggering flushUtterance after thinking time: "${finalText}"`);
								this.flushUtterance(roomId, finalText).catch(err =>
									console.error('[DG-THINKING] robo utterance processing error:', err)
								);
							}

							// Clear the timer reference and flag
							if (this.dgSocket) {
								this.dgSocket.customThinkingTimer = null;
								this.dgSocket.pendingThinkingProcess = false;
							}
						}, remainingThinkingTime);

					} else {
						// Sufficient time has passed, process immediately
						console.log(`[DG-THINKING] ✅ Sufficient thinking time elapsed (${timeSinceLastSpeech}ms), processing: "${text}"`);

						// Set flag to prevent speech_final from also processing this utterance
						this.dgSocket.pendingThinkingProcess = true;

						const sessionMode = await this.getSessionMode();
						if (sessionMode === 'robo') {
							console.log(`[DG-THINKING] Triggering immediate flushUtterance: "${text}"`);
							this.flushUtterance(roomId, text).catch(err =>
								console.error('[DG-THINKING] robo utterance processing error:', err)
							);
						}

						// Clear flag after processing
						this.dgSocket.pendingThinkingProcess = false;
					}

					// Clear standard timing trackers
					if (this.dgSocket.endpointingTimer) {
						clearTimeout(this.dgSocket.endpointingTimer);
						this.dgSocket.endpointingTimer = null;
					}
					if (this.dgSocket.utteranceEndTimer) {
						clearTimeout(this.dgSocket.utteranceEndTimer);
						this.dgSocket.utteranceEndTimer = null;
					}
					this.dgSocket.silenceStartTime = 0;
				}
			}

			// Handle Hey Charli detection for speech_final messages only
			if (msg.type === 'Results' && msg.speech_final === true) {
				const text = msg.channel?.alternatives?.[0]?.transcript;
				if (text) {
					await this.handleCharliDetection(roomId, text);
				}
			}
			return;
		});

		console.log(`[DEBUG-SEGMENTS] Initializing dgSocket with empty segments array`);
		this.dgSocket = {
			ws: dgWS,
			ready,
			segments: [],
			lastSpeechTime: 0,
			silenceStartTime: 0,
			endpointingTimer: null,
			utteranceEndTimer: null,
			customThinkingTimer: null,
			lastInterimText: '',
			pendingThinkingProcess: false
		};
		try {
			await ready;
			return this.dgSocket;
		} catch (err) {
			// Zero out dgSocket on connection failure so next chunk triggers fresh connect
			console.log(`[DEBUG-SEGMENTS] Clearing dgSocket, segments lost: ${this.dgSocket?.segments?.length || 0}, reason: connection-failure`);
			this.dgSocket = null;
			throw err;
		}
	}

	/* ───────────────────────── Durable-object fetch ───────────────────── */
	async fetch(request: Request) {
		const url = new URL(request.url);
		const action = url.searchParams.get('action');
		
		// 🎯 AIRTIGHT LOGGING: Track requests entering the DO
		if (action === 'end-session') {
			console.log(`🎯 [DO-FETCH] END-SESSION REQUEST RECEIVED IN DO FETCH`);
			console.log(`🎯 [DO-FETCH] Request URL: ${request.url}`);
			console.log(`🎯 [DO-FETCH] Request method: ${request.method}`);
			console.log(`🎯 [DO-FETCH] Segments in memory: ${this.dgSocket?.segments?.length || 'none'}`);
		} else {
			console.log(`[DEBUG-SEGMENTS] DO fetch called - segments in memory: ${this.dgSocket?.segments?.length || 'none'}`);
		}
		
		const response = await this.app.fetch(request);
		
		if (action === 'end-session') {
			console.log(`🎯 [DO-FETCH] Response status: ${response.status}`);
			console.log(`🎯 [DO-FETCH] Response generated for end-session request`);
		}
		
		return response;
	}


	/* ───────────────────── session-mode helpers (storage) ─────────────── */
	private async getSessionMode(): Promise<SessionMode> {
		return (await this.state.storage.get<boolean>('roboMode')) ? 'robo' : 'normal';
	}
	private async initializeSessionMode(requestedRobo: boolean | undefined) {
		if ((await this.state.storage.get('roboMode')) !== undefined) return;
		const final = requestedRobo ?? false;
		await this.state.storage.put('roboMode', final);
		console.log(`[LearnerAssessmentDO] mode ${final ? 'robo' : 'normal'}`);
		if (!this.modeBannerLogged) {
			console.log(`[LearnerAssessmentDO] mode ${final ? 'robo' : 'normal'}`);
			this.modeBannerLogged = true;           // ← never again this isolate
		}
	}
	private async storeSessionMetadata(sessionId: number | string, learnerId: number | string) {
		const sessionIdNum = typeof sessionId === 'string' ? parseInt(sessionId.replace('robo-', '')) : sessionId;
		const learnerIdNum = typeof learnerId === 'string' ? parseInt(learnerId) : learnerId;
		await this.state.storage.put('sessionId', sessionIdNum);
		await this.state.storage.put('learnerId', learnerIdNum);
	}

	/* ───────────────────── charli state helpers ─────────────── */
	private async getCharliState(): Promise<CharliState> {
		return (await this.state.storage.get<CharliState>('charliState')) ?? CharliState.Idle;
	}
	private async setCharliState(state: CharliState) {
		await this.state.storage.put('charliState', state);
	}

	private async handleCharliDetection(roomId: string, text: string) {
		const currentState = await this.getCharliState();
		const normalizedText = text.toLowerCase().trim();

		if (currentState === CharliState.Idle && /hey charli/i.test(normalizedText)) {
			await this.setCharliState(CharliState.AwaitingQuestion);
			await this.broadcastToRoom(roomId, 'charliStart', {});
		} else if (currentState === CharliState.AwaitingQuestion) {
			await this.setCharliState(CharliState.Idle);

			// Delegate translation to HeyCharliDO
			try {
				const response = await this.env.HEY_CHARLI_WORKER.fetch('http://hey-charli/translate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ question: text })
				});
				const { answer } = await response.json() as { answer: string };

				await this.broadcastToRoom(roomId, 'charliAnswer', { text: answer });
				await this.broadcastToRoom(roomId, 'teacherNotice', {
					message: 'El aprendiz está preguntando a Charli una pregunta.'
				});
			} catch (error) {
				console.error('[Charli] Translation error:', error);
				await this.broadcastToRoom(roomId, 'charliAnswer', {
					text: 'Error en la traducción'
				});
			}
		}
	}

	/* ───────────────── learner → robo round-trip (smart-listen) ───────────── */
	private async flushUtterance(roomId: string, learnerText: string) {
		if (this.flushInFlight) {
			console.log('[ASR] flushUtterance called but already in flight');
			return;
		}
		this.flushInFlight = true;

		try {
			console.log(`[LearnerAssessmentDO] flushUtterance fired at ${new Date().toISOString()} for text: "${learnerText}"`);
			console.log(`[ASR] lastLearnerText was: "${this.lastLearnerText || 'null'}"`);
			console.log(`[ASR] cooldown until: ${new Date(this.replyCooldownUntil || 0).toISOString()}`);

			// Avoid overlapping answers
			const now = Date.now();
			if (now < this.replyCooldownUntil) {
				const remainingMs = this.replyCooldownUntil - now;
				console.log(`[Robo] skipping — cooldown still active for ${remainingMs}ms`);
				return;
			}

			if (!learnerText.trim()) {
				console.log('[ASR] ignoring empty transcript');
				return;
			}

			// Skip only exact duplicates - Deepgram should deliver clean final results
			if (learnerText === this.lastLearnerText) {
				console.log(`[ASR] ignoring exact duplicate transcript: "${learnerText}"`);
				return;
			}

			// Restore prefix filtering - Deepgram is still sending incremental results despite smart_format=true
			// This prevents processing every incremental result as a separate utterance
			if (this.lastLearnerText
				&& learnerText.startsWith(this.lastLearnerText)
				&& learnerText.length > this.lastLearnerText.length) {
				console.log(`[ASR] ignoring prefix-duplicate (incremental result): "${learnerText}" extends "${this.lastLearnerText}"`);
				return;
			}
			console.log(`[ASR] Processing new utterance: "${learnerText}"`);
			this.lastLearnerText = learnerText;

			console.log(`[LearnerAssessmentDO] Fetching robo reply for text: "${learnerText}"`);

			// Set cooldown BEFORE making the call to prevent race conditions
			this.replyCooldownUntil = Date.now() + LearnerAssessmentDO.REPLY_COOLDOWN_MS;

			/* generate utterance ID and call robo-test-mode Worker */
			this.utteranceCounter = (this.utteranceCounter ?? 0) + 1;
			const utteranceId = this.utteranceCounter;

			// Get the deepgramQA flag from storage (set during handleAudioRequest)
			const deepgramQA = await this.state.storage.get<boolean>('deepgramQA') || false;
			
			const res = await fetch(this.env.ROBO_TEST_URL, {
				method : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body   : JSON.stringify({ userText: learnerText, roomId, utteranceId, deepgramQA })
			});
			if (!res.ok) {
				console.error(`[LearnerAssessmentDO] Robo service HTTP error: ${res.status}`);
				return;
			}

			const response = await res.json<{ status: string; utteranceId: number }>();
			console.log(`[LearnerAssessmentDO] Robo service queued response for utteranceId: ${response.utteranceId}`);
		} catch (err) {
			console.error('[LearnerAssessmentDO] robo reply error', err);
		} finally {
			this.flushInFlight = false;
		}
	}

	/* ────────────────────── Minimal chunk metadata for session tracking ─────────────── */
	private async saveChunkMetadata(
		roomId: string, peerId: string, role: string
	) {
		const counterKey = `chunkCounter:${peerId}`;
		const idx = (await this.state.storage.get<number>(counterKey)) ?? 0;

		// Batch metadata into single storage operation
		const now = Date.now();

		await this.state.storage.put({
			[counterKey]: idx + 1,
			[`${roomId}/${peerId}/lastActivity`]: now,
			[`${roomId}/${peerId}/role`]: role
		}, { allowConcurrency: false });
	}




	/* ────────────── batch diarisation & scorecard ─────────── */
	private async transcribeAndDiarizeAll(roomId: string, extractedSegments?: TranscribedSegment[]) {
		console.log(`🎯 [TRANSCRIBE] 🚀 Starting transcribeAndDiarizeAll for room ${roomId}`);

		// Use extracted segments (from race condition fix) or fallback to dgSocket segments
		const allSegments = extractedSegments || this.dgSocket?.segments || [];
		console.log(`🎯 [TRANSCRIBE] Using ${extractedSegments ? 'extracted' : 'dgSocket'} segments: ${allSegments.length} total`);
		if (allSegments.length > 0) {
			console.log(`🎯 [TRANSCRIBE] Segment details: ${allSegments.map(s => `"${s.text}" (${s.role})`).join(', ')}`);
		}

		if (allSegments.length === 0) {
			console.log(`🎯 [TRANSCRIBE] ❌ No segments found for transcription`);
			await this.broadcastToRoom(roomId, 'transcription-complete', { text: '', scorecard: null });
			return;
		}

		// Sort segments by start time
		allSegments.sort((a, b) => a.start - b.start);

		// Create merged transcript
		const mergedText = allSegments.map(seg => `[${seg.start.toFixed(2)}] ${seg.role}: "${seg.text}"`).join('\n');
		console.log(`[LearnerAssessmentDO] Merged transcript:\n${mergedText}`);

		// Extract learner segments for scorecard
		const learnerSegments = allSegments.filter(seg => seg.role === 'learner');
		const fullTranscript = allSegments.map(seg => `[${seg.start.toFixed(2)}] ${seg.role}: "${seg.text}"`).join('\n');

		console.log(`[LearnerAssessmentDO] Extracted ${learnerSegments.length} learner segments from ${allSegments.length} total segments`);

		// Only send the (start, text) fields to ScorecardOrchestratorDO
		const simplifiedLearnerSegments = learnerSegments.map(seg => ({
			start: seg.start,
			text: seg.text,
		}));

		const session_id = await this.state.storage.get<number>('sessionId');
		const learner_id = await this.state.storage.get<number>('learnerId');
		const metaWritten = await this.state.storage.get('metaWritten');
		console.log(`🎯 [TRANSCRIBE] Retrieved storage data - session_id: ${session_id}, learner_id: ${learner_id}, metaWritten: ${metaWritten}`);

		if (!session_id || !learner_id) {
			console.error(`🎯 [TRANSCRIBE] ❌ CRITICAL ERROR: Missing required IDs - session_id: ${session_id}, learner_id: ${learner_id}. Cannot generate scorecard!`);
			console.error(`🎯 [TRANSCRIBE] Storage debug - metaWritten: ${metaWritten}, all storage keys:`, Object.keys(await this.state.storage.list()));
			await this.broadcastToRoom(roomId, 'transcription-complete', { text: mergedText, scorecard: null });
			return;
		}

		const bellEvents = await this.state.storage.get<{peerId:string,ts:number}[]>(`bells:${roomId}`) ?? [];
		console.log(`[LearnerAssessmentDO] Retrieved ${bellEvents.length} bell events for teacher scorecard`);

		if (this.skipScorecard) {
			console.log(`🎯 [TRANSCRIBE] 🚫 SKIPPING SCORECARD: Deepgram QA mode active - scorecard generation disabled`);
			await this.broadcastToRoom(roomId, 'transcription-complete', { text: mergedText, scorecard: null });
			
			// 🔍 CRITICAL FIX: Cleanup storage and generate verbatim analysis even when skipping scorecard
			console.log(`🎯 [TRANSCRIBE] Cleaning up storage for room ${roomId} (QA mode)`);
			await this.cleanupAll(roomId);
			console.log(`🎯 [TRANSCRIBE] 🎉 transcribeAndDiarizeAll completed for room ${roomId} (QA mode)`);
			return;
		}

		console.log(`🎯 [TRANSCRIBE] 🚀 Initiating scorecard generation pipeline for session ${session_id}`);
		console.log(`🎯 [TRANSCRIBE] Scorecard request data: ${simplifiedLearnerSegments.length} learner segments, ${bellEvents.length} bell events`);
		console.log(`🎯 [TRANSCRIBE] 📊 Detailed scorecard request:`, {
			roomId,
			session_id,
			learner_id,
			simplifiedLearnerSegmentsCount: simplifiedLearnerSegments.length,
			fullTranscriptLength: fullTranscript.length,
			bellEventsCount: bellEvents.length,
			firstSegment: simplifiedLearnerSegments[0] || null,
			lastSegment: simplifiedLearnerSegments[simplifiedLearnerSegments.length - 1] || null
		});

		try {
			try {
				const orchestratorDO = this.env.SCORECARD_ORCHESTRATOR_DO.get(this.env.SCORECARD_ORCHESTRATOR_DO.idFromName(roomId));
				console.log(`🎯 [TRANSCRIBE] ✅ ScorecardOrchestratorDO instance created for room ${roomId}`);
			
			const requestBody = {
				learnerSegments: simplifiedLearnerSegments,
				fullTranscript,
				bellEvents,
				session_id,
				learner_id
			};
			
			console.log(`🎯 [TRANSCRIBE] 🚀 Sending request to ScorecardOrchestratorDO`);
			console.log(`🎯 [TRANSCRIBE] Request URL: http://scorecard-orchestrator/scorecard/${roomId}`);
			console.log(`🎯 [TRANSCRIBE] Request body preview:`, {
				learnerSegmentsCount: requestBody.learnerSegments.length,
				fullTranscriptLength: requestBody.fullTranscript.length,
				bellEventsCount: requestBody.bellEvents.length,
				session_id: requestBody.session_id,
				learner_id: requestBody.learner_id
			});

			const res = await orchestratorDO.fetch(`http://scorecard-orchestrator/scorecard/${roomId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			console.log(`🎯 [TRANSCRIBE] 📡 ScorecardOrchestratorDO response status: ${res.status}`);
			console.log(`🎯 [TRANSCRIBE] 📡 ScorecardOrchestratorDO response ok: ${res.ok}`);

			if (!res.ok) {
				console.error(`🎯 [TRANSCRIBE] ❌ CRITICAL: ScorecardOrchestratorDO returned ${res.status}: ${res.statusText}`);
				throw new Error(`ScorecardOrchestratorDO returned ${res.status}: ${res.statusText}`);
			}

			let responseData;
			try {
				responseData = await res.json() as any;
				console.log(`🎯 [TRANSCRIBE] ✅ Response JSON parsed successfully`);
				console.log(`🎯 [TRANSCRIBE] Response keys: ${Object.keys(responseData).join(', ')}`);
			} catch (error) {
				console.error(`🎯 [TRANSCRIBE] ❌ CRITICAL: Failed to parse response JSON:`, error);
				throw new Error(`Failed to parse scorecard response: ${error}`);
			}

			const { scorecard } = responseData;
			console.log(`🎯 [TRANSCRIBE] 📊 Scorecard analysis:`, {
				scorecardExists: !!scorecard,
				scorecardIsNull: scorecard === null,
				scorecardIsUndefined: scorecard === undefined,
				scorecardType: typeof scorecard,
				mistakesCount: scorecard?.mistakes?.length || 0,
				languageAccuracy: scorecard?.languageAccuracy || 0,
				conversationDifficulty: scorecard?.conversationDifficulty || 0
			});

			if (scorecard === null) {
				console.error(`🎯 [TRANSCRIBE] ❌ CRITICAL: Scorecard is NULL - this indicates pipeline failure!`);
			} else if (scorecard) {
				console.log(`🎯 [TRANSCRIBE] ✅ Scorecard generation completed successfully for session ${session_id}`);
				console.log(`🎯 [TRANSCRIBE] Scorecard summary: ${scorecard.mistakes?.length || 0} mistakes, ${scorecard.languageAccuracy || 0}% accuracy`);
			} else {
				console.error(`🎯 [TRANSCRIBE] ❌ CRITICAL: Scorecard is undefined - unexpected response format!`);
			}

			await this.broadcastToRoom(roomId, 'transcription-complete', { text: mergedText, scorecard });
		} catch (error) {
			console.error(`🎯 [TRANSCRIBE] ❌ CRITICAL ERROR: Scorecard generation failed for session ${session_id}:`, error);
			console.error(`🎯 [TRANSCRIBE] Error type: ${typeof error}, Error message: ${error?.message || 'Unknown'}`);
			console.error(`🎯 [TRANSCRIBE] This means learner progress data will be lost for this session!`);
			await this.broadcastToRoom(roomId, 'transcription-complete', { text: mergedText, scorecard: null });
		}
		} catch (error) {
			console.error(`🎯 [TRANSCRIBE] ❌ CRITICAL ERROR: Outer scorecard processing failed for session ${session_id}:`, error);
			await this.broadcastToRoom(roomId, 'transcription-complete', { text: mergedText, scorecard: null });
		}

		// Cleanup storage
		console.log(`🎯 [TRANSCRIBE] Cleaning up storage for room ${roomId}`);
		await this.cleanupAll(roomId);

		console.log(`🎯 [TRANSCRIBE] 🎉 transcribeAndDiarizeAll completed for room ${roomId}`);
	}

	private async broadcastToRoom(roomId: string, messageType: string, data: any) {
		console.log(`[LearnerAssessmentDO] Broadcasting ${messageType} to room ${roomId}`);

		try {
			const relayDO = this.env.MESSAGE_RELAY_DO.get(
				this.env.MESSAGE_RELAY_DO.idFromName(roomId)
			);

			console.log(`[LearnerAssessmentDO] Created MessageRelayDO instance for room ${roomId}`);

			const payload = { type: messageType, data };
			console.log(`[LearnerAssessmentDO] Sending payload: ${JSON.stringify(payload).substring(0, 200)}...`);

			const response = await relayDO.fetch(`http://message-relay/broadcast/${roomId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			console.log(`[LearnerAssessmentDO] Broadcast successful, status: ${response.status}`);

		} catch (err) {
			console.error(`[LearnerAssessmentDO] Broadcast failed:`, err);
		}
	}

	// 🔍 VERBATIM ANALYSIS: Generate markdown report comparing expected vs actual transcripts
	private async generateVerbatimAnalysisReport(roomId: string, sessionId: number | string): Promise<string> {
		console.log(`[VERBATIM-ANALYSIS] Generating report for ${this.verbatimCaptureData.length} captured transcripts`);
		
		const timestamp = new Date().toISOString();
		const learnerTranscripts = this.verbatimCaptureData.filter(item => item.role === 'learner');
		
		let markdown = `# Deepgram Verbatim Analysis Report\n\n`;
		markdown += `**Session:** ${sessionId}  \n`;
		markdown += `**Room:** ${roomId}  \n`;
		markdown += `**Generated:** ${timestamp}  \n`;
		markdown += `**Total Transcripts Captured:** ${this.verbatimCaptureData.length}  \n`;
		markdown += `**Learner Transcripts:** ${learnerTranscripts.length}  \n`;

		// Summary table
		markdown += `## Summary Statistics\n\n`;
		markdown += `| Metric | Count |\n`;
		markdown += `|--------|-------|\n`;
		markdown += `| Total Messages | ${this.verbatimCaptureData.length} |\n`;
		markdown += `| Interim Results | ${this.verbatimCaptureData.filter(t => t.messageType === 'interim').length} |\n`;
		markdown += `| Speech Final | ${this.verbatimCaptureData.filter(t => t.messageType === 'speech_final').length} |\n`;
		markdown += `| Is Final | ${this.verbatimCaptureData.filter(t => t.messageType === 'is_final').length} |\n`;
		markdown += `| Learner Messages | ${learnerTranscripts.length} |\n`;
		markdown += `| Teacher Messages | ${this.verbatimCaptureData.filter(t => t.role === 'teacher').length} |\n\n`;

		// Detailed transcript log
		markdown += `## Detailed Transcript Timeline\n\n`;
		markdown += `| Time | Type | Role | Confidence | Text |\n`;
		markdown += `|------|------|------|------------|------|\n`;
		
		for (const item of this.verbatimCaptureData) {
			const timeStr = new Date(item.timestamp).toISOString().substr(11, 12);
			const confidenceStr = (item.confidence * 100).toFixed(1) + '%';
			const textPreview = item.text.length > 50 ? item.text.substring(0, 47) + '...' : item.text;
			markdown += `| ${timeStr} | ${item.messageType} | ${item.role} | ${confidenceStr} | "${textPreview}" |\n`;
		}

		// Raw data section for analysis
		markdown += `\n## Raw Deepgram Responses\n\n`;
		markdown += `<details><summary>Click to expand raw JSON data</summary>\n\n`;
		markdown += `\`\`\`json\n`;
		markdown += JSON.stringify(this.verbatimCaptureData, null, 2);
		markdown += `\n\`\`\`\n\n`;
		markdown += `</details>\n\n`;

		// Transcript Quality Analysis (always runs when transcripts available)
		markdown += `## Transcript Quality Analysis\n\n`;
		
		if (learnerTranscripts.length > 0) {
			try {
				// Perform transcript quality analysis
				const transcriptsForAnalysis = learnerTranscripts.map(t => ({
					messageType: t.messageType,
					text: t.text,
					confidence: t.confidence,
					timestamp: t.timestamp
				}));
				
				const qualityAnalysis = VerbatimAnalyzer.analyzeTranscriptQuality(
					this.sessionId || 'unknown',
					transcriptsForAnalysis
				);
				
				markdown += `### Transcript Quality Assessment\n\n`;
				markdown += `**Quality Score:** ${qualityAnalysis.qualityScore}/100  \n`;
				markdown += `**Average Confidence:** ${(qualityAnalysis.confidenceAnalysis.averageConfidence * 100).toFixed(1)}%  \n`;
				markdown += `**Low Confidence Segments:** ${qualityAnalysis.confidenceAnalysis.lowConfidenceSegments}  \n`;
				markdown += `**Confidence Variability:** ${qualityAnalysis.confidenceAnalysis.confidenceVariability.toFixed(2)}  \n\n`;
				
				markdown += `#### Analysis Summary\n\n`;
				markdown += `${qualityAnalysis.summary}\n\n`;
				
				if (qualityAnalysis.detectedErrorPatterns.length > 0) {
					markdown += `#### Detected Error Patterns\n\n`;
					for (const pattern of qualityAnalysis.detectedErrorPatterns) {
						markdown += `- 🔍 ${pattern}\n`;
					}
					markdown += `\n`;
				}
				
				if (qualityAnalysis.autoCorrectionInstances.length > 0) {
					markdown += `#### Potential Auto-Corrections Detected\n\n`;
					markdown += `| Type | Description | Affected Text |\n`;
					markdown += `|------|-------------|---------------|\n`;
					for (const correction of qualityAnalysis.autoCorrectionInstances) {
						const textPreview = correction.actualPhrase.length > 40 ? 
							correction.actualPhrase.substring(0, 37) + '...' : correction.actualPhrase;
						markdown += `| ${correction.correctionType} | ${correction.description} | "${textPreview}" |\n`;
					}
					markdown += `\n`;
				}
				
				markdown += `#### Transcript Details\n\n`;
				markdown += `| Type | Confidence | Text |\n`;
				markdown += `|------|------------|------|\n`;
				for (const transcript of qualityAnalysis.transcriptData) {
					const confStr = (transcript.confidence * 100).toFixed(1) + '%';
					const textPreview = transcript.actualText.length > 60 ? 
						transcript.actualText.substring(0, 57) + '...' : transcript.actualText;
					markdown += `| ${transcript.messageType} | ${confStr} | "${textPreview}" |\n`;
				}
				markdown += `\n`;
				
			} catch (error) {
				markdown += `*Error performing transcript quality analysis: ${error}*\n\n`;
				console.error(`[VERBATIM-ANALYSIS] Transcript quality analysis error:`, error);
			}
		} else {
			markdown += `*No transcript data available for quality analysis.*\n\n`;
		}


		console.log(`[VERBATIM-ANALYSIS] Generated ${markdown.length} character report`);
		return markdown;
	}

	private async cleanupAll(roomId: string) {
		console.log(`🧹 [CLEANUP] Starting cleanup for room ${roomId}`);
		console.log(`🧹 [CLEANUP] Verbatim capture data count: ${this.verbatimCaptureData.length}`);
		
		// Generate and store verbatim analysis report before cleanup (only in verbatim QA mode)
		const deepgramQAStored = await this.state.storage.get('deepgramQA');
		const deepgramQA = deepgramQAStored === true || deepgramQAStored === 'true';
		console.log(`🧹 [CLEANUP] 🔍 Debug - deepgramQAStored: ${deepgramQAStored} (type: ${typeof deepgramQAStored}), deepgramQA: ${deepgramQA}, verbatimCaptureData.length: ${this.verbatimCaptureData.length}`);
		if (deepgramQA && this.verbatimCaptureData.length > 0) {
			console.log(`🧹 [CLEANUP] 📊 Generating verbatim analysis report with ${this.verbatimCaptureData.length} captured transcripts`);
			try {
				const sessionId = await this.state.storage.get<number>('sessionId') || 'unknown';
				console.log(`🧹 [CLEANUP] Session ID for report: ${sessionId}`);
				
				const report = await this.generateVerbatimAnalysisReport(roomId, sessionId);
				console.log(`🧹 [CLEANUP] ✅ Generated report with ${report.length} characters`);
				
				// Upload report to R2 bucket
				const reportFileName = `verbatim-analysis-${sessionId}-${Date.now()}.md`;
				console.log(`🧹 [CLEANUP] 🚀 Attempting R2 upload: ${reportFileName}`);
				try {
					await this.env.VERBATIM_REPORTS_BUCKET.put(reportFileName, report, {
						httpMetadata: {
							contentType: 'text/markdown',
						},
						customMetadata: {
							sessionId: String(sessionId),
							roomId: roomId,
							generatedAt: new Date().toISOString(),
							analysisMode: 'transcript-quality',
							transcriptCount: String(this.verbatimCaptureData.length)
						}
					});
					console.log(`🧹 [CLEANUP] ✅ SUCCESS: Report uploaded to R2: ${reportFileName}`);
				} catch (r2Error) {
					console.error(`🧹 [CLEANUP] ❌ FAILED: R2 upload error:`, r2Error);
					console.error(`🧹 [CLEANUP] R2 error type: ${typeof r2Error}, message: ${r2Error?.message || 'Unknown'}`);
					// Fallback: store to DO storage
					const reportKey = `verbatim-analysis:${sessionId}:${Date.now()}`;
					await this.state.storage.put(reportKey, report);
					console.log(`🧹 [CLEANUP] 💾 FALLBACK: Report stored to DO storage: ${reportKey}`);
				}
			} catch (error) {
				console.error(`🧹 [CLEANUP] ❌ CRITICAL: Failed to generate report:`, error);
				console.error(`🧹 [CLEANUP] Error type: ${typeof error}, message: ${error?.message || 'Unknown'}`);
			}
		} else {
			console.log(`🧹 [CLEANUP] ⚠️ No verbatim capture data to process - skipping report generation`);
		}

		// Clean up Durable Object storage for the room
		const keys = await this.state.storage.list({ prefix: `${roomId}/` });
		const deleteKeys = Array.from(keys.keys());
		if (deleteKeys.length > 0) {
			await this.state.storage.delete(deleteKeys);
		}
	}

}

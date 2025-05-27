// apps/learner-assessment-worker/src/LearnerAssessmentDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

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

type DGSocket = {
	ws: WebSocket;                  // open WS to Deepgram
	ready: Promise<void>;           // resolves when {"type":"listening"} arrives
	segments: TranscribedSegment[]; // all segs we’ve received so far
};

const DG_MODEL    = 'nova-2';
const DG_LANGUAGE = 'es-MX';

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
	/* ------------------------------------------------------------------ */

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
		this.state = state;

		// Optional build-id guard to handle DO resets after deployments
		if (env.__BUILD_ID) {
			this.initializeBuildGuard(env.__BUILD_ID);
		}
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

		const requestedRobo = q['roboMode'] === 'true';
		const sessionIdStr  = q['sessionId'];
		const learnerIdStr  = q['learnerId'];

		/* 2. store metadata or handle end-session ------------------------- */
		if (sessionIdStr && learnerIdStr && !(await this.state.storage.get('metaWritten'))) {
			await this.storeSessionMetadata(sessionIdStr, learnerIdStr);
			await this.state.storage.put('metaWritten', true);
		}

		if (action === 'end-session') {
			console.log('[LearnerAssessmentDO] end-session');
			try {
				// Send CloseStream message before closing Deepgram connection
				if (this.dgSocket?.ws.readyState === WebSocket.OPEN) {
					this.dgSocket.ws.send(JSON.stringify({ type: "CloseStream" }));
				}
				await this.transcribeAndDiarizeAll(roomId);
				this.dgSocket?.ws.close(1000);
				this.dgSocket = null;
				return c.json({ status: 'transcription completed' });
			} catch (err) {
				console.error('[LearnerAssessmentDO] end-session error:', err);
				return c.json({ status: 'completed with errors', error: String(err) }, 200);
			}
		}

		/* 3. decide session mode once ------------------------------------ */
		await this.initializeSessionMode(requestedRobo);

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

		// 🔄 modern stream-control knobs
		wsURL.searchParams.set('interim_results',  'true');
		wsURL.searchParams.set('endpointing', '500');     // o3's golden bundle - proven stable
		wsURL.searchParams.set('utterance_end_ms', '5000');
		wsURL.searchParams.set('vad_events',       'true');  // ← NEW (required)
		wsURL.searchParams.set('smart_format',     'true');  // clean formatting

		// Hey Charli keyword detection
		wsURL.searchParams.set('keywords', 'hey charli');
		wsURL.searchParams.set('keywords_priority', 'high');

		if (!this.connectBannerLogged) {
			console.log('[DG] connecting', wsURL.toString());
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
				resolve();
				return;
			}

			// Handle smart-listen events
			if (msg.type === 'speech_started') {
				console.log('[DG] speech started');
				return;
			}

			// Modern format: check for Results with speech_final: true
			if (msg.type === 'Results' && msg.speech_final === true) {
				const text = msg.channel?.alternatives?.[0]?.transcript;
				const speaker = String(msg.channel?.speaker ?? '0');
				const role = speaker === '0' ? 'learner' : 'teacher';
				const start = msg.start ?? 0;
				const duration = msg.duration ?? 0;

				if (text) {
					console.log(`[DG] final ${role} utterance (⏱ ${duration.toFixed(2)}s): "${text}"`);
					console.log(`[DG] speech_final=${msg.speech_final}, is_final=${msg.is_final}, duration=${duration}s`);

					const seg: TranscribedSegment = {
						peerId: speaker,
						role,
						start,
						text
					};
					this.dgSocket!.segments.push(seg);

					// For robo mode, trigger utterance processing for learner speech
					if (role === 'learner') {
						const sessionMode = await this.getSessionMode();
						console.log(`[DG] Learner speech detected in ${sessionMode} mode: "${text}"`);
						if (sessionMode === 'robo') {
							console.log(`[DG] Triggering flushUtterance for: "${text}"`);
							this.flushUtterance(roomId, text).catch(err =>
								console.error('[DG] robo utterance processing error:', err)
							);
						}

						// Hey Charli detection for all modes
						await this.handleCharliDetection(roomId, text);
					}
				}
				return;
			}

			// Legacy handling for non-smart-listen messages (backwards compatibility)
			const alt = msg.channel?.alternatives?.[0];
			if (!alt) return;

			/* sentence-level segment */
			if (alt.transcript) {
				const start   = alt.start ?? 0;
				const speaker = String(msg.channel.speaker ?? '0');
				const seg: TranscribedSegment = {
					peerId: speaker,
					role  : speaker === '0' ? 'learner' : 'teacher',
					start,
					text  : alt.transcript
				};
				this.dgSocket!.segments.push(seg);
			}

			/* word-level detail */
			if (alt.words?.length) {
				const speaker = String(msg.channel.speaker ?? '0');
				const role    = speaker === '0' ? 'learner' : 'teacher';
				for (const w of alt.words) {
					this.words.push({
						peerId: speaker,
						role,
						word : w.word,
						start: w.start,
						end  : w.end,
						conf : w.confidence
					});
				}
			}
		});


		this.dgSocket = { ws: dgWS, ready, segments: [] };
		try {
			await ready;
			return this.dgSocket;
		} catch (err) {
			// Zero out dgSocket on connection failure so next chunk triggers fresh connect
			this.dgSocket = null;
			throw err;
		}
	}

	/* ───────────────────────── Durable-object fetch ───────────────────── */
	async fetch(request: Request) { return this.app.fetch(request); }

	/* ─────────────────────── Build guard helper ──────────────────────── */
	private async initializeBuildGuard(buildId: string) {
		const storedBuildId = await this.state.storage.get<string>('build');
		if (buildId !== storedBuildId) {
			console.log(`[LearnerAssessmentDO] Build ID changed from ${storedBuildId} to ${buildId}, clearing storage`);
			await this.state.storage.deleteAll();
			await this.state.storage.put('build', buildId);
		}
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
				const { answer } = await response.json();

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

			/* generate utterance ID and call robo-test-mode Worker */
			this.utteranceCounter = (this.utteranceCounter ?? 0) + 1;
			const utteranceId = this.utteranceCounter;

			const res = await fetch(this.env.ROBO_TEST_URL, {
				method : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body   : JSON.stringify({ userText: learnerText, roomId, utteranceId })
			});
			if (!res.ok) {
				console.error(`[LearnerAssessmentDO] Robo service HTTP error: ${res.status}`);
				return;
			}

			const response = await res.json<{ status: string; utteranceId: number }>();
			console.log(`[LearnerAssessmentDO] Robo service queued response for utteranceId: ${response.utteranceId}`);

			// Set cooldown to prevent overlapping replies
			this.replyCooldownUntil = Date.now() + LearnerAssessmentDO.REPLY_COOLDOWN_MS;
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
	private async transcribeAndDiarizeAll(roomId: string) {
		console.log(`[LearnerAssessmentDO] Starting transcribeAndDiarizeAll for room ${roomId}`);

		// Use the segments collected from Deepgram smart-listen streaming
		const allSegments = this.dgSocket?.segments || [];
		console.log(`[LearnerAssessmentDO] Found ${allSegments.length} Deepgram segments`);

		if (allSegments.length === 0) {
			console.log('[LearnerAssessmentDO] No segments found for transcription');
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

		// Only send the (start, text) fields to ScorecardOrchestratorDO
		const simplifiedLearnerSegments = learnerSegments.map(seg => ({
			start: seg.start,
			text: seg.text,
		}));

		const session_id = await this.state.storage.get<number>('sessionId');
		const learner_id = await this.state.storage.get<number>('learnerId');
		if (!session_id || !learner_id) {
			console.warn('[LearnerAssessmentDO] Missing sessionId or learnerId in storage, skipping scorecard');
			await this.broadcastToRoom(roomId, 'transcription-complete', { text: mergedText, scorecard: null });
			return;
		}

		const bellEvents = await this.state.storage.get<{peerId:string,ts:number}[]>(`bells:${roomId}`) ?? [];

		try {
			const orchestratorDO = this.env.SCORECARD_ORCHESTRATOR_DO.get(this.env.SCORECARD_ORCHESTRATOR_DO.idFromName(roomId));
			const res = await orchestratorDO.fetch(`http://scorecard-orchestrator/scorecard/${roomId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					learnerSegments: simplifiedLearnerSegments,
					fullTranscript,
					bellEvents,
					session_id,
					learner_id
				})
			});

			const { scorecard } = await res.json() as any;
			await this.broadcastToRoom(roomId, 'transcription-complete', { text: mergedText, scorecard });
		} catch (error) {
			console.error('[LearnerAssessmentDO] Scorecard generation failed:', error);
			await this.broadcastToRoom(roomId, 'transcription-complete', { text: mergedText, scorecard: null });
		}

		// Cleanup storage
		console.log(`[LearnerAssessmentDO] Cleaning up storage for room ${roomId}`);
		await this.cleanupAll(roomId);

		console.log(`[LearnerAssessmentDO] transcribeAndDiarizeAll completed for room ${roomId}`);
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

	private async cleanupAll(roomId: string) {
		// Clean up Durable Object storage for the room
		const keys = await this.state.storage.list({ prefix: `${roomId}/` });
		const deleteKeys = Array.from(keys.keys());
		if (deleteKeys.length > 0) {
			await this.state.storage.delete(deleteKeys);
		}
	}

}

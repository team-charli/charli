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

type DGSocket = {
  ws: WebSocket;                  // open WS to Deepgram
  ready: Promise<void>;           // resolves when {"type":"listening"} arrives
  segments: TranscribedSegment[]; // all segs we’ve received so far
};

const DG_MODEL    = 'nova-2';
const DG_LANGUAGE = 'es-MX';
const DEBOUNCE_MS = 800;          // silence duration before robo reply
const NOISE_FLOOR = 80;           // baseline noise level
const SILENCE_RMS = 250;          // a touch more sensitive
const MAX_UTTERANCE_MS = 8000;    // give the learner a full 8 s if needed

/** RMS helper for 16-bit little-endian PCM amplitude detection */
function rms(pcm: Uint8Array): number {
  const dv = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let sumSq = 0;
  for (let i = 0; i < dv.byteLength; i += 2) {
    const v = dv.getInt16(i, true);
    sumSq += v * v;
  }
  return Math.sqrt(sumSq / (dv.byteLength / 2));
}

export class LearnerAssessmentDO extends DurableObject<Env> {
  /* ------------------------------------------------------------------ */
  private app   = new Hono();
  protected state: DurableObjectState;
  private words: WordInfo[] = [];

  /* runtime */
  private learnerDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxUtteranceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUtteranceChunks: Uint8Array[] = [];
  private dgSocket: DGSocket | null = null;
  private reconnectAt: number = 0;
  private heardSpeech: boolean = false;  // new flag per utterance
  private replyCooldownUntil = 0;     // epoch ms
  private static readonly REPLY_COOLDOWN_MS = 3_000;
  private flushInFlight = false;      // single-flight lock
  private lastLearnerText = '';       // dedupe identical transcripts
  private utteranceCounter = 0;       // monotonic utterance ID
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
    if (sessionIdStr && learnerIdStr)
      await this.storeSessionMetadata(sessionIdStr, learnerIdStr);

    if (action === 'end-session') {
      console.log('[LearnerAssessmentDO] end-session');
      try {
        await this.transcribeAndDiarizeAll(roomId);
        this.dgSocket?.ws.close();
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
    if (chunk.length > 131_072) { console.error('[LearnerAssessmentDO] chunk too large'); return c.text('Chunk too large', 400); }

    /* 5. send to Deepgram & persist ---------------------------------- */
    const sessionMode = await this.getSessionMode();
    console.log(`[LearnerAssessmentDO] Storing metadata: sessionId=${sessionIdStr}, learnerId=${learnerIdStr}`);
    console.log(`[LearnerAssessmentDO] mode ${sessionMode}`);

    // Send to Deepgram in BOTH modes (normal and robo)
    try {
      const dg = await this.getOrInitDG(roomId);
      dg.ws.send(chunk); // raw PCM for linear16 encoding
    } catch (err) {
      console.error(`[LearnerAssessmentDO] Deepgram error: ${err}`);
      // Set back-off on connection failure
      this.reconnectAt = Date.now() + 5000;
      // Continue processing - robo mode will get empty transcript
    }

    await this.savePcmChunk(roomId, peerId, role, chunk);
    if (sessionMode === 'robo') {
      console.log(`[LearnerAssessmentDO] Adding chunk to utterance collection, size=${chunk.length}, current chunks=${this.currentUtteranceChunks.length}`);
      await this.generateAndSaveRoboChunk(roomId, peerId, chunk);
    }

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
    wsURL.searchParams.set('model',        'nova-2');
    wsURL.searchParams.set('language',     'es-MX');
    wsURL.searchParams.set('sample_rate',  '48000');
    wsURL.searchParams.set('encoding',     'linear16');
    wsURL.searchParams.set('diarize',      'true');
    console.log('[DG] connecting', wsURL.toString());        // keep this

    const dgWS = new WebSocket(wsURL.toString(),
                               ['token', this.env.DEEPGRAM_API_KEY]);

    let resolve!: () => void, reject!: (e:any) => void;
    const ready = new Promise<void>((r, j) => { resolve = r; reject = j; });

    dgWS.addEventListener('open',  () => console.log('[DG] open'));
    dgWS.addEventListener('error', e  => {
      console.log('[DG] error event:', e);
      console.log('[DG] error message:', e.message || 'no message');
      console.log('[DG] error type:', e.type || 'no type');
    });
    dgWS.addEventListener('close', e  => {
      console.log('[DG] close code:', e.code, 'reason:', e.reason || 'no reason');
      console.log('[DG] close message:', e.message || 'no message');
      if (e.code !== 1000) {
        // Abnormal close - set 2 second back-off
        this.reconnectAt = Date.now() + 2000;
        console.log(`[DG] Setting reconnect back-off until ${new Date(this.reconnectAt)}`);
        reject(new Error(`WS closed code=${e.code}`));
      }
    });
    dgWS.addEventListener('message', evt => {
      const msg = JSON.parse(evt.data as string);

      if (msg.type === 'Error' || msg.error) {
        console.log('[DG] WS error payload:', JSON.stringify(msg));
        reject(new Error(msg.error || msg));
        return;
      }

      if (msg.type === 'listening') {
        console.log('[DG] listening');
        resolve();
        return;
      }

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

        // optional live captioning
        this.broadcastToRoom(roomId, 'partial', seg).catch(() => {});
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

    dgWS.addEventListener('close', () => { this.dgSocket = null; });

    this.dgSocket = { ws: dgWS, ready, segments: [] };
    await ready;
    return this.dgSocket;
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
  }
  private async storeSessionMetadata(sessionId: number | string, learnerId: number | string) {
    const sessionIdNum = typeof sessionId === 'string' ? parseInt(sessionId.replace('robo-', '')) : sessionId;
    const learnerIdNum = typeof learnerId === 'string' ? parseInt(learnerId) : learnerId;
    await this.state.storage.put('sessionId', sessionIdNum);
    await this.state.storage.put('learnerId', learnerIdNum);
  }

  /* ───────────────── learner → robo round-trip (debounce) ───────────── */
  private async generateAndSaveRoboChunk(
    roomId: string,
    learnerPeerId: string,
    learnerChunk: Uint8Array
  ) {
    /* 0. collect chunks and detect speech/silence */
    this.currentUtteranceChunks.push(learnerChunk);

    const isSpeech = rms(learnerChunk) > SILENCE_RMS;
    console.log(`[LearnerAssessmentDO] Chunk RMS: ${rms(learnerChunk)}, isSpeech: ${isSpeech}`);
    console.log(`[LearnerAssessmentDO] Adding chunk to utterance collection, size=${learnerChunk.length}, current chunks=${this.currentUtteranceChunks.length}`);

    if (isSpeech) {
      this.heardSpeech = true;                 // new flag per utterance
      // reset the "pause" timer only when we actually detected speech
      if (this.learnerDebounceTimer) {
        console.log('[LearnerAssessmentDO] Clearing existing debounce timer');
        clearTimeout(this.learnerDebounceTimer);
      }
      console.log(`[LearnerAssessmentDO] Setting new debounce timer (${DEBOUNCE_MS}ms)`);
      this.learnerDebounceTimer = setTimeout(() => this.flushUtterance(roomId), DEBOUNCE_MS);

      // Start max utterance timer if not already running
      if (!this.maxUtteranceTimer) {
        console.log(`[LearnerAssessmentDO] Starting max utterance timer (${MAX_UTTERANCE_MS}ms)`);
        this.maxUtteranceTimer = setTimeout(() => this.flushUtterance(roomId), MAX_UTTERANCE_MS);
      }
    } else if (!this.heardSpeech) {
      // ignore leading background noise; do NOT start debounce yet
      return;
    }
  }

  private async flushUtterance(roomId: string) {
    if (this.flushInFlight) return;
    this.flushInFlight = true;

    try {
      console.log(`[LearnerAssessmentDO] flushUtterance fired at ${new Date().toISOString()}`);
      console.log(`[LearnerAssessmentDO] Debounce timer fired, chunks=${this.currentUtteranceChunks.length}`);

      // Cancel any pending timers immediately
    if (this.learnerDebounceTimer) { clearTimeout(this.learnerDebounceTimer); this.learnerDebounceTimer = null; }
    if (this.maxUtteranceTimer)    { clearTimeout(this.maxUtteranceTimer);    this.maxUtteranceTimer = null; }

    // Avoid overlapping answers
    if (Date.now() < this.replyCooldownUntil) {
      console.log('[Robo] skipping — cooldown still active');
      this.resetUtteranceState();
      return;
    }

    if (this.currentUtteranceChunks.length === 0) return;

    try {
      /* 1. pcm → text (Deepgram stream + REST fallback) */
      // Allow up to ~10 s of audio (<1 MB) so short phrases aren't clipped
      const maxUtteranceSize = 1_000_000;
      const limitedChunks = this.currentUtteranceChunks.reduce((acc, chunk) => {
        if (acc.totalSize + chunk.length <= maxUtteranceSize) {
          acc.chunks.push(chunk);
          acc.totalSize += chunk.length;
        }
        return acc;
      }, { chunks: [] as Uint8Array[], totalSize: 0 });

      const utterance = this.concatChunks(limitedChunks.chunks);
      let learnerText = await this.transcribeLearnerUtterance(utterance);

      // Fallback to Deepgram REST API if streaming failed
      if ((!learnerText || !learnerText.trim()) && this.env.DEEPGRAM_API_KEY) {
        console.log('[LearnerAssessmentDO] Trying Deepgram REST fallback');
        const wav = LearnerAssessmentDO.wavlify(utterance);
        learnerText = await this.oneShotTranscript(wav);
      }

      console.log(`[LearnerAssessmentDO] Transcribed text: "${learnerText}"`);

      if (!learnerText.trim()) {
        console.log('[ASR] ignoring empty transcript');
        return;                           // 🚫 do NOT call robo-reply pipeline
      }

      // Skip if identical to last transcript
      if (learnerText === this.lastLearnerText) {
        console.log('[ASR] ignoring duplicate transcript');
        return;
      }
      this.lastLearnerText = learnerText;

      console.log(`[LearnerAssessmentDO] Fetching robo reply for text: "${learnerText}"`);

      /* 2. generate utterance ID and call robo-test-mode Worker */
      this.utteranceCounter = (this.utteranceCounter ?? 0) + 1;
      const utteranceId = this.utteranceCounter;

      const res = await this.env.ROBO_TEST_DO.fetch(
        'http://robo-test-mode/robo-teacher-reply',
        {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ userText: learnerText, roomId, utteranceId })
        }
      );
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
    }
    } finally {
      this.flushInFlight = false;
      console.log('[LearnerAssessmentDO] Clearing utterance chunks and timers');
      this.resetUtteranceState();
    }
  }

  private resetUtteranceState() {
    this.currentUtteranceChunks = [];
    this.learnerDebounceTimer = null;
    this.heardSpeech = false;
    if (this.maxUtteranceTimer) {
      clearTimeout(this.maxUtteranceTimer);
      this.maxUtteranceTimer = null;
    }
  }

  /* ────────────────────── PCM chunk persistence helpers ─────────────── */
  private async savePcmChunk(
    roomId: string, peerId: string, role: string, chunk: Uint8Array
  ) {
    const counterKey = `chunkCounter:${peerId}`;
    const idx = (await this.state.storage.get<number>(counterKey)) ?? 0;

    const pcmKey = `${roomId}/${peerId}/pcm/${idx}.pcm`;
    await this.env.AUDIO_BUCKET.put(pcmKey, chunk.buffer);

    const now = Date.now();
    await this.state.storage.put(`${pcmKey}:timestamp`, now);
    await this.state.storage.put(`${pcmKey}:role`, role);
    await this.state.storage.put(`${pcmKey}:peerId`, peerId);
    await this.state.storage.put(counterKey, idx + 1);
  }

  /* ───────────────────── utility: concat Uint8Array[] ───────────────── */
  private concatChunks(chunks: Uint8Array[]) {
    const len = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(len);
    let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  }

  /* ───────── learner-utterance ASR (Deepgram words only) ──────── */
  private async transcribeLearnerUtterance(_: Uint8Array): Promise<string> {
    // ‼️ DO NOT synthesize words. Simply return whatever Deepgram gave us.
    const words = this.words.filter(w => w.role === 'learner').slice(-50);
    await new Promise(r => setTimeout(r, 50)); // tiny debounce to batch DG msgs
    return words.map(w => w.word).join(' ');
  }

  /* ───────── Deepgram REST API fallback ──────── */
  private async oneShotTranscript(wavBuffer: Uint8Array): Promise<string> {
    try {
      console.log('[LearnerAssessmentDO] Calling Deepgram REST API with WAV buffer length:', wavBuffer.length);

      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=es-MX&diarize=true', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.env.DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/wav'
        },
        body: wavBuffer  // includes 44-byte RIFF header
      });

      if (!response.ok) {
        console.error('[LearnerAssessmentDO] Deepgram REST API error:', response.status, response.statusText);
        return '';
      }

      const result = await response.json() as any;
      console.log('[LearnerAssessmentDO] Deepgram REST response:', JSON.stringify(result, null, 2));

      // Extract transcript from response
      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      const metadata = result.metadata || {};

      if (transcript === '') {
        console.log(`[DG-REST] EMPTY transcript, duration=${metadata.duration}s, sha=${metadata.sha256}`);
        return '';
      }

      console.log('[LearnerAssessmentDO] REST transcript:', transcript);
      return transcript;
    } catch (err) {
      console.error('[LearnerAssessmentDO] Deepgram REST API error:', err);
      return '';
    }
  }

  /* ────────────── batch diarisation & scorecard ─────────── */
  private async transcribeAndDiarizeAll(roomId: string) {
    console.log(`[LearnerAssessmentDO] Starting transcribeAndDiarizeAll for room ${roomId}`);

    // Get all peer IDs from stored metadata
    const peerKeys = await this.state.storage.list({ prefix: `${roomId}/` });
    const peerIds = Array.from(new Set(
      Array.from(peerKeys.keys())
        .map(k => k.toString().split('/')[1])
        .filter(Boolean)
    ));

    console.log(`[LearnerAssessmentDO] Found ${peerIds.length} peers: ${peerIds.join(', ')}`);

    if (peerIds.length === 0) {
      console.log('[LearnerAssessmentDO] No peers found for transcription');
      await this.broadcastToRoom(roomId, 'transcription-complete', { text: '', scorecard: null });
      return;
    }

    // For now, just use the collected words from Deepgram
    const transcript = this.words.map(w => w.word).join(' ');
    console.log(`[LearnerAssessmentDO] Merged transcript: ${transcript}`);

    if (!transcript.trim()) {
      console.log('[LearnerAssessmentDO] Skipping scorecard generation due to missing data');
      await this.broadcastToRoom(roomId, 'transcription-complete', { text: '', scorecard: null });
      return;
    }

    // Generate scorecard would go here - for now, just broadcast completion
    await this.broadcastToRoom(roomId, 'transcription-complete', { text: transcript, scorecard: null });

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
    // Clean up storage for the room
    const keys = await this.state.storage.list({ prefix: `${roomId}/` });
    const deleteKeys = Array.from(keys.keys());
    if (deleteKeys.length > 0) {
      await this.state.storage.delete(deleteKeys);
    }
  }

  /* ───────────── WAV header helper (little-endian RIFF) ─────────────── */
  private static wavlify(pcm: Uint8Array, sampleRate = 48_000, channels = 1) {
    const hdr = new Uint8Array(44);
    const dv  = new DataView(hdr.buffer);

    hdr.set([82,73,70,70]);                       // "RIFF"
    dv.setUint32(4, 36 + pcm.length, true);
    hdr.set([87,65,86,69], 8);                    // "WAVE"
    hdr.set([102,109,116,32], 12);                // "fmt "
    dv.setUint32(16, 16, true);                   // PCM
    dv.setUint16(20, 1, true);
    dv.setUint16(22, channels, true);
    dv.setUint32(24, sampleRate, true);
    dv.setUint32(28, sampleRate * channels * 2, true);
    dv.setUint16(32, channels * 2, true);
    dv.setUint16(34, 16, true);
    hdr.set([100,97,116,97], 36);                 // "data"
    dv.setUint32(40, pcm.length, true);

    return new Uint8Array([...hdr, ...pcm]);
  }
}

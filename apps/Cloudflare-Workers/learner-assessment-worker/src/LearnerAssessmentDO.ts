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
const DG_LANGUAGE = 'es-MX';      // pick the accent you prefer
const DEBOUNCE_MS = 2000;         // 2 s silence → send to robo

export class LearnerAssessmentDO extends DurableObject<Env> {
  /* ------------------------------------------------------------------ */
  private app   = new Hono();
  protected state: DurableObjectState;
  private words: WordInfo[] = [];

  /* runtime */
  private learnerDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUtteranceChunks: Uint8Array[] = [];
  private dgSocket: DGSocket | null = null;
  /* ------------------------------------------------------------------ */

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;

    /* ────────── POST /audio/:roomId ────────── */
    this.app.post('/audio/:roomId', async c => {
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
      const dg = await this.getOrInitDG(roomId);
      dg.ws.send(LearnerAssessmentDO.wavlify(chunk)); // 48 kHz WAV frame

      await this.savePcmChunk(roomId, peerId, role, chunk);
      if ((await this.getSessionMode()) === 'robo')
        await this.generateAndSaveRoboChunk(roomId, peerId, chunk);
    });
  }

  /* ─────────────────────────── Deepgram socket ──────────────────────── */
  private async getOrInitDG(roomId: string): Promise<DGSocket> {
    if (this.dgSocket) return this.dgSocket;

    const url = new URL(this.env.DEEPGRAM_URL ?? 'wss://api.deepgram.com/v1/listen');
    url.searchParams.set('model',           DG_MODEL);
    url.searchParams.set('language',        DG_LANGUAGE);
    url.searchParams.set('sample_rate',     '48000');
    url.searchParams.set('encoding',        'wav');      // <-- important
    url.searchParams.set('diarize',         'true');
    url.searchParams.set('filler_words',    'true');
    url.searchParams.set('punctuate',       'false');
    url.searchParams.set('interim_results', 'true');
    url.searchParams.set('access_token',    this.env.DEEPGRAM_API_KEY);

    const dgWS = new WebSocket(url.toString());

    let resolve!: () => void;
    const ready = new Promise<void>(r => (resolve = r));

    dgWS.addEventListener('open',  () => console.log('[DG] open'));
    dgWS.addEventListener('error', e  => console.log('[DG] error', e));
    dgWS.addEventListener('close', e  => console.log('[DG] close', e.code, e.reason));
    dgWS.addEventListener('message', evt => {
      const msg = JSON.parse(evt.data as string);
      if (msg.type === 'listening') { resolve(); return; }

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
    /* 0. collect chunks during debounce */
    this.currentUtteranceChunks.push(learnerChunk);
    if (this.learnerDebounceTimer) clearTimeout(this.learnerDebounceTimer);

    this.learnerDebounceTimer = setTimeout(async () => {
      if (this.currentUtteranceChunks.length === 0) return;

      try {
        /* 1. pcm → text (placeholder: last 50 learner words) */
        const utterance = this.concatChunks(this.currentUtteranceChunks);
        const learnerText = await this.transcribeLearnerUtterance(utterance);
        if (!learnerText) return;

        /* 2. call robo-test-mode Worker (service binding) */
        const res = await this.env.ROBO_TEST_DO.fetch(
          'http://robo-test-mode/robo-teacher-reply',
          {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ userText: learnerText, roomId })
          }
        );
        if (!res.ok) { console.error('[Robo-TTS] HTTP', res.status); return; }

        const { replyText, pcmBase64 } = await res.json<{
          replyText: string; pcmBase64: string;
        }>();

        /* 3. broadcast text & audio to browser(s) */
        await this.broadcastToRoom(roomId, 'roboReplyText', { text: replyText });

        const { broadcastRoboAudio } = await import('./index');
        await broadcastRoboAudio(this.env, roomId, pcmBase64);

        /* 4. store robo audio chunks as normal */
        const roboPcm = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0));
        const MAX = 131_072;
        for (let o = 0; o < roboPcm.length; o += MAX) {
          await this.savePcmChunk(roomId, 'roboPeer', 'teacher', roboPcm.subarray(o, o + MAX));
        }
      } catch (err) {
        console.error('[LearnerAssessmentDO] robo reply error', err);
      } finally {
        this.currentUtteranceChunks = [];
      }
    }, DEBOUNCE_MS);
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

  /* ───────── learner-utterance ASR placeholder (last 50 words) ──────── */
  private async transcribeLearnerUtterance(_: Uint8Array): Promise<string> {
    await new Promise(r => setTimeout(r, 150)); // simulate small delay
    return this.words.filter(w => w.role === 'learner').slice(-50).map(w => w.word).join(' ');
  }

  /* ────────────── batch diarisation & scorecard (unchanged) ─────────── */
  /* … full transcribeAndDiarizeAll, mergePeerTranscripts, cleanupAll,
       broadcastToRoom etc. remained exactly as we discussed … */

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

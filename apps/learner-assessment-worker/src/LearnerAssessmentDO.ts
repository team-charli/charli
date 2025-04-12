// apps/learner-assessment-worker/src/LearnerAssessmentDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

interface TranscribedSegment {
  peerId: string;
  role: string;
  text: string;
  // start time in seconds offset from the first chunk's serverTime
  // If you want sub-second alignment, we store chunk timestamps in DO
  start: number;
}

export class LearnerAssessmentDO extends DurableObject<Env> {
  private app = new Hono();
  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;

    this.app.post('/audio/:roomId', async (c) => {
      const roomId = c.req.param('roomId');
      const action = c.req.query('action');
      if (action === 'end-session') {
        // Finalize: transcribe all peer audio -> broadcast -> cleanup
        console.log('[LearnerAssessmentDO] End-session triggered');
        await this.transcribeAndDiarizeAll(roomId);
        return c.json({ status: 'transcription completed' });
      }

      // 1) Parse query for role/peerId
      const role = c.req.query('role') ?? 'unknown';
      const peerId = c.req.query('peerId') ?? 'unknown';

      // 2) Read raw PCM from body
      const chunk = new Uint8Array(await c.req.arrayBuffer());
      if (chunk.length === 0) {
        return c.text('No audio data', 400);
      }
      console.log(`[LearnerAssessmentDO] Received PCM chunk from peerId=${peerId}, role=${role}, size=${chunk.length}`);

      // 3) Basic size check
      if (chunk.length > 131072) {
        console.error(`[LearnerAssessmentDO] Chunk size ${chunk.length} > 131072`);
        return c.text('Chunk too large', 400);
      }

      // 4) Acquire a chunkCounter for this peer
      const peerChunkCounterKey = `chunkCounter:${peerId}`;
      let chunkCounter = (await this.state.storage.get<number>(peerChunkCounterKey)) || 0;

      // 5) Build a PCM key in R2
      const pcmKey = `${roomId}/${peerId}/pcm/${chunkCounter}.pcm`;

      // 6) Put raw PCM in R2
      await this.env.AUDIO_BUCKET.put(pcmKey, chunk.buffer);

      // 7) Also store metadata in DO
      const serverTimestamp = Date.now();
      await this.state.storage.put(`${pcmKey}:timestamp`, serverTimestamp);
      await this.state.storage.put(`${pcmKey}:role`, role);
      await this.state.storage.put(`${pcmKey}:peerId`, peerId);

      // 8) Bump chunkCounter
      chunkCounter++;
      await this.state.storage.put(peerChunkCounterKey, chunkCounter);

      // 9) Possibly do partial batch -> WAV if chunkCounter hits a multiple
      const batchSize = 87;
      // e.g., if we just stored chunk # (chunkCounter - 1)
      const justStoredIndex = chunkCounter - 1;
      if (justStoredIndex % batchSize === batchSize - 1 || justStoredIndex === 0) {
        // Generate partial WAV from [startChunk..endChunk]
        const startChunk = Math.floor(justStoredIndex / batchSize) * batchSize;
        const endChunk = justStoredIndex;
        try {
          const wavKey = await this.convertPcmBatchToWav(roomId, peerId, startChunk, endChunk);
          console.log(`[LearnerAssessmentDO] Generated partial WAV: ${wavKey}`);

          // Store the partial wavKey in an array for this peer
          const wavKeysKey = `wavKeys:${peerId}`;
          const existingWavKeys = (await this.state.storage.get<string[]>(wavKeysKey)) || [];
          existingWavKeys.push(wavKey);
          await this.state.storage.put(wavKeysKey, existingWavKeys);
        } catch (err) {
          console.error(`[LearnerAssessmentDO] Partial conversion failed for peerId=${peerId}, ${startChunk}-${endChunk}`, err);
        }
      }

      return c.text('chunk received', 200);
    });
  }

  /**
   * The Worker fetch
   */
  async fetch(request: Request) {
    return this.app.fetch(request);
  }

  /**
   * Called on "end-session": For each peer, finish any leftover PCM -> WAV,
   * then transcribe, then merge all peers' transcripts by real timeline.
   */
  private async transcribeAndDiarizeAll(roomId: string) {
    // 1) Identify all peerIds
    // We'll search storage for all keys that start with "chunkCounter:"
    const counters = await this.state.storage.list<number>({ prefix: 'chunkCounter:' });
    const peerIds = Array.from(counters.keys()).map(k => k.replace('chunkCounter:', ''));
    if (peerIds.length === 0) {
      console.log('[LearnerAssessmentDO] No peers found, nothing to transcribe');
      await this.broadcastToRoom(roomId, 'transcription-complete', { text: '' });
      return;
    }

    // 2) For each peer, do final WAV conversion for any leftover chunk batch
    const allPeerTranscripts: TranscribedSegment[] = [];
    for (const peerId of peerIds) {
      const chunkCounter = counters.get(`chunkCounter:${peerId}`) ?? 0;
      if (chunkCounter === 0) {
        console.log(`[LearnerAssessmentDO] Peer ${peerId} had zero chunks, skipping`);
        continue;
      }
      // We already did partial WAVs in increments. Now let's see if there's a partial leftover.
      // Example logic: if chunkCounter-1 is not exactly on a batch boundary
      const lastFullBatchEnd = Math.floor((chunkCounter - 1) / 87) * 87 - 1; // or chunk-based logic
      if (chunkCounter - 1 > lastFullBatchEnd) {
        const startChunk = lastFullBatchEnd + 1;
        const endChunk = chunkCounter - 1;
        try {
          const finalWavKey = await this.convertPcmBatchToWav(roomId, peerId, startChunk, endChunk);
          console.log(`[LearnerAssessmentDO] Final leftover WAV for peerId=${peerId}: ${finalWavKey}`);

          // store with the existing wavKeys for that peer
          const wavKeysKey = `wavKeys:${peerId}`;
          const existingWavKeys = (await this.state.storage.get<string[]>(wavKeysKey)) || [];
          existingWavKeys.push(finalWavKey);
          await this.state.storage.put(wavKeysKey, existingWavKeys);
        } catch (err) {
          console.error(`[LearnerAssessmentDO] Final leftover batch conversion failed for peer ${peerId}`, err);
        }
      }

      // 3) Now transcribe all partial WAVs for this peer into segments
      const peerSegments = await this.transcribePeerWavs(roomId, peerId);
      allPeerTranscripts.push(...peerSegments);
    }

    // 4) Merge transcripts from all peers by their real timeline
    const mergedText = await this.mergePeerTranscripts(allPeerTranscripts);

    // 5) Broadcast final text
    console.log('[LearnerAssessmentDO] Merged transcript:\n', mergedText);
    await this.broadcastToRoom(roomId, 'transcription-complete', { text: mergedText });

    // 6) Cleanup ephemeral data
    await this.cleanupAll(roomId, peerIds);
  }

  /**
   * Convert a contiguous batch [startChunk..endChunk] for peerId into a single WAV.
   */
  private async convertPcmBatchToWav(roomId: string, peerId: string, startChunk: number, endChunk: number) {
    const body = JSON.stringify({ roomId, startChunk, endChunk });
    const response = await this.env.PCM_TO_WAV_WORKER.fetch(`http://pcm-to-wav-worker/convert/${roomId}`, {
      method: 'POST',
      body
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`PCM->WAV conversion error: ${errText}`);
    }
    return await response.text(); // e.g. the wavKey
  }

  /**
   * Transcribe all partial WAVs for a given peer. Return an array of segments like:
   * { peerId, role, start, text }.
   * We will do "simple" start time offset = 0 for each partial. Or you can refine it
   * by referencing chunk-level timestamps if you want sub-second merges.
   */
  private async transcribePeerWavs(roomId: string, peerId: string): Promise<TranscribedSegment[]> {
    // 1) Gather all partial WAV keys for this peer
    const wavKeysKey = `wavKeys:${peerId}`;
    const wavKeys = (await this.state.storage.get<string[]>(wavKeysKey)) || [];
    if (wavKeys.length === 0) {
      console.log(`[transcribePeerWavs] No wavKeys for peerId=${peerId}`);
      return [];
    }

    // 2) For the role, just read from the first chunk’s metadata
    //    If the user changed roles mid-session, you might do something more advanced,
    //    but typically “teacher” or “learner” stays consistent.
    const role = await this.getPeerRole(roomId, peerId);

    // 3) For each WAV, we call your transcription service (like huggingface or AWS)
    const segments: TranscribedSegment[] = [];
    for (const wavKey of wavKeys) {
      const asrSegments = await this.runAsrOnWav(roomId, wavKey, peerId, role);
      segments.push(...asrSegments);
    }
    return segments;
  }

  /**
   * Helper to find the "role" from the 0th chunk if you want a single role per peer.
   */
  private async getPeerRole(roomId: string, peerId: string): Promise<string> {
    const firstChunkKey = `${roomId}/${peerId}/pcm/0.pcm:role`;
    const role = (await this.state.storage.get<string>(firstChunkKey)) || "unknown";
    return role;
  }

  /**
   * Actually call your external ASR on the given WAV, parse the JSON, produce a list of segments.
   * If your ASR only returns a single `text`, you can create one segment. If it returns
   * an array of {start, end, text}, we can map them. This is just an example.
   */
  private async runAsrOnWav(roomId: string, wavKey: string, peerId: string, role: string): Promise<TranscribedSegment[]> {
    // 1) Retrieve WAV from R2
    const wavObject = await this.env.AUDIO_BUCKET.get(wavKey);
    if (!wavObject) throw new Error(`WAV not found: ${wavKey}`);
    const wavData = await wavObject.arrayBuffer();

    // 2) Call your actual transcription (like AWS or Hugging Face)
    const provider = this.env.TRANSCRIBE_PROVIDER || 'aws';
    const awsEndpoint = (provider === 'huggingface')
      ? 'https://router.huggingface.co/hf-inference/models/facebook/wav2vec2-large-xlsr-53-spanish'
      : 'http://<aws-spot-ip>:5000/transcribe';

    const headers: Record<string, string> = { 'Content-Type': 'audio/wav' };
    if (provider === 'huggingface') {
      headers['Authorization'] = `Bearer ${this.env.LEARNER_ASSESSMENT_TRANSCRIBE_TOKEN}`;
    }

    const res = await fetch(awsEndpoint, { method: 'POST', headers, body: wavData });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Transcription failed: ${errorText}`);
    }

    // Suppose the service returns { text: string, segments: [{ start, end, text }] }
    const json = await res.json<{
      text?: string;
      segments?: Array<{ start: number; end: number; text: string }>;
    }>();

    // If the engine only returns "text" with no segments, we just create one big segment
    if (!json.segments || json.segments.length === 0) {
      const text = json.text || "";
      return [{ peerId, role, start: 0, text }];
    }

    // Otherwise map each segment
    return json.segments.map(s => ({
      peerId,
      role,
      start: s.start, // or do an offset if you prefer
      text: s.text,
    }));
  }

  /**
   * Merges all segments from all peers by comparing `start`.
   * Yields lines like: [0.25] teacher: "¿Qué tal?" ...
   */
  private async mergePeerTranscripts(allSegments: TranscribedSegment[]): Promise<string> {
    // Sort by start time
    allSegments.sort((a, b) => a.start - b.start);

    // Format lines
    const lines = allSegments.map(seg => {
      const time = seg.start.toFixed(2).padStart(5, '0');
      return `[${time}] ${seg.role}: "${seg.text}"`;
    });

    return lines.join('\n');
  }

  /**
   * Cleanup ephemeral data:
   *  - DO storage
   *  - PCM chunks
   *  - partial WAVs
   *  - Possibly preserve final WAV (if you want).
   */
  private async cleanupAll(roomId: string, peerIds: string[]) {
    // 1) For each peer, gather partial WAV keys
    for (const peerId of peerIds) {
      const chunkCounter = (await this.state.storage.get<number>(`chunkCounter:${peerId}`)) || 0;

      // Collect partial WAV keys
      const wavKeysKey = `wavKeys:${peerId}`;
      let wavKeys = (await this.state.storage.get<string[]>(wavKeysKey)) || [];
      // If you want to preserve the last one, pop it here. Otherwise remove them all.
      // We'll do the same approach you had in your code: preserve only the final WAV
      let finalWavKey: string | undefined;
      if (wavKeys.length > 0) {
        finalWavKey = wavKeys.pop();
      }

      // Delete all partial WAVs except the final
      for (const wavKey of wavKeys) {
        await this.env.AUDIO_BUCKET.delete(wavKey);
      }

      // Delete PCM files
      for (let i = 0; i < chunkCounter; i++) {
        const pcmPath = `${roomId}/${peerId}/pcm/${i}.pcm`;
        await this.env.AUDIO_BUCKET.delete(pcmPath);
      }

      // Log which WAV we kept
      if (finalWavKey) {
        console.log(`[LearnerAssessmentDO] Preserved final WAV for peer=${peerId}: ${finalWavKey}`);
      }
    }

    // 2) Clear all DO storage
    // This removes chunk counters, timestamps, roles, wavKeys, etc.
    await this.state.storage.deleteAll();
  }

  /**
   * Broadcast a message to the appropriate MessageRelayDO for the room
   */
  private async broadcastToRoom(roomId: string, type: string, data: any) {
    const relayDO = this.env.MESSAGE_RELAY_DO.get(
      this.env.MESSAGE_RELAY_DO.idFromName(roomId)
    );
    await relayDO.fetch(`http://relay/broadcast/${roomId}`, {
      method: 'POST',
      body: JSON.stringify({ type, data }),
    });
  }
}

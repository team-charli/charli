// apps/pcm-to-wav-worker/src/index.ts
import { WorkerEntrypoint } from 'cloudflare:workers';
import { Env } from './env';

function createWavHeader(dataLength: number, sampleRate = 48000, channels = 1): Uint8Array {
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);

  // "RIFF"
  header.set([82, 73, 70, 70]);
  view.setUint32(4, 36 + dataLength, true);

  // "WAVE"
  header.set([87, 65, 86, 69], 8);

  // "fmt "
  header.set([102, 109, 116, 32], 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true); // 16-bit

  // "data"
  header.set([100, 97, 116, 97], 36);
  view.setUint32(40, dataLength, true);

  return header;
}

export default class PcmToWavWorker extends WorkerEntrypoint<Env> {
  async fetch(request: Request) {
    const url = new URL(request.url);

    // The /convert/:roomId route
    if (url.pathname.startsWith('/convert/')) {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      const roomId = url.pathname.split('/')[2];
      const { startChunk, endChunk } = await request.json<{
        roomId: string;
        startChunk: number;
        endChunk: number;
      }>();

      console.log(`[PcmToWavWorker] Converting PCM batch for ${roomId}, chunks ${startChunk}-${endChunk}`);

      // Fetch all the PCM chunks
      const pcmData: Uint8Array[] = [];
      for (let i = startChunk; i <= endChunk; i++) {
        const pcmKey = `${roomId}/pcm/${i}.pcm`;
        const pcmObject = await this.env.AUDIO_BUCKET.get(pcmKey);
        if (!pcmObject) {
          console.error(`[PcmToWavWorker] PCM chunk not found: ${pcmKey}`);
          continue;
        }
        pcmData.push(new Uint8Array(await pcmObject.arrayBuffer()));
      }

      // No data at all
      if (pcmData.length === 0) {
        return new Response('No PCM data found', { status: 404 });
      }

      // Combine into a single Uint8Array
      const totalBytes = pcmData.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedPcm = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of pcmData) {
        combinedPcm.set(chunk, offset);
        offset += chunk.length;
      }

      // If we ended up with zero-length data, just store an empty WAV
      if (combinedPcm.length === 0) {
        console.log('[PcmToWavWorker] No audio data');
        const wavKey = `${roomId}/wav/${startChunk}-${endChunk}.wav`;
        await this.env.AUDIO_BUCKET.put(wavKey, new Uint8Array(0).buffer);
        return new Response(wavKey, { status: 200 });
      }

      // Build the WAV
      const wavHeader = createWavHeader(combinedPcm.length);
      const fullWav = new Uint8Array([...wavHeader, ...combinedPcm]);
      console.log(`[PcmToWavWorker] Created WAV, size: ${fullWav.length}`);

      const wavKey = `${roomId}/wav/${startChunk}-${endChunk}.wav`;
      await this.env.AUDIO_BUCKET.put(wavKey, fullWav.buffer);
      console.log(`[PcmToWavWorker] Uploaded WAV to R2: ${wavKey}`);

      return new Response(wavKey, { status: 200 });
    }

    // For debugging or other routes:
    if (!this.env.DEBUG_KV) {
      return new Response('DEBUG_KV binding missing', { status: 500 });
    }

    if (url.pathname === '/test-save') {
      const dummyPcm = new Uint8Array(1000).fill(42);
      const wavHeader = createWavHeader(dummyPcm.length);
      const dummyWav = new Uint8Array([...wavHeader, ...dummyPcm]);
      await this.env.DEBUG_KV.put('last_wav_segment', dummyWav.buffer);
      console.log('[PcmToWavWorker] Saved test WAV to DEBUG_KV, size:', dummyWav.length);
      return new Response('Test WAV saved', { status: 200 });
    }

    if (url.pathname === '/debug/wav') {
      const wav = await this.env.DEBUG_KV.get('last_wav_segment', { type: 'arrayBuffer' });
      console.log('[PcmToWavWorker] Fetched WAV from DEBUG_KV, size:', wav?.byteLength || 'null');
      if (!wav) {
        return new Response('No WAV file found in DEBUG_KV', { status: 404 });
      }
      return new Response(wav, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Disposition': 'attachment; filename="debug.wav"',
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

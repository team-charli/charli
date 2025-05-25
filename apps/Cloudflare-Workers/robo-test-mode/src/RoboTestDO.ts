/* eslint-disable @typescript-eslint/ban-ts-comment */
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

function cleanForEleven(text: string): string {
  // 1. collapse Windows / mac newlines → space
  let out = text.replace(/\r?\n+/g, ' ');
  // 2. trim excess whitespace
  out = out.replace(/\s{2,}/g, ' ').trim();
  // 3. ElevenLabs hard limit ≈ 2 500 chars per call
  return out.slice(0, 2500);
}

function u8ToBase64(u8: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

export class RoboTestDO extends DurableObject<Env> {
  private app = new Hono();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    /* compatibility QA route ---------------------------------------- */
    this.app.post('/generate-pcm-reply', async (c) => {
      const { userText } = await c.req.json();
      const pcm = await this.buildPcmReply(userText);
      return new Response(pcm, { headers: { 'Content-Type': 'audio/wav' } });
    });

    /* main JSON API -------------------------------------------------- */
    this.app.post('/robo-teacher-reply', async (c) => {
      try {
        const { userText, roomId, utteranceId } = await c.req.json();

        /* 1 · generate Spanish sentence ----------------------------- */
        const replyText = await this.generateRoboReplyText(userText);

        /* 2 · text broadcast (instant) ------------------------------ */
        await this.broadcast(roomId, 'roboReplyText', { utteranceId, text: replyText });

        /* 3 · fire‑and‑forget TTS & audio broadcast ---------------- */
        this.convertTextToSpeechAndBroadcast(replyText, roomId, utteranceId).catch((err) =>
          console.error('[RoboTestDO] TTS error:', err)
        );

        console.log('[RoboTestDO] Reply for', roomId, '→', replyText, 'utteranceId:', utteranceId);
        return c.json({ status: 'queued', utteranceId }, 202);
      } catch (err) {
        console.error('[RoboTestDO] Error:', err);
        return c.json({ status: 'error', message: String(err) }, 500);
      }
    });
  }

  fetch(req: Request) {
    return this.app.fetch(req);
  }

  /* ───────────────── pipeline pieces ───────────────────────── */

  private async buildPcmReply(text: string) {
    const mp3 = await this.convertTextToSpeech(text);
    return this.decodeMp3ToPcm(mp3); // legacy only
  }

  private async generateRoboReplyText(userText: string): Promise<string> {
    const { response } = (await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a friendly native Spanish speaker. Keep replies short and conversational.',
        },
        { role: 'user', content: userText },
      ],
      max_tokens: 100,
      temperature: 0.7,
    })) as { response: string };

    return response.trim();
  }

  /** -------------------------------------------------------------------
   *  Spanish TTS - ElevenLabs Flash v2.5 ("es_mx_002")
   *  - returns Uint8Array MP3 so the caller can base64‑encode as today
   * ------------------------------------------------------------------ */
  private async convertTextToSpeech(text: string): Promise<Uint8Array> {
    const safePrompt = cleanForEleven(text);
    const VOICE_ID = 'ay4iqk10DLwc8KGSrf2t'; // robo‑teacher – es‑MX female

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.env.ELEVEN_API_KEY, // <<< secret
      },
      body: JSON.stringify({
        text: safePrompt,
        model_id: 'eleven_multilingual_v2', // Flash v2.5
        output_format: 'mp3_44100_128',
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`ElevenLabs TTS error ${res.status}: ${msg}`);
    }

    return new Uint8Array(await res.arrayBuffer());
  }

  /* legacy QA helper — remove if unused ----------------------------- */
  private async decodeMp3ToPcm(mp3: Uint8Array): Promise<Uint8Array> {
    const form = new FormData();
    form.append('file', new Blob([mp3], { type: 'audio/mpeg' }), 'audio.mp3');

    const r = await fetch('https://mp3-to-pcm.charli.chat/decode', { method: 'POST', body: form });
    if (!r.ok) throw new Error(`MP3 decode failed (${r.status})`);
    return new Uint8Array(await r.arrayBuffer());
  }

  /* ─────────────────── broadcast helper ─────────────────────────── */
  private async broadcast(roomId: string, messageType: string, data: any) {
    try {
      const payload = { type: messageType, data };
      const url = `http://message-relay/broadcast/${roomId}`;
      const init: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      };

      const target = this.env.MESSAGE_RELAY_DO as unknown as
        | DurableObjectNamespace
        | Fetcher;

      let res: Response;
      if ('get' in target) {
        // Durable‑Object namespace path
        const stub = target.get(target.idFromName(roomId));
        res = await stub.fetch(url, init);
      } else {
        // Service binding (plain fetcher) path
        res = await target.fetch(url, init);
      }

      if (!res.ok) console.warn('[RoboTestDO] broadcast replied', res.status);
    } catch (err) {
      console.error('[RoboTestDO] Broadcast failed:', err);
    }
  }

  /* ─────────────────── fire‑and‑forget TTS ───────────────────────── */
  private async convertTextToSpeechAndBroadcast(text: string, roomId: string, utteranceId: number) {
    try {
      const mp3Bytes = await this.convertTextToSpeech(text);
      const mp3Base64 = u8ToBase64(mp3Bytes);
      await this.broadcast(roomId, 'roboAudioMp3', { utteranceId, mp3Base64 });
      console.log(`[RoboTestDO] Audio broadcast complete for utterance ${utteranceId}`);
    } catch (err) {
      console.error(`[RoboTestDO] TTS/broadcast error for utterance ${utteranceId}:`, err);
    }
  }
}

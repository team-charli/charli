import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

export class RoboTestDO extends DurableObject<Env> {
  private app = new Hono();

  /* ───────── helper to avoid “maximum call stack” ─────── */
  private static u8ToBase64(u8: Uint8Array): string {
    let bin = '';
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return btoa(bin);
  }

  /* ───────────────────────── constructor ──────────────── */
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    /* legacy QA endpoint */
    this.app.post('/generate-pcm-reply', async c => {
      const { userText } = await c.req.json();
      const pcm = await this.buildPcmReply(userText);
      return new Response(pcm, { headers: { 'Content-Type': 'application/octet-stream' }});
    });

    /* main endpoint */
    this.app.post('/robo-teacher-reply', async c => {
      try {
        const { userText, roomId } = await c.req.json();

        /* 1️⃣  short Spanish reply text */
        const replyText = await this.generateRoboReplyText(userText);

        /* 2️⃣  Llama → MeloTTS → MP3 bytes */
        const mp3Bytes  = await this.convertTextToSpeech(replyText);

        /* 3️⃣  base-64 for transport (no stack-blow) */
        const mp3Base64 = RoboTestDO.u8ToBase64(mp3Bytes);

        console.log('[RoboTestDO] Generated reply for', roomId, ':',
                    replyText.slice(0, 50), '…');

        return c.json({ status: 'success', replyText, mp3Base64 });
      } catch (err) {
        console.error('[RoboTestDO] Error:', err);
        return c.json({ status: 'error',
                        message: err instanceof Error ? err.message : 'unknown' }, 500);
      }
    });
  }

  fetch(req: Request) {
    return this.app.fetch(req);
  }

  /* ───────────── helper pipeline ───────────── */

  private async buildPcmReply(userText: string): Promise<Uint8Array> {
    const reply = await this.generateRoboReplyText(userText);
    const mp3   = await this.convertTextToSpeech(reply);
    return this.decodeMp3ToPcm(mp3);          // legacy QA only
  }

  private async generateRoboReplyText(userText: string): Promise<string> {
    const { response } = await this.env.AI.run(
      '@cf/meta/llama-3.1-8b-instruct',
      {
        messages: [
          { role: 'system',
            content: 'You are a friendly native Spanish speaker. Keep replies short and conversational.' },
          { role: 'user', content: userText }
        ],
        max_tokens : 100,
        temperature: 0.7
      }) as { response: string };

    const txt = response.trim();
    console.log('[RoboTestDO] Reply text →', txt);
    return txt;
  }

  /** Llama text → MeloTTS → MP3 bytes */
  private async convertTextToSpeech(text: string): Promise<Uint8Array> {
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    // @ts-expect-error voice_id & speed not yet in workers-types
    const { audio } = await this.env.AI.run('@cf/myshell-ai/melotts', {
      prompt   : text.slice(0, 180),
      voice_id : 'es_female_01',
      speed    : 1.0
    }) as { audio: string };
    /* eslint-enable @typescript-eslint/ban-ts-comment */

    return Uint8Array.from(atob(audio), c => c.charCodeAt(0));
  }

  /* optional: still here for /generate-pcm-reply QA route */
  private async decodeMp3ToPcm(mp3: Uint8Array): Promise<Uint8Array> {
    const form = new FormData();
    form.append('file', new Blob([mp3], { type: 'audio/mpeg' }), 'audio.mp3');

    const r = await fetch('https://mp3-to-pcm.charli.chat/decode',
                          { method: 'POST', body: form });

    if (!r.ok) throw new Error(`MP3 decode failed (${r.status})`);
    return new Uint8Array(await r.arrayBuffer());
  }
}

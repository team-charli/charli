import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

export class RoboTestDO extends DurableObject<Env> {
  private app = new Hono();

  /* ───────────────────────── constructor ─────────────────────────── */
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    /* ---------- legacy PCM endpoint (QA only) ----------------------- */
    this.app.post('/generate-pcm-reply', async c => {
      const { userText } = await c.req.json();
      const pcmBuffer = await this.buildPcmReply(userText);
      return new Response(pcmBuffer, {
        headers: { 'Content-Type': 'application/octet-stream' }
      });
    });

    /* ---------- main endpoint consumed by LearnerAssessmentDO ------- */
    this.app.post('/robo-teacher-reply', async c => {
      try {
        const { userText, roomId } = await c.req.json();

        /* 1️⃣  short Spanish reply text */
        const replyText = await this.generateRoboReplyText(userText);

        /* 2️⃣  Llama → MeloTTS → MP3 (Uint8Array) */
        const mp3Bytes  = await this.convertTextToSpeech(replyText);

        /* 3️⃣  base64 for transport */
        const mp3Base64 = btoa(String.fromCharCode(...mp3Bytes));

        console.log(
          `[RoboTestDO] Generated reply for ${roomId}: `,
          replyText.slice(0, 50), '…'
        );

        return c.json({ status: 'success', replyText, mp3Base64 });
      } catch (err) {
        console.error('[RoboTestDO] Error in /robo-teacher-reply:', err);
        return c.json(
          {
            status:  'error',
            message: err instanceof Error ? err.message : 'unknown'
          },
          500
        );
      }
    });
  }

  /* ───────────────────────── fetch entry ──────────────────────────── */
  fetch(req: Request) {
    return this.app.fetch(req);
  }

  /* ───────────────────────── helpers ──────────────────────────────── */

  /** QA helper: text → MP3 → PCM */
  private async buildPcmReply(userText: string): Promise<Uint8Array> {
    const reply = await this.generateRoboReplyText(userText);
    const mp3   = await this.convertTextToSpeech(reply);
    return this.decodeMp3ToPcm(mp3);
  }

  /** Ask Llama-3 for a short, friendly Spanish answer */
  private async generateRoboReplyText(userText: string): Promise<string> {
    try {
      const { response } = await this.env.AI.run(
        '@cf/meta/llama-3.1-8b-instruct',
        {
          messages: [
            {
              role:    'system',
              content: 'You are a friendly native Spanish speaker. Keep replies short and conversational.'
            },
            { role: 'user', content: userText }
          ],
          max_tokens: 100,
          temperature: 0.7
        }
      ) as { response: string };

      const txt = response.trim();
      console.log('[RoboTestDO] Reply text →', txt);
      return txt;
    } catch (err) {
      console.error('[RoboTestDO] Text generation error:', err);
      throw new Error('Failed to generate reply text');
    }
  }

  /** Llama text → MeloTTS → MP3 bytes */
  private async convertTextToSpeech(text: string): Promise<Uint8Array> {
    try {
      /* eslint-disable @typescript-eslint/ban-ts-comment */
      // @ts-expect-error voice_id & speed not yet in workers-types
      const { audio } = await this.env.AI.run('@cf/myshell-ai/melotts', {
        prompt   : text.slice(0, 180),  // <200 chars for TTS reliability
        voice_id : 'es_female_01',      // Castilian Spanish female
        speed    : 1.0                  // normal speed
      }) as { audio: string };
      /* eslint-enable @typescript-eslint/ban-ts-comment */

      return Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    } catch (err) {
      console.error('[RoboTestDO] TTS error:', err);
      throw new Error('Failed to convert text to speech');
    }
  }

  /** Optional helper for the legacy PCM endpoint */
  private async decodeMp3ToPcm(mp3Buf: Uint8Array): Promise<Uint8Array> {
    try {
      const form = new FormData();
      form.append('file', new Blob([mp3Buf], { type: 'audio/mpeg' }), 'audio.mp3');

      const resp = await fetch('https://mp3-to-pcm.charli.chat/decode', {
        method: 'POST',
        body:   form
      });

      if (!resp.ok) {
        console.error('[RoboTestDO] MP3 decode HTTP', resp.status);
        throw new Error('MP3 decode service failed');
      }

      return new Uint8Array(await resp.arrayBuffer());
    } catch (err) {
      console.error('[RoboTestDO] MP3 decode error:', err);
      throw new Error('Failed to decode MP3 to PCM');
    }
  }
}

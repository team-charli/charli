import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

export class RoboTestDO extends DurableObject<Env> {
  private app = new Hono();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    /* ------------------------------------------------- *
     * Legacy endpoint (raw PCM reply)
     * ------------------------------------------------- */
    this.app.post('/generate-pcm-reply', async c => {
      const { userText } = await c.req.json();
      const pcmBuffer = await this.buildPcmReply(userText);
      return new Response(pcmBuffer, {
        headers: { 'Content-Type': 'application/octet-stream' }
      });
    });

    /* ------------------------------------------------- *
     * New endpoint used by LearnerAssessmentDO
     * ------------------------------------------------- */
    this.app.post('/robo-teacher-reply', async c => {
      try {
        const { userText, roomId } = await c.req.json();

        // 1) short Spanish reply
        const replyText = await this.generateRoboReplyText(userText);

        // 2) text-to-speech  → MP3  → PCM
        const mp3Audio  = await this.convertTextToSpeech(replyText);
        const pcmAudio  = await this.decodeMp3ToPcm(mp3Audio);

        // 3) base64-encode PCM for JSON transport
        const pcmBase64 = btoa(String.fromCharCode(...pcmAudio));

        console.log(`[RoboTestDO] Generated reply for ${roomId}: ${replyText.slice(0, 50)}…`);

        return c.json({ replyText, pcmBase64, status: 'success' });
      } catch (err) {
        console.error('[RoboTestDO] Error in /robo-teacher-reply:', err);
        return c.json(
          { status: 'error', message: err instanceof Error ? err.message : 'unknown' },
          500
        );
      }
    });
  }

  /* ------------------------------------------------- *
   * Durable-object fetch entry
   * ------------------------------------------------- */
  fetch(req: Request) {
    return this.app.fetch(req);
  }

  /* ===============  helper pipeline  ================= */

  /** Text → MP3 → PCM (Uint8Array) */
  private async buildPcmReply(userText: string): Promise<Uint8Array> {
    const reply = await this.generateRoboReplyText(userText);
    const mp3   = await this.convertTextToSpeech(reply);
    return this.decodeMp3ToPcm(mp3);
  }

  /** Generate a short Spanish response via Llama-3 8-B-Instruct */
  private async generateRoboReplyText(userText: string): Promise<string> {
    try {
      const llmRes = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are a friendly native Spanish speaker. Keep replies short and conversational.' },
          { role: 'user',   content: userText }
        ],
        max_tokens: 100,
        temperature: 0.7
      }) as { response: string };

      const txt = llmRes.response.trim();
      console.log('[RoboTestDO] Reply text →', txt);
      return txt;
    } catch (err) {
      console.error('[RoboTestDO] Text generation error:', err);
      throw new Error('Failed to generate reply text');
    }
  }

/** Llama text → MyShell MeloTTS → MP3 (Uint8Array) */
private async convertTextToSpeech(text: string): Promise<Uint8Array> {
  try {
    // @ts-expect-error voice_id & speed not yet in workers-types
    const { audio } = await this.env.AI.run('@cf/myshell-ai/melotts', {
      prompt   : text.slice(0, 180), // <200 chars for TTS reliability
      voice_id : 'es_female_01',     // Castilian Spanish female
      speed    : 1.0                 // normal speed
    }) as { audio: string };

    return Uint8Array.from(atob(audio), c => c.charCodeAt(0));
  } catch (err) {
    console.error('[RoboTestDO] TTS error:', err);
    throw new Error('Failed to convert text to speech');
  }
}

  /** Cloudflare R2 worker → MP3 → PCM (48 kHz / 16-bit / mono) */
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

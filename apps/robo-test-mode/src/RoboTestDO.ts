import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

export class RoboTestDO extends DurableObject<Env> {
  private app = new Hono();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

this.app.post('/simulate-reply', async (c) => {
  const { userText, roomId } = await c.req.json();

  // 🔁 Step 1: LLM
  const llamaRes = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'You are a helpful Spanish teacher speaking to a learner.' },
      { role: 'user', content: userText }
    ],
    max_tokens: 100,
    temperature: 0.7
  }) as { response: string };

  const aiText = llamaRes.response.trim();
  console.log('[RoboTestDO] LLM replied with:', aiText);

  // 🔁 Step 2: TTS
  const ttsRes = await this.env.AI.run('@cf/myshell-ai/melotts', {
    prompt: aiText,
    lang: 'es'
  }) as { audio: string }; // MP3 base64

  const mp3Buffer = Uint8Array.from(atob(ttsRes.audio), c => c.charCodeAt(0));

  // ⛔ Placeholder — MP3 decode step needed
  const pcmBuffer = new Uint8Array(); // TODO: decode MP3 → PCM

  const chunkSize = 131072;
  for (let i = 0; i < pcmBuffer.length; i += chunkSize) {
    const chunk = pcmBuffer.slice(i, i + chunkSize);
    await fetch(`https://your-worker-domain/audio/${roomId}?peerId=simulated-teacher&role=teacher`, {
      method: 'POST',
      body: chunk
    });
  }

  return c.json({ responseText: aiText });
});
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}


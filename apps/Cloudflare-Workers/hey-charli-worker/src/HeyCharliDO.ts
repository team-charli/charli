// apps/Cloudflare-Workers/hey-charli-worker/src/HeyCharliDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import type { DOEnv, Env } from './env';

interface TranslateReq  { question: string }
interface TranslateRes  { answer: string; error?: string }

/** Durable Object that turns an English phrase into Spanish. */
export class HeyCharliDO extends DurableObject<DOEnv> {
  private app = new Hono<Env>();

  constructor(
    protected state: DurableObjectState,
    protected env: DOEnv
  ) {
    super(state, env);

    /* POST /translate -------------------------------------------------- */
    this.app.post('/translate', async c => {
      const { question = '' } = await c.req.json<TranslateReq>();

      // Strip common wrappers: “How do you say … in Spanish?”
      const cleaned = question
        .trim()
        .replace(/how do you say\s+/i, '')
        .replace(/\b(in\s+)?spanish\??$/i, '')
        .trim();

      if (!cleaned) {
        return c.json<TranslateRes>(
          { error: 'Unable to extract phrase', answer: '' }, 400
        );
      }

      try {
        const { translated_text } = await this.env.AI.run(
          '@cf/meta/m2m100-1.2b',
          { text: cleaned, source_lang: 'en', target_lang: 'es' }
        );

        return c.json<TranslateRes>({ answer: translated_text ?? 'Traducción fallida' });
      } catch (err) {
        console.error('Translation error:', err);
        return c.json<TranslateRes>(
          { error: 'Translation failed', answer: 'Error' }, 500
        );
      }
    });

    /* fallback */
    this.app.all('*', c => c.text('Not Found', 404));
  }

  async fetch(request: Request) {
    return this.app.fetch(request, this.env);
  }
}

/* default export to match other Workers (direct hits = 404) */
export default {
  fetch() {
    return new Response('Use Durable Object binding', { status: 404 });
  }
};

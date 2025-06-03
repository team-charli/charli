import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';
import { callWithRetry } from './lib/aiGateway';

import { lemmaFingerprintPrompt } from './Prompts/Enrichments/lemmaFingerprintPrompt';

export interface AnalyzedMistake {
  text: string;
  correction: string;
  type: string;
  lemma_fingerprint?: string;
}

export class LemmaEnricherDO extends DurableObject<Env> {
  private app = new Hono();

  constructor(private state: DurableObjectState, protected env: Env) {
    super(state, env);

    this.app.post('/enrich', async (c) => {
      const { analyzedMistakes }: { analyzedMistakes: AnalyzedMistake[] } = await c.req.json();

      if (!Array.isArray(analyzedMistakes) || analyzedMistakes.length === 0) {
        return c.json({ error: 'No mistakes provided' }, 400);
      }

      const prompt = lemmaFingerprintPrompt(analyzedMistakes);
      const response = await callWithRetry(
        '@cf/meta/llama-3.1-8b-instruct',
        {
          messages: [
            { role: 'system', content: 'You are a Spanish grammar enrichment assistant.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
          response_format: { type: 'json_object' },
          temperature: 0
        },
        this.env
      ) as { response: string };

      try {
        const fingerprints = JSON.parse(response.response) as string[];

        if (fingerprints.length !== analyzedMistakes.length) {
          throw new Error(`[LemmaEnricherDO] mismatch: expected ${analyzedMistakes.length}, got ${fingerprints.length}`);
        }

        const enriched = analyzedMistakes.map((m, i) => ({
          ...m,
          lemma_fingerprint: fingerprints[i] ?? null
        }));

        return c.json({ enrichedMistakes: enriched }, 200);
      } catch (err) {
        console.error('[LemmaEnricherDO] Failed to parse LLM output:', err);
        return c.json({ error: 'Fingerprint enrichment failed' }, 500);
      }
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}


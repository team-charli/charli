//MistakeEnricherPipelineDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

export interface AnalyzedMistake {
  text: string;
  correction: string;
  type: string;
  lemma_fingerprint?: string;
  avg_frequency?: number;
  trend_arrow?: 'up' | 'down' | null;
  session_frequency_color?: 'red' | 'yellow' | 'green' | null;
}

export class MistakeEnricherPipelineDO extends DurableObject<Env> {
  private app = new Hono();

  constructor(private state: DurableObjectState, protected env: Env) {
    super(state, env);

    this.app.post('/enrich', async (c) => {
      const {
        learner_id,
        analyzedMistakes
      }: {
        learner_id: number;
        analyzedMistakes: AnalyzedMistake[];
      } = await c.req.json();

      if (!analyzedMistakes?.length) {
        return c.json({ enrichedMistakes: [] }, 200);
      }

      // 1. Lemma fingerprint
      const lemmaRes = await fetch(this.env.LEMMA_ENRICHER_DO_URL + '/enrich', {
        method: 'POST',
        body: JSON.stringify({ analyzedMistakes }),
        headers: { 'Content-Type': 'application/json' }
      });
      const { enrichedMistakes: withLemmas } = await lemmaRes.json() as { enrichedMistakes: AnalyzedMistake[] };

      // 2. Average frequency
      const avgFreqRes = await fetch(this.env.AVG_FREQUENCY_ENRICHER_DO_URL + '/enrich', {
        method: 'POST',
        body: JSON.stringify({ learner_id, enrichedMistakes: withLemmas }),
        headers: { 'Content-Type': 'application/json' }
      });
      const { enrichedMistakes: withFreq } = await avgFreqRes.json() as { enrichedMistakes: AnalyzedMistake[] };

      // 3. Trend arrow
      const trendRes = await fetch(this.env.TREND_ARROW_ENRICHER_DO_URL + '/enrich', {
        method: 'POST',
        body: JSON.stringify({ enrichedMistakes: withFreq }),
        headers: { 'Content-Type': 'application/json' }
      });
      const { enrichedMistakes: withTrend } = await trendRes.json() as { enrichedMistakes: AnalyzedMistake[] };

      // 4. Session frequency color
      const colorRes = await fetch(this.env.SESSION_COLOR_ENRICHER_DO_URL + '/enrich', {
        method: 'POST',
        body: JSON.stringify({ enrichedMistakes: withTrend }),
        headers: { 'Content-Type': 'application/json' }
      });
      const { enrichedMistakes: finalMistakes } = await colorRes.json() as { enrichedMistakes: AnalyzedMistake[] };

      return c.json({ enrichedMistakes: finalMistakes }, 200);
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}


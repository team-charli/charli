import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

interface MistakeWithTrend {
  text: string;
  correction: string;
  type: string;
  lemma_fingerprint: string | null;
  avg_frequency: number | null;
  trend_arrow: 'up' | 'down' | null;
  session_frequency_color?: 'red' | 'yellow' | 'green' | null;
}

export class SessionFrequencyColorEnricherDO extends DurableObject<Env> {
  private app = new Hono();

  constructor(private state: DurableObjectState, protected env: Env) {
    super(state, env);

    this.app.post('/enrich', async (c) => {
      const {
        enrichedMistakes
      }: {
        enrichedMistakes: MistakeWithTrend[];
      } = await c.req.json();

      const frequencyMap: Record<string, number> = {};

      for (const m of enrichedMistakes) {
        if (!m.lemma_fingerprint) continue;
        frequencyMap[m.lemma_fingerprint] = (frequencyMap[m.lemma_fingerprint] || 0) + 1;
      }

      const result = enrichedMistakes.map((m) => {
        const freq = m.lemma_fingerprint ? frequencyMap[m.lemma_fingerprint] : null;

        let color: 'red' | 'yellow' | 'green' | null = null;
        if (freq === 1) color = 'green';
        else if (freq === 2) color = 'yellow';
        else if (freq !== null && freq >= 3) color = 'red';

        return { ...m, session_frequency_color: color };
      });

      return c.json({ enrichedMistakes: result }, 200);
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}


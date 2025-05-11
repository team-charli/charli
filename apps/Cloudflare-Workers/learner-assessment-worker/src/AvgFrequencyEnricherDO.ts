//AvgFrequencyEnricherDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Env } from './env';

interface MistakeWithFingerprint {
  text: string;
  correction: string;
  type: string;
  lemma_fingerprint: string | null;
  avg_frequency?: number;
}

export class AvgFrequencyEnricherDO extends DurableObject<Env> {
  private app = new Hono();
  private supabaseClient: SupabaseClient;

  constructor(private state: DurableObjectState, private env: Env) {
    super(state, env);
    this.supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    this.app.post('/enrich', async (c) => {
      const {
        learner_id,
        enrichedMistakes
      }: {
        learner_id: number;
        enrichedMistakes: MistakeWithFingerprint[];
      } = await c.req.json();

      const fingerprints = enrichedMistakes
        .map(m => m.lemma_fingerprint)
        .filter((fp): fp is string => !!fp);

      if (!fingerprints.length) {
        return c.json({ enrichedMistakes }, 200); // no fingerprints to enrich
      }

      const { data, error } = await this.supabaseClient
        .from('learner_mistakes')
        .select('lemma_fingerprint, count(*)')
        .eq('learner_id', learner_id)
        .in('lemma_fingerprint', fingerprints)
        .group('lemma_fingerprint');

      if (error) {
        console.error('[AvgFrequencyEnricherDO] Supabase error:', error);
        return c.json({ error: 'Failed to fetch frequency data' }, 500);
      }

      const freqMap: Record<string, number> = {};
      for (const row of data ?? []) {
        freqMap[row.lemma_fingerprint] = Number(row.count);
      }

      const result = enrichedMistakes.map((m) => ({
        ...m,
        avg_frequency: m.lemma_fingerprint ? freqMap[m.lemma_fingerprint] ?? 0 : null
      }));

      return c.json({ enrichedMistakes: result }, 200);
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}


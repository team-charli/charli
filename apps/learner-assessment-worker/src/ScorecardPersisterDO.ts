//ScorecardPersisterDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Env } from './env';

import { AnalyzedMistake } from './MistakeAnalyzerDO';

export class ScorecardPersisterDO extends DurableObject<Env> {
  private app = new Hono();
  private supabaseClient: SupabaseClient;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    this.app.post('/persist', async (c) => {
      const {
        session_id,
        learner_id,
        analyzedMistakes,
        conversationDifficulty,
        languageAccuracy,
      }: {
        session_id: number;
        learner_id: number;
        analyzedMistakes: AnalyzedMistake[];
        conversationDifficulty: number;
        languageAccuracy: number;
      } = await c.req.json();

      if (!analyzedMistakes?.length) {
        return c.json({ error: 'No analyzed mistakes provided' }, 400);
      }

      const { error: scorecardError } = await this.supabaseClient
        .from('learner_scorecards')
        .insert({
          session_id,
          learner_id,
          conversation_difficulty: conversationDifficulty,
          language_accuracy: languageAccuracy
        });

      if (scorecardError) {
        console.error('[ScorecardPersisterDO] Failed to insert scorecard:', scorecardError);
        return c.json({ error: 'Scorecard insert failed' }, 500);
      }

      const enrichedMistakes = analyzedMistakes.map(m => ({
        session_id,
        learner_id,
        text: m.text,
        correction: m.correction,
        type: m.type
      }));

      const { error: mistakesError } = await this.supabaseClient
        .from('learner_mistakes')
        .insert(enrichedMistakes);

      if (mistakesError) {
        console.error('[ScorecardPersisterDO] Failed to insert learner_mistakes:', mistakesError);
        return c.json({ error: 'Mistake insert failed' }, 500);
      }

      return c.json({ ok: true }, 200);
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}


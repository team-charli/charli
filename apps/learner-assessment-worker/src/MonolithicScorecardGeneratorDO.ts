// apps/learner-assessment-worker/src/MonolithicScorecardGeneratorDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { monolithicPrompt } from './monolithicPrompt';
import { Env } from './env';

export interface Scorecard {
  conversationDifficulty: number;
  languageAccuracy: number;
  mistakes: Array<{
    text: string;
    correction: string;
    type: string;
    lemma_fingerprint?: string;
    avg_frequency?: number;
    trend_arrow?: string;
    session_frequency_color?: string;
  }>;
}

export class MonolithicScorecardGeneratorDO extends DurableObject<Env> {
  private app = new Hono();
  private supabaseClient: SupabaseClient;
  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    this.app.post('/scorecard/:roomId', async (c) => {
      const roomId = c.req.param('roomId');
      const { learnerSegments, session_id, learner_id }: {
        learnerSegments: { start: number; text: string }[];
        session_id: number;
        learner_id: number;
      } = await c.req.json();

      if (!learnerSegments?.length) {
        return c.json({ error: 'No learner utterances provided' }, 400);
      }

      const transcript = learnerSegments
        .map(seg => `[${seg.start.toFixed(2)}] ${seg.text}`)
        .join('\n');

      const fullPrompt = monolithicPrompt(transcript);

      try {
        const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: 'system', content: 'You are a language learning assistant.' },
            { role: 'user', content: fullPrompt }
          ],
          max_tokens: 1000,
          response_format: { type: 'json_object' },
          temperature: 0.1
        }) as { response: string };

        const scorecard: Scorecard = JSON.parse(response.response);

        const enrichedMistakes = await this.enrichMistakesWithFingerprints(scorecard.mistakes);
        await this.persistScorecardToSupabase(session_id, learner_id, {
          ...scorecard,
          mistakes: enrichedMistakes
        });

        return c.json({ roomId, scorecard }, 200);

      } catch (err) {
        console.error('[MonolithicScorecardGeneratorDO] Scorecard generation failed:', err);
        return c.json({ error: 'Scorecard generation failed', details: String(err) }, 500);
      }
    });
  }

  private async enrichMistakesWithFingerprints(mistakes: Scorecard["mistakes"]): Promise<(typeof mistakes[0] & { lemma_fingerprint?: string })[]> {
    const fingerprintPrompt = mistakes.map((m, i) => `Mistake ${i + 1}:
Learner said: "${m.text}"
Correction: "${m.correction}"
Return only the changed part in format: "wrong → correct"`).join("\n---\n");

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are an assistant extracting corrected token pairs.' },
        { role: 'user', content: `Extract lemma corrections from the following:

${fingerprintPrompt}

Return a JSON array like:
["estaba → estuve", "tenió → tuvo"]` }
      ],
      max_tokens: 500,
      response_format: { type: 'json_object' },
      temperature: 0
    }) as { response: string };

    const fingerprints = JSON.parse(response.response) as string[];

    if (fingerprints.length !== mistakes.length) {
      throw new Error(`[enrichMistakesWithFingerprints] mismatch: expected ${mistakes.length}, got ${fingerprints.length}`);
    }

    return mistakes.map((m, i) => ({ ...m, lemma_fingerprint: fingerprints[i] ?? null }));
  }

  private async persistScorecardToSupabase(
    session_id: number,
    learner_id: number,
    scorecard: Scorecard & { mistakes: (typeof scorecard.mistakes[0] & { lemma_fingerprint?: string })[] }
  ) {
    const { error: scorecardError } = await this.supabaseClient
      .from('learner_scorecards')
      .insert({
        session_id,
        learner_id,
        conversation_difficulty: scorecard.conversationDifficulty,
        language_accuracy: scorecard.languageAccuracy,
      });

    if (scorecardError) {
      console.error('[Supabase] Failed to insert learner_scorecard:', scorecardError);
      return;
    }

    if (!scorecard.mistakes.length) return;

    const enrichedMistakes = scorecard.mistakes.map((m) => ({
      session_id,
      learner_id,
      type: m.type,
      text: m.text,
      correction: m.correction,
      lemma_fingerprint: m.lemma_fingerprint ?? null,
      avg_frequency: m.avg_frequency ?? null,
      trend_arrow: m.trend_arrow ?? null,
      session_frequency_color: m.session_frequency_color ?? null,
    }));

    const { error: mistakesError } = await this.supabaseClient
      .from('learner_mistakes')
      .insert(enrichedMistakes);

    if (mistakesError) {
      console.error('[Supabase] Failed to insert learner_mistakes:', mistakesError);
    }
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}

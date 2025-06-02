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

			console.log(`[ScorecardPersisterDO] Starting persistence for session ${session_id}, learner ${learner_id}`);
			console.log(`[ScorecardPersisterDO] Received ${analyzedMistakes?.length || 0} mistakes, accuracy: ${languageAccuracy}%, difficulty: ${conversationDifficulty}`);

			if (!analyzedMistakes?.length) {
				console.warn(`[ScorecardPersisterDO] WARNING: No analyzed mistakes provided for session ${session_id} - this may indicate detection pipeline failure`);
				return c.json({ error: 'No analyzed mistakes provided' }, 400);
			}

			console.log(`[ScorecardPersisterDO] Inserting scorecard into learner_scorecards table`);
			const { error: scorecardError } = await this.supabaseClient
				.from('learner_scorecards')
				.insert({
					session_id,
					learner_id,
					conversation_difficulty: conversationDifficulty,
					language_accuracy: languageAccuracy
				});

			if (scorecardError) {
				console.error('[ScorecardPersisterDO] CRITICAL ERROR: Failed to insert scorecard:', scorecardError);
				console.error('[ScorecardPersisterDO] Scorecard data:', { session_id, learner_id, conversationDifficulty, languageAccuracy });
				return c.json({ error: 'Scorecard insert failed' }, 500);
			}
			console.log(`[ScorecardPersisterDO] ✅ Scorecard successfully inserted for session ${session_id}`);

			const enrichedMistakes = analyzedMistakes.map(m => ({
				session_id,
				learner_id,
				text: m.text,
				correction: m.correction,
				type: m.type
			}));

			console.log(`[ScorecardPersisterDO] Inserting ${enrichedMistakes.length} mistakes into learner_mistakes table`);
			const { error: mistakesError } = await this.supabaseClient
				.from('learner_mistakes')
				.insert(enrichedMistakes);

			if (mistakesError) {
				console.error('[ScorecardPersisterDO] CRITICAL ERROR: Failed to insert learner_mistakes:', mistakesError);
				console.error('[ScorecardPersisterDO] Mistakes data sample:', enrichedMistakes.slice(0, 3));
				return c.json({ error: 'Mistake insert failed' }, 500);
			}
			console.log(`[ScorecardPersisterDO] ✅ ${enrichedMistakes.length} mistakes successfully inserted`);

			console.log(`[ScorecardPersisterDO] 🎉 Complete persistence success for session ${session_id}`);
			return c.json({ ok: true }, 200);
		});
	}

	async fetch(request: Request) {
		return this.app.fetch(request);
	}
}


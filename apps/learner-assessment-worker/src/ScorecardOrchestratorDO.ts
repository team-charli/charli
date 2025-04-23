//ScorecardOrchestratorDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { DOEnv, Env } from './env';

export class ScorecardOrchestratorDO extends DurableObject<DOEnv> {
	private app = new Hono<DOEnv>();

	constructor(private state: DurableObjectState, private env: Env) {
		super(state, env);
		this.state = state;
		this.env = env;
		this.app.post('/scorecard/:roomId', async (c) => {
			const roomId = c.req.param('roomId');
			const {
				learnerSegments,
				session_id,
				learner_id
			}: {
					learnerSegments: { start: number; text: string }[];
					session_id: number;
					learner_id: number;
				} = await c.req.json();

			const learnerUtterances = learnerSegments.map(s => s.text);
			const fullTranscript = learnerSegments.map(s => `[${s.start.toFixed(2)}] ${s.text}`).join('\n');

			if (!learnerUtterances.length) {
				return c.json({ error: 'No learner utterances provided' }, 400);
			}

			// Detect Mistakes
			const detectorRes = await fetch(this.env.MISTAKE_DETECTOR_URL + '/detect', {
				method: 'POST',
				body: JSON.stringify({ learnerUtterances, fullTranscript }),
				headers: { 'Content-Type': 'application/json' }
			});
			const { mistakes } = await detectorRes.json();

			// Analyze Mistakes
			const analyzerRes = await fetch(this.env.MISTAKE_ANALYZER_URL + '/analyze', {
				method: 'POST',
				body: JSON.stringify({ detectedMistakes: mistakes }),
				headers: { 'Content-Type': 'application/json' }
			});
			const { analyzedMistakes } = await analyzerRes.json();

			// Score Aggregation
			const utteranceCount = learnerUtterances.length;
			const uniqueUtterancesWithErrors = new Set(analyzedMistakes.map(m => m.text)).size;
			const languageAccuracy = Math.round(((utteranceCount - uniqueUtterancesWithErrors) / utteranceCount) * 100);
			const conversationDifficulty = Math.max(2, Math.min(10, Math.ceil(utteranceCount / 4))); // placeholder heuristic

			// Persist
			// Enrich
			const enrichmentRes = await fetch(this.env.MISTAKE_ENRICHER_PIPELINE_DO_URL + '/enrich', {
				method: 'POST',
				body: JSON.stringify({ learner_id, analyzedMistakes }),
				headers: { 'Content-Type': 'application/json' }
			});
			const { enrichedMistakes } = await enrichmentRes.json();

			// Persist
			await fetch(this.env.SCORECARD_PERSISTER_URL + '/persist', {
				method: 'POST',
				body: JSON.stringify({
					session_id,
					learner_id,
					analyzedMistakes: enrichedMistakes,
					conversationDifficulty,
					languageAccuracy
				}),
				headers: { 'Content-Type': 'application/json' }
			});

			return c.json({
				roomId,
				scorecard: {
					conversationDifficulty,
					languageAccuracy,
					mistakes: analyzedMistakes
				}
			}, 200);
		});
	}

	async fetch(request: Request) {
		return this.app.fetch(request);
	}
}


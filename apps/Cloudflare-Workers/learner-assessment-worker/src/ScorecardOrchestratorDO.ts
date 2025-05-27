//ScorecardOrchestratorDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { DOEnv } from './env';

export class ScorecardOrchestratorDO extends DurableObject<DOEnv> {
	private app = new Hono<{ Bindings: DOEnv }>();

	constructor(state: DurableObjectState, env: DOEnv) {
		super(state, env);
		this.app.post('/scorecard/:roomId', async (c) => {
			const roomId = c.req.param('roomId');
			const {
				learnerSegments,
				fullTranscript,
				session_id,
				learner_id
			}: {
				learnerSegments: { start: number; text: string }[];
				fullTranscript: string;
				session_id: number;
				learner_id: number;
			} = await c.req.json();

			const learnerUtterances = learnerSegments.map(s => s.text);
			if (!learnerUtterances.length) {
				return c.json({ error: 'No learner utterances provided' }, 400);
			}

			// Detect Mistakes
			const detectorStub = c.env.MISTAKE_DETECTOR_DO.get(
				c.env.MISTAKE_DETECTOR_DO.idFromName(roomId)
			);
			const detectorRes = await detectorStub.fetch('/detect', {
				method: 'POST',
				body: JSON.stringify({ learnerUtterances, fullTranscript }),
				headers: { 'Content-Type': 'application/json' }
			});
			const { mistakes } = await detectorRes.json() as any;

			// Analyze Mistakes
			const analyzerStub = c.env.MISTAKE_ANALYZER_DO.get(
				c.env.MISTAKE_ANALYZER_DO.idFromName(roomId)
			);
			const analyzerRes = await analyzerStub.fetch('/analyze', {
				method: 'POST',
				body: JSON.stringify({ detectedMistakes: mistakes }),
				headers: { 'Content-Type': 'application/json' }
			});
			const { analyzedMistakes } = await analyzerRes.json() as any;

			// Score Aggregation
			const utteranceCount = learnerUtterances.length;
			const uniqueUtterancesWithErrors = new Set(analyzedMistakes.map((m: any) => m.text)).size;
			const languageAccuracy = Math.round(((utteranceCount - uniqueUtterancesWithErrors) / utteranceCount) * 100);
			const conversationDifficulty = Math.max(2, Math.min(10, Math.ceil(utteranceCount / 4)));

			// Enrich
			const enricherStub = c.env.MISTAKE_ENRICHER_PIPELINE_DO.get(
				c.env.MISTAKE_ENRICHER_PIPELINE_DO.idFromName(roomId)
			);
			const enrichmentRes = await enricherStub.fetch('/enrich', {
				method: 'POST',
				body: JSON.stringify({ learner_id, analyzedMistakes }),
				headers: { 'Content-Type': 'application/json' }
			});
			const { enrichedMistakes } = await enrichmentRes.json() as any;

			// Persist
			const persisterStub = c.env.SCORECARD_PERSISTER_DO.get(
				c.env.SCORECARD_PERSISTER_DO.idFromName(roomId)
			);
			await persisterStub.fetch('/persist', {
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
		return this.app.fetch(request, this.env, {} as ExecutionContext);
	}
}

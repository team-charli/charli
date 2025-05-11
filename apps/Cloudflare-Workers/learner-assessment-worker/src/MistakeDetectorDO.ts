import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

import { morphologyDetectorPrompt } from './Prompts/Detector/morphologyDetectorPrompt';
import { tenseUsageDetectorPrompt } from './Prompts/Detector/tenseUsageDetectorPrompt';
import { vocabularyDetectorPrompt } from './Prompts/Detector/vocabularyDetectorPrompt';
import { grammarStructureDetectorPrompt } from './Prompts/Detector/grammarStructureDetectorPrompt';

export interface DetectedMistake {
	utterance: string;
	mistakenFragment: string;
	suggestedCorrection: string;
	reason: string;
	categoryHint: 'morphology' | 'tense' | 'vocabulary' | 'grammar';
}

export class MistakeDetectorDO extends DurableObject<Env> {
	private app = new Hono();

	constructor(private state: DurableObjectState, private env: Env) {
		super(state, env);

		this.app.post('/detect', async (c) => {
			const { learnerUtterances, fullTranscript }: {
				learnerUtterances: string[];
				fullTranscript: string;
			} = await c.req.json();

			if (!learnerUtterances?.length) {
				return c.json({ error: 'No learner utterances provided' }, 400);
			}

			const detected: DetectedMistake[] = [];

			// Morphology Pass
		{
				const prompt = morphologyDetectorPrompt(learnerUtterances);
				const result = await this.runDetector(prompt);
				detected.push(...result.map(m => ({ ...m, categoryHint: 'morphology' })));
			}

			// Tense Usage Pass (needs full transcript)
		{
				const prompt = tenseUsageDetectorPrompt(fullTranscript);
				const result = await this.runDetector(prompt);
				detected.push(...result.map(m => ({ ...m, categoryHint: 'tense' })));
			}

			// Vocabulary Pass
		{
				const prompt = vocabularyDetectorPrompt(fullTranscript);
				const result = await this.runDetector(prompt);
				detected.push(...result.map(m => ({ ...m, categoryHint: 'vocabulary' })));
			}

			// Grammar Structure Pass
		{
				const prompt = grammarStructureDetectorPrompt(fullTranscript);
				const result = await this.runDetector(prompt);
				detected.push(...result.map(m => ({ ...m, categoryHint: 'grammar' })));
			}

			return c.json({ mistakes: detected }, 200);
		});
	}

	private async runDetector(prompt: string): Promise<Omit<DetectedMistake, 'categoryHint'>[]> {
		const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
			messages: [
				{ role: 'system', content: 'You are a Spanish mistake detector.' },
				{ role: 'user', content: prompt }
			],
			max_tokens: 1000,
			response_format: { type: 'json_object' },
			temperature: 0.2,
		}) as { response: string };

		try {
			const parsed = JSON.parse(response.response);
			return Array.isArray(parsed) ? parsed : [];
		} catch (err) {
			console.error('[MistakeDetectorDO] Failed to parse detector response:', err);
			return [];
		}
	}

	async fetch(request: Request) {
		return this.app.fetch(request);
	}
}


import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

import { SPANISH_ERROR_CLASSES } from './SPANISH_ERROR_CLASSES';
import { vocabularyAnalyzerPrompt } from './Prompts/Analyzer/vocabularyAnalyzerPrompt';
import { tenseUsageAnalyzerPrompt } from './Prompts/Analyzer/tenseUsageAnalyzerPrompt';
import { morphologyAnalyzerPrompt } from './Prompts/Analyzer/morphologyAnalyzerPrompt';
import { grammarStructureAnalyzerPrompt } from './Prompts/Analyzer/grammarStructureAnalyzerPrompt';

export interface DetectedMistake {
utterance: string;
mistakenFragment: string;
suggestedCorrection: string;
reason: string;
categoryHint: string;
}

export interface AnalyzedMistake {
text: string;
correction: string;
type: string; // Must match SPANISH_ERROR_CLASSES
}

export class MistakeAnalyzerDO extends DurableObject {
private app = new Hono();

constructor(private state: DurableObjectState, private env: Env) {
super(state, env);

this.app.post('/analyze', async (c) => {
  const { detectedMistakes }: { detectedMistakes: DetectedMistake[] } = await c.req.json();

  if (!Array.isArray(detectedMistakes) || detectedMistakes.length === 0) {
    return c.json({ error: 'No detected mistakes provided' }, 400);
  }

  const grouped: Record<string, DetectedMistake[]> = {};
  for (const mistake of detectedMistakes) {
    const key = mistake.categoryHint ?? 'generic';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(mistake);
  }

  const allAnalyzed: AnalyzedMistake[] = [];

  for (const [category, mistakes] of Object.entries(grouped)) {
    let prompt = '';
    switch (category) {
      case 'vocabulary':
        prompt = vocabularyAnalyzerPrompt(mistakes);
        break;
      case 'tense':
        prompt = tenseUsageAnalyzerPrompt(mistakes);
        break;
      case 'morphology':
        prompt = morphologyAnalyzerPrompt(mistakes);
        break;
      case 'grammar':
        prompt = grammarStructureAnalyzerPrompt(mistakes);
        break;
      default:
        console.warn(`[MistakeAnalyzerDO] Unknown category: ${category}. Skipping.`);
        continue;
    }

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are a Spanish grammar assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }) as { response: string };

    try {
      const analyzed = JSON.parse(response.response) as AnalyzedMistake[];
      const invalidTypes = analyzed.filter(m => !SPANISH_ERROR_CLASSES.includes(m.type));
      if (invalidTypes.length > 0) {
        console.warn('[MistakeAnalyzerDO] Found invalid types:', invalidTypes.map(m => m.type));
      }
      allAnalyzed.push(...analyzed);
    } catch (err) {
      console.error(`[MistakeAnalyzerDO] Failed to parse analyzer response for ${category}:`, err);
    }
  }

  return c.json({ analyzedMistakes: allAnalyzed }, 200);
});

}

async fetch(request: Request) {
return this.app.fetch(request);
}
}

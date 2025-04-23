import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

import { SPANISH_ERROR_CLASSES } from './SPANISH_ERROR_CLASSES';

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

export class MistakeAnalyzerDO extends DurableObject<Env> {
  private app = new Hono();

  constructor(private state: DurableObjectState, private env: Env) {
    super(state, env);

    this.app.post('/analyze', async (c) => {
      const { detectedMistakes }: { detectedMistakes: DetectedMistake[] } = await c.req.json();

      if (!Array.isArray(detectedMistakes) || detectedMistakes.length === 0) {
        return c.json({ error: 'No detected mistakes provided' }, 400);
      }

      const prompt = this.buildPrompt(detectedMistakes);
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

        return c.json({ analyzedMistakes: analyzed }, 200);
      } catch (err) {
        console.error('[MistakeAnalyzerDO] Failed to parse analyzer output:', err);
        return c.json({ error: 'Analyzer response could not be parsed' }, 500);
      }
    });
  }

  private buildPrompt(mistakes: DetectedMistake[]): string {
    const mistakeList = mistakes.map((m, i) => `Mistake ${i + 1}:
- Learner sentence: "${m.utterance}"
- Mistaken phrase: "${m.mistakenFragment}"
- Suggested correction: "${m.suggestedCorrection}"
- Reason: ${m.reason}`).join('\n\n');

    return `
For each mistake below, rewrite the learner's sentence by fixing only the specified fragment.
Return one JSON entry per mistake using this format:
{
  "text": "<original sentence>",
  "correction": "<corrected sentence with one fix>",
  "type": "<canonical error type from list>"
}

Choose the "type" value from the following list:

${SPANISH_ERROR_CLASSES.map(t => `- "${t}"`).join('\n')}

Return an array like:

[
  { "text": "...", "correction": "...", "type": "..." },
  ...
]

Do not compress multiple fixes. Return one object per individual error.

---

${mistakeList}
`;
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}


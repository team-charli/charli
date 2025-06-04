import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';
import { callWithRetry } from './lib/aiGateway';

import { lemmaFingerprintPrompt } from './Prompts/Enrichments/lemmaFingerprintPrompt';

export interface AnalyzedMistake {
  text: string;
  correction: string;
  type: string;
  lemma_fingerprint?: string;
}

export class LemmaEnricherDO extends DurableObject<Env> {
  private app = new Hono();

  constructor(private state: DurableObjectState, protected env: Env) {
    super(state, env);

    this.app.post('/enrich', async (c) => {
      const { analyzedMistakes }: { analyzedMistakes: AnalyzedMistake[] } = await c.req.json();

      if (!Array.isArray(analyzedMistakes) || analyzedMistakes.length === 0) {
        return c.json({ error: 'No mistakes provided' }, 400);
      }

      const prompt = lemmaFingerprintPrompt(analyzedMistakes);
      
      console.log(`🎯 [LEMMA-ENRICHER] 🚀 Starting AI Gateway call to @cf/meta/llama-3.1-8b-instruct`);
      console.log(`🎯 [LEMMA-ENRICHER] Processing ${analyzedMistakes.length} mistakes, prompt length: ${prompt.length} characters`);
      
      let response;
      try {
        response = await callWithRetry(
          '@cf/meta/llama-3.1-8b-instruct',
          {
            messages: [
              { role: 'system', content: 'You are a Spanish grammar enrichment assistant.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 1000,
            response_format: { type: 'json_object' },
            temperature: 0
          },
          this.env
        ) as { response: string };
        console.log(`🎯 [LEMMA-ENRICHER] ✅ AI Gateway call successful`);
        console.log(`🎯 [LEMMA-ENRICHER] Response type: ${typeof response}, keys: ${Object.keys(response || {}).join(', ')}`);
      } catch (error) {
        console.error(`🎯 [LEMMA-ENRICHER] ❌ CRITICAL: AI Gateway call failed:`, error);
        console.error(`🎯 [LEMMA-ENRICHER] Error type: ${typeof error}`);
        console.error(`🎯 [LEMMA-ENRICHER] Error message: ${error?.message || 'Unknown error'}`);
        console.error(`🎯 [LEMMA-ENRICHER] Error stack: ${error?.stack || 'No stack trace'}`);
        
        // Check for authentication errors specifically
        if (error?.message?.includes('401') || error?.message?.includes('Unauthorized') || error?.message?.includes('Authentication')) {
          console.error(`🎯 [LEMMA-ENRICHER] 🚨 AUTHENTICATION ERROR DETECTED - This is likely the root cause of scorecard: null!`);
          console.error(`🎯 [LEMMA-ENRICHER] Check CLOUDFLARE_API_TOKEN environment variable and AI Gateway configuration`);
        }
        
        return c.json({ error: 'Lemma enrichment failed due to AI Gateway error', details: error?.message }, 500);
      }

      try {
        if (!response?.response) {
          console.error(`🎯 [LEMMA-ENRICHER] ❌ CRITICAL: Empty or malformed response from AI Gateway:`, response);
          return c.json({ error: 'Empty response from AI Gateway' }, 500);
        }
        
        console.log(`🎯 [LEMMA-ENRICHER] Response content length: ${response.response.length} characters`);
        const fingerprints = JSON.parse(response.response) as string[];
        console.log(`🎯 [LEMMA-ENRICHER] ✅ Response parsed successfully, result type: ${typeof fingerprints}, is array: ${Array.isArray(fingerprints)}, length: ${fingerprints.length}`);

        if (fingerprints.length !== analyzedMistakes.length) {
          console.error(`🎯 [LEMMA-ENRICHER] ❌ CRITICAL: Length mismatch - expected ${analyzedMistakes.length}, got ${fingerprints.length}`);
          throw new Error(`[LemmaEnricherDO] mismatch: expected ${analyzedMistakes.length}, got ${fingerprints.length}`);
        }

        const enriched = analyzedMistakes.map((m, i) => ({
          ...m,
          lemma_fingerprint: fingerprints[i] ?? null
        }));

        console.log(`🎯 [LEMMA-ENRICHER] ✅ Successfully enriched ${enriched.length} mistakes`);
        return c.json({ enrichedMistakes: enriched }, 200);
      } catch (err) {
        console.error(`🎯 [LEMMA-ENRICHER] ❌ CRITICAL: Failed to parse LLM output:`, err);
        console.error(`🎯 [LEMMA-ENRICHER] Raw response that failed to parse:`, response?.response);
        return c.json({ error: 'Fingerprint enrichment failed', details: err?.message }, 500);
      }
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}


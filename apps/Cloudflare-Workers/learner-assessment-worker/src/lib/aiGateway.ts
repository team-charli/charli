import { Env } from '../env';

/**
 * Call Workers AI through AI Gateway using the correct binding approach
 * Based on actual Cloudflare documentation: use env.AI.run() with gateway parameter
 */
export async function callGateway(
  model: string,
  body: Record<string, unknown>,
  env: Env,
  headers: HeadersInit = {},
  opts: RequestInit = {}
) {
  console.log(`🎯 [AI-GATEWAY] 🚀 Starting AI Gateway call to ${model}`);
  
  if (!env.AI) {
    console.error(`🎯 [AI-GATEWAY] ❌ CRITICAL: AI binding not available`);
    console.error(`🎯 [AI-GATEWAY] This indicates the ai binding is not properly configured in wrangler.jsonc`);
    throw new Error('AI binding not available - check wrangler.jsonc configuration');
  }
  
  try {
    // Use the AI binding with gateway parameter - this is the correct approach per Cloudflare docs
    const response = await env.AI.run(
      model,
      {
        messages: body.messages,
        max_tokens: body.max_tokens,
        temperature: body.temperature,
        response_format: body.response_format,
        // Spread any additional parameters from the original body
        ...body
      },
      {
        // This routes the request through AI Gateway for analytics/monitoring
        gateway: { id: "charli-user-scorecards" }
      }
    );

    console.log(`🎯 [AI-GATEWAY] ✅ AI Gateway call successful via AI binding`);
    console.log(`🎯 [AI-GATEWAY] Response type: ${typeof response}, keys: ${Object.keys(response || {}).join(', ')}`);
    
    return response;
  } catch (error) {
    console.error(`🎯 [AI-GATEWAY] ❌ CRITICAL: AI Gateway call failed:`, error);
    console.error(`🎯 [AI-GATEWAY] Error type: ${typeof error}`);
    console.error(`🎯 [AI-GATEWAY] Error message: ${error?.message || 'Unknown error'}`);
    console.error(`🎯 [AI-GATEWAY] Error stack: ${error?.stack || 'No stack trace'}`);
    console.error(`🎯 [AI-GATEWAY] Model: ${model}`);
    
    // Log binding availability for debugging
    console.error(`🎯 [AI-GATEWAY] AI binding available: ${!!env.AI}`);
    
    // Check if this is an authentication error that would cause scorecard: null
    if (error?.message?.includes('401') || error?.message?.includes('Unauthorized') || error?.message?.includes('Authentication')) {
      console.error(`🎯 [AI-GATEWAY] 🚨 AUTHENTICATION ERROR - This is likely the root cause of scorecard: null!`);
      console.error(`🎯 [AI-GATEWAY] Check AI binding configuration and gateway permissions`);
    }
    
    throw new Error(`AI Gateway call ${model} failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Call Workers AI through AI Gateway with retry logic using correct binding approach
 */
export async function callWithRetry(
  model: string,
  payload: Record<string, unknown>,
  env: Env,
  retries = 3,
  headers: HeadersInit = {},
  opts: RequestInit = {}
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await callGateway(model, payload, env, headers, opts);
    } catch (e: any) {
      if (e.message.includes("429") && i < retries - 1) {
        console.log(`🎯 [AI-GATEWAY] Rate limited, retrying in ${2 ** i * 500}ms...`);
        await new Promise(r => setTimeout(r, 2 ** i * 500));
        continue;
      }
      console.error(`🎯 [AI-GATEWAY] Retry ${i + 1}/${retries} failed:`, e.message);
      throw e;
    }
  }
}
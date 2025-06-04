import { Env } from '../env';

export async function callGateway(
  model: string,
  body: Record<string, unknown>,
  env: Env,
  headers: HeadersInit = {},
  opts: RequestInit = {}
) {
  const url = `${env.AI_GATEWAY_URL}${model}`;
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };
  
  // For Workers AI through AI Gateway, we need a Cloudflare API token with Workers AI permissions
  // The AI_GATEWAY_AUTH_TOKEN is for gateway analytics, not for actual AI model access
  if (env.CLOUDFLARE_API_TOKEN) {
    requestHeaders["Authorization"] = `Bearer ${env.CLOUDFLARE_API_TOKEN}`;
  } else {
    throw new Error('CLOUDFLARE_API_TOKEN is required for Workers AI access through AI Gateway');
  }
  
  const res = await fetch(url, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body),
    ...opts,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`🎯 [AI-GATEWAY] ❌ CRITICAL: AI Gateway call failed`);
    console.error(`🎯 [AI-GATEWAY] Model: ${model}`);
    console.error(`🎯 [AI-GATEWAY] Status: ${res.status} ${res.statusText}`);
    console.error(`🎯 [AI-GATEWAY] Response: ${text}`);
    console.error(`🎯 [AI-GATEWAY] Request URL: ${url}`);
    console.error(`🎯 [AI-GATEWAY] Request headers: ${JSON.stringify(requestHeaders)}`);
    
    if (res.status === 401) {
      console.error(`🎯 [AI-GATEWAY] 🚨 AUTHENTICATION ERROR (401) - This is the root cause of scorecard: null!`);
      console.error(`🎯 [AI-GATEWAY] Check CLOUDFLARE_API_TOKEN environment variable has Workers AI permissions`);
      console.error(`🎯 [AI-GATEWAY] Current token starts with: ${env.CLOUDFLARE_API_TOKEN ? env.CLOUDFLARE_API_TOKEN.substring(0, 10) + '...' : 'NOT SET'}`);
    }
    
    throw new Error(`AI Gateway ${model} ${res.status}: ${text}`);
  }
  return res.json<any>();
}

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
        await new Promise(r => setTimeout(r, 2 ** i * 500));
        continue;
      }
      throw e;
    }
  }
}
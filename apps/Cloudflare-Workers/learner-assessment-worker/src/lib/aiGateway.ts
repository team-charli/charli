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
    "cf-aig-authorization": `Bearer ${env.AI_GATEWAY_AUTH_TOKEN}`,
    ...headers,
  };
  
  // Add Cloudflare API token if available for Workers AI access
  if (env.CLOUDFLARE_API_TOKEN) {
    requestHeaders["Authorization"] = `Bearer ${env.CLOUDFLARE_API_TOKEN}`;
  }
  
  const res = await fetch(url, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body),
    ...opts,
  });

  if (!res.ok) {
    const text = await res.text();
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
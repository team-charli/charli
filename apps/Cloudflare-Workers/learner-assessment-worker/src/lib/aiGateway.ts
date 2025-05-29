export async function callGateway(
  model: string,
  body: Record<string, unknown>,
  env: Env,
  headers: HeadersInit = {},
  opts: RequestInit = {}
) {
  const url = `${env.AI_GATEWAY_URL}/${model}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.AI_GATEWAY_AUTH_TOKEN}`,
      ...headers,
    },
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
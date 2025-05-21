import { DurableObjectNamespace } from "@cloudflare/workers-types";
import { Fetcher } from "@cloudflare/workers-types";

export interface Env {
  // Durable Objects
  LEARNER_ASSESSMENT_DO: DurableObjectNamespace;
  MESSAGE_RELAY_DO: DurableObjectNamespace;

  // Optional external services
  PCM_TO_WAV_WORKER?: Fetcher;
  WORKERS_AI?: Fetcher;

  // Optional API keys
  MELLOTTS_API_KEY?: string;
  OPENAI_API_KEY?: string;

  // Workers AI binding
  AI: Ai;

  [key: string]: unknown; // still needed for Hono compatibility
}

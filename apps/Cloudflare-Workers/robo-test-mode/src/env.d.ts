import { DurableObjectNamespace } from "@cloudflare/workers-types";
import { Fetcher } from "@cloudflare/workers-types";

export interface Env {
  // Durable Objects
  LEARNER_ASSESSMENT_DO: DurableObjectNamespace;
  MESSAGE_RELAY_DO: DurableObjectNamespace;
  ROBO_TEST_DO: DurableObjectNamespace;
  ELEVEN_API_KEY: string;
  // Optional external services
  PCM_TO_WAV_WORKER?: Fetcher;
  WORKERS_AI?: Fetcher;
  ROBO_TEST_DO: DurableObjectNamespace;

  // Workers AI binding
  AI: Ai;

  [key: string]: unknown; // still needed for Hono compatibility
}

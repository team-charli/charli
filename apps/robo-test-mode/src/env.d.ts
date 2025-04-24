import { DurableObjectNamespace } from "@cloudflare/workers-types";
import { Fetcher } from "@cloudflare/workers-types";

// Base bindings interface
export interface Bindings {
  // Service Bindings
  LEARNER_ASSESSMENT_DO: DurableObjectNamespace;

  // Optional external services
  PCM_TO_WAV_WORKER?: Fetcher;
  WORKERS_AI?: Fetcher;

  // Optional API keys
  MELLOTTS_API_KEY?: string;
  OPENAI_API_KEY?: string;

  [key: string]: unknown; // required for Hono compatibility
}

// Used by Hono app and DOs
export interface Env {
  Bindings: Bindings;
	AI: Ai;

}

// For DurableObjects (optional if you don’t alias)
export interface DOEnv extends Bindings {}

// Optional test integration
declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

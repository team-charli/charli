///Users/zm/Projects/charli/apps/session-time-tracker/src/env.d.ts
import { Fetcher } from "@cloudflare/workers-types";
import { DurableObjectNamespace } from "@cloudflare/workers-types/experimental";

// The base interface for bindings
export interface Bindings {
  HUDDLE_API_KEY: string;
  SESSION_MANAGER: DurableObjectNamespace;
  MESSAGE_RELAY: DurableObjectNamespace;
  CONNECTION_MANAGER: DurableObjectNamespace;
  SESSION_TIMER: DurableObjectNamespace;
  WORKER: Fetcher;
  PRIVATE_KEY_FINALIZE_EDGE: string;
  [key: string]: unknown;  // Add index signature for Hono compatibility
  PINATA_API_KEY: string;
  PINATA_JWT: string;
  PINATA_SECRET_API_KEY: string;
  EXECUTE_FINALIZE_ACTION_URL: string;
  PROVIDER_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// For Hono
export interface Env {
  Bindings: Bindings;
}

// For DurableObjects
export interface DOEnv extends Bindings {}

// tests/env.d.ts remains the same
declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

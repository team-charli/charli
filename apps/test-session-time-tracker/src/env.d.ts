///Users/zm/Projects/charli/apps/session-time-tracker/src/env.d.ts
import { Fetcher } from "@cloudflare/workers-types";
import { DurableObjectNamespace } from "@cloudflare/workers-types/experimental";
import { Hono } from "hono";

export interface Env {
  SESSION_MANAGER: DurableObjectNamespace;
  CONNECTION_MANAGER: DurableObjectNamespace;
  SESSION_TIMER: DurableObjectNamespace;
  MESSAGE_RELAY: DurableObjectNamespace;
  WORKER: Fetcher ;
  HUDDLE_API_KEY: string;
  PRIVATE_KEY_SESSION_TIME_SIGNER: string;
}

// tests/env.d.ts
declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

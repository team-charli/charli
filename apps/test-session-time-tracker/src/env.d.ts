///Users/zm/Projects/charli/apps/session-time-tracker/src/env.d.ts
import { DurableObjectNamespace } from "@cloudflare/workers-types/experimental";

export interface Env {
  WEBSOCKET_MANAGER: DurableObjectNamespace;
  CONNECTION_MANAGER: DurableObjectNamespace;
  SESSION_TIMER: DurableObjectNamespace;
  HUDDLE_API_KEY: string;
  PRIVATE_KEY_SESSION_TIME_SIGNER: string;
}

// tests/env.d.ts
declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

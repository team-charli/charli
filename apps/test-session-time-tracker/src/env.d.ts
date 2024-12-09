///Users/zm/Projects/charli/apps/session-time-tracker/src/env.d.ts
import { Fetcher } from "@cloudflare/workers-types";
import { DurableObjectNamespace } from "@cloudflare/workers-types/experimental";
import { Hono } from "hono";
import { SessionManager } from "./sessionManager";
import { ConnectionManager } from "./connectionManager";
import { SessionTimer } from "./sessionTimer";
import { MessageRelay } from "./messageRelay";

// The base interface for bindings
export interface Bindings {
  TEST_HUDDLE_API_KEY: string;
  SESSION_MANAGER: DurableObjectNamespace;
  MESSAGE_RELAY: DurableObjectNamespace;
  CONNECTION_MANAGER: DurableObjectNamespace;
  SESSION_TIMER: DurableObjectNamespace;
  WORKER: Fetcher;
  PRIVATE_KEY_SESSION_TIME_SIGNER: string;
  [key: string]: unknown;  // Add index signature for Hono compatibility

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

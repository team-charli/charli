// apps/Cloudflare-Workers/hey-charli-worker/src/env.d.ts
import { DurableObjectNamespace } from '@cloudflare/workers-types';
import { Ai } from '@cloudflare/ai';

export interface Bindings {
  AI: Ai;
  HEY_CHARLI_DO: DurableObjectNamespace;   // stub for other Workers
  [key: string]: unknown;                  // allow Hono.extend
}

export interface Env {
  Bindings: Bindings;
}

export interface DOEnv extends Bindings {}

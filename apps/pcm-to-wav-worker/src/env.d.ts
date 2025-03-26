// apps/pcm-to-wav-worker/src/env.ts
export interface Env {
  DEBUG_KV: KVNamespace;
  AUDIO_BUCKET: R2Bucket;
}

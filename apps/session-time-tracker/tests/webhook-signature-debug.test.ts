// test/webhook-id-required-debug.test.ts
import { describe, it, expect } from 'vitest';
import { SELF, env } from "cloudflare:test";

const encoder = new TextEncoder();

async function asyncGenerateHmac(alg: string, message: string, secretKey: string) {
  const keyData = encoder.encode(secretKey);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: alg }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Buffer.from(signature).toString("hex");
}

async function generateSignature(data: any, apiKey: string) {
  if (!data.id) {
    data.id = crypto.randomUUID();
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const hashPayload = `${data.id}.${timestamp}.${JSON.stringify(data)}`;
  const hmac = await asyncGenerateHmac('SHA-256', hashPayload, apiKey);
  return `t=${timestamp},sha256=${hmac}`;
}

describe("Webhook ID Required Debug Test", () => {
  const apiKey = env.TEST_HUDDLE_API_KEY || "test-api-key";

  it("should not fail with Invalid headers when id is at top-level", async () => {
    const eventData = {
      id: crypto.randomUUID(), // top-level id required
      event: 'peer:joined',
      payload: [{
        data: {
          id: "test-peer-1",
          sessionId: "test-session",
          roomId: "test-room-1",
          joinedAt: Date.now(),
          metadata: JSON.stringify({ hashedAddress: "0x1234", role: "teacher" })
        }
      }]
    };

    const signatureHeader = await generateSignature(eventData, apiKey);

    const resp = await SELF.fetch("https://example.com/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "huddle01-signature": signatureHeader
      },
      body: JSON.stringify(eventData)
    });

    expect(resp.status).toBe(200);
    const text = await resp.text();
    expect(text).toContain("Webhook processed successfully");
  });
});

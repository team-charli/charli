//edge-function-integration.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { env, SELF, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { hexToBytes, toHex } from "ethereum-cryptography/utils";
import { keccak256 } from "ethereum-cryptography/keccak";

// We'll need subtle crypto and text encoding for HMAC generation
// Assuming crypto is available in the test environment as per cloudflare:test
const encoder = new TextEncoder();

// Helper function based on the WebhookReceiver logic you provided
async function asyncGenerateHmac(alg: string, message: string, secretKey: string) {
  const keyData = encoder.encode(secretKey);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: alg },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign( "HMAC", key, encoder.encode(message));
  return Buffer.from(signature).toString("hex");
}

async function generateSignature(data: any, apiKey: string) {
  // WebhookReceiver expects data.id to exist
  if (!data.id) {
    data.id = crypto.randomUUID();
  }

  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  const hashPayload = `${data.id}.${timestamp}.${JSON.stringify(data)}`;

  // Always using sha256 as per the snippet from the WebhookReceiver code
  const hmac = await asyncGenerateHmac('SHA-256', hashPayload, apiKey);
  // Format: t=<timestamp>,sha256=<hmac>
  return `t=${timestamp},sha256=${hmac}`;
}

describe("Edge Function Integration Tests", () => {
  let roomId: string;
  let teacherAddress: string;
  let learnerAddress: string;
  let teacherHash: string;
  let learnerHash: string;
  const duration = 3600000; // 1 hour
  const apiKey = env.TEST_HUDDLE_API_KEY || "test-api-key";
  let ws: WebSocket | undefined;
  const SUPABASE_TEST_URL = 'http://localhost:54321/functions/v1/test-finalize';

  async function cleanup() {
    if (ws) {
      ws.close();
      ws = undefined;
    }

    // Clean all DO storages
    const stubs = {
      sessionTimer: env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId)),
      connectionManager: env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId)),
      sessionManager: env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId)),
      messageRelay: env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId))
    };

    for (const stub of Object.values(stubs).reverse()) {
      try {
        await runDurableObjectAlarm(stub);
        await runInDurableObject(stub, async (instance, state) => {
          await state.storage.deleteAll();
          await state.storage.deleteAlarm();
        });
      } catch (e) {
        // ignore cleanup errors
      } finally {
        stub[Symbol.dispose]?.();
      }
    }
  }

  beforeEach(() => {
    const testId = crypto.randomUUID();
    roomId = `room-${testId}`;
    teacherAddress = `0x${testId.slice(0, 8)}`;
    learnerAddress = `0x${testId.slice(24, 32)}`;
    teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
    learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));
  });

  beforeEach(async () => {
    await cleanup();
    const originalFetch = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: RequestInfo, init?: RequestInit) => {
      const url = input.toString();
      if (url.includes('execute-finalize-action')) {
        const newUrl = url.replace('execute-finalize-action', 'test-finalize');
        return originalFetch(newUrl, init);
      }
      return originalFetch(input, init);
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  async function establishWebSocket() {
    // Establish WebSocket connection via main worker
    const resp = await SELF.fetch(`https://example.com/connect/${roomId}`, {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    });
    expect(resp.status).toBe(101);
    ws = resp.webSocket!;
    ws.accept();
    const messages: any[] = [];
    ws.addEventListener('message', (evt) => {
      messages.push(JSON.parse(evt.data));
    });
    return messages;
  }

  async function initSession(userAddress: string) {
    const initResp = await SELF.fetch("https://example.com/init", {
      method: "POST",
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress,
        sessionDuration: duration
      })
    });
    expect(initResp.ok).toBe(true);
    return initResp.json();
  }

  async function sendWebhook(event: string, payloadData: any) {
    // Build the event data
    const data = { event, payload: [ { data: payloadData } ] };
    const signatureHeader = await generateSignature(data, apiKey);

    const resp = await SELF.fetch("https://example.com/webhook", {
      method: "POST",
      headers: {
        "huddle01-signature": signatureHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    expect(resp.ok).toBe(true);
  }
  describe("Full Session Completion (Non-Fault)", () => {
    it("Complete successful session with IPFS posting and broadcast ipfs id", async () => {
      const messages = await establishWebSocket();
      // Init session for both teacher and learner
      await initSession(teacherAddress);
      await initSession(learnerAddress);

      // Simulate both users joined
      await sendWebhook('peer:joined', {
        id: 'teacher-peer',
        sessionId: 'test-session',
        roomId,
        joinedAt: Date.now(),
        metadata: JSON.stringify({hashedAddress: teacherHash, role: 'teacher'})
      });

      await sendWebhook('peer:joined', {
        id: 'learner-peer',
        sessionId: 'test-session',
        roomId,
        joinedAt: Date.now() + 1000,
        metadata: JSON.stringify({hashedAddress: learnerHash, role: 'learner'})
      });

      // Let the session fully expire
      const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
      await runDurableObjectAlarm(sessionTimerStub);  // joinWindow → warning
      await runDurableObjectAlarm(sessionTimerStub);  // warning → expiration
      await runDurableObjectAlarm(sessionTimerStub);  // expiration → finalizeSession

      await new Promise(r => setTimeout(r, 300));

      console.log("messages", messages);
      const finalizedMsg = messages.find(m => m.type === 'finalized');
      expect(finalizedMsg).toBeDefined();
      expect(finalizedMsg.data.status).toBe('success');
      expect(finalizedMsg.data.ipfsHash).toBeDefined();

      const connectionManagerStub = env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId));
      const storageAfter = await runInDurableObject(connectionManagerStub, async (_, state) => {
        const entries = await state.storage.list();
        console.log("entries", entries);
        return Array.from(entries);
      });
      expect(storageAfter.length).toBe(0);
    });

    it.only("gets success response from test-finalize Edge Function", async () => {
      const messages = await establishWebSocket();
      await initSession(teacherAddress);
      await initSession(learnerAddress);

      await sendWebhook('peer:joined', {
        id: 'teacher-peer',
        sessionId: 'test-session',
        roomId,
        joinedAt: Date.now(),
        metadata: JSON.stringify({hashedAddress: teacherHash, role: 'teacher'})
      });

      await sendWebhook('peer:joined', {
        id: 'learner-peer',
        sessionId: 'test-session',
        roomId,
        joinedAt: Date.now() + 1000,
        metadata: JSON.stringify({hashedAddress: learnerHash, role: 'learner'})
      });

      const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
      await runDurableObjectAlarm(sessionTimerStub);
      await runDurableObjectAlarm(sessionTimerStub);
      await runDurableObjectAlarm(sessionTimerStub);

      await new Promise(r => setTimeout(r, 300));

      const finalizedMsg = messages.find(m => m.type === 'finalized');
      expect(finalizedMsg).toBeDefined();

      console.log("finalizedMsg", finalizedMsg);
      // Verify the Edge Function response structure in litActionResult
      expect(finalizedMsg.data.litActionResult).toMatchObject({
        reconstructedSessionCID: expect.any(String),
        workerPinnedSessionCID: expect.any(String)
      });

      // Verify litActionIpfsHash matches the ipfsHash from Pinata
      expect(finalizedMsg.data.litActionResult.reconstructedSessionCID).toBe(finalizedMsg.data.litActionResult.workerPinnedSessionCID);
    });
  })
})

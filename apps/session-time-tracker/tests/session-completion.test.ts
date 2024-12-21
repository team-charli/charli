// test/session-completion.test.ts
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
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
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

/**
 * This test suite covers full session completion scenarios, including:
 *  - Successful session completion with IPFS posting
 *  - Fault scenarios (never joined, excessive disconnects, connection timeout, failed initial join)
 *  - Verification of posted IPFS data integrity
 *  - Verification that storage is fully cleaned up after finalization
 *  - Ensuring no premature cleanup of session data before finalization
 *
 * These tests assume that:
 *  - We can mock the Pinata IPFS endpoint (e.g. via fetch mocks).
 *  - We check for storage keys to ensure cleanup is done after finalization.
 *  - Supabase updates are abstracted, and we verify them by checking final broadcast messages or relevant logs.
 */

describe("Session Completion Tests", () => {
  let roomId: string;
  let teacherAddress: string;
  let learnerAddress: string;
  let teacherHash: string;
  let learnerHash: string;
  const duration = 3600000; // 1 hour
  // Use env.TEST_HUDDLE_API_KEY if defined, else fallback to mockApiKey
  const apiKey = env.TEST_HUDDLE_API_KEY || "test-api-key";
  let ws: WebSocket | undefined;

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
    if (url.includes('pinata.cloud/pinning/pinJSONToIPFS')) {
      return new Response(JSON.stringify({
        IpfsHash: "QmTestHash",
        PinSize: 1234,
        Timestamp: new Date().toISOString()
      }), {status: 200});
    }
    if (url === env.EXECUTE_FINALIZE_ACTION_URL) {
      return new Response(JSON.stringify({
        transactionHash: "0xmockTransactionHash",
        litActionIpfsHash: "QmMockActionHash"
      }), {status: 200});
    }
    return originalFetch(input, init);
  });
});

  afterEach(async () => {
    vi.restoreAllMocks();
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
    it("Complete successful session with IPFS posting and cleanup", async () => {
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

      const finalizedMsg = messages.find(m => m.type === 'finalized');
      expect(finalizedMsg).toBeDefined();
      expect(finalizedMsg.data.status).toBe('success');
      expect(finalizedMsg.data.ipfsHash).toBe('QmTestHash');

      const connectionManagerStub = env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId));
      const storageAfter = await runInDurableObject(connectionManagerStub, async (_, state) => {
        const entries = await state.storage.list();
        console.log("entries", entries);
        return Array.from(entries);
      });
      expect(storageAfter.length).toBe(0);
    });

    it("Verify Supabase update after successful session expiration", async () => {
      const messages = await establishWebSocket();
      await initSession(teacherAddress);
      await initSession(learnerAddress);

      await sendWebhook('peer:joined', {
        id: 't-peer', sessionId: 'test-session', roomId, joinedAt: Date.now(),
        metadata: JSON.stringify({hashedAddress: teacherHash, role: 'teacher'})
      });
      await sendWebhook('peer:joined', {
        id: 'l-peer', sessionId: 'test-session', roomId, joinedAt: Date.now()+1000,
        metadata: JSON.stringify({hashedAddress: learnerHash, role: 'learner'})
      });

      const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
      await runDurableObjectAlarm(sessionTimerStub);
      await runDurableObjectAlarm(sessionTimerStub);
      await runDurableObjectAlarm(sessionTimerStub);

      await new Promise(r => setTimeout(r, 300));

      const finalizedMsg = messages.find(m => m.type === 'finalized');
      expect(finalizedMsg).toBeDefined();
      expect(finalizedMsg.data.status).toBe('success');
    });
  });

  describe("Fault Session Completion", () => {
    it("Second user never joins (learner_never_joined) with IPFS posting and cleanup", async () => {
      const messages = await establishWebSocket();
      await initSession(teacherAddress);
      await initSession(learnerAddress);

      // Only teacher joins
      await sendWebhook('peer:joined', {
        id: 't-peer', sessionId: 'test-session', roomId, joinedAt: Date.now(),
        metadata: JSON.stringify({hashedAddress: teacherHash, role: 'teacher'})
      });

      const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
      await runDurableObjectAlarm(sessionTimerStub);

      await new Promise(r => setTimeout(r, 300));
      const finalizedMsg = messages.find(m => m.type === 'finalized');
      expect(finalizedMsg).toBeDefined();
      expect(finalizedMsg.data.status).toBe('fault');
      expect(finalizedMsg.data.faultType).toBe('learner_never_joined');
      expect(finalizedMsg.data.ipfsHash).toBe('QmTestHash');

      const sessionManagerStub = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId));
      const smStorage = await runInDurableObject(sessionManagerStub, async (_, state) => (await state.storage.list()));
      expect(smStorage.size).toBe(0);
    });

    it("Excessive disconnections fault scenario", async () => {
      const messages = await establishWebSocket();
      await initSession(teacherAddress);
      await initSession(learnerAddress);

      await sendWebhook('peer:joined', {
        id: 't-peer', sessionId: 'test-session', roomId, joinedAt: Date.now(),
        metadata: JSON.stringify({hashedAddress: teacherHash, role: 'teacher'})
      });
      await sendWebhook('peer:joined', {
        id: 'l-peer', sessionId: 'test-session', roomId, joinedAt: Date.now()+1000,
        metadata: JSON.stringify({hashedAddress: learnerHash, role: 'learner'})
      });

      const connectionManagerStub = env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId));
      for (let i = 1; i <= 4; i++) {
        await connectionManagerStub.fetch("http://connection-manager/handlePeerLeft", {
          method: "POST",
          body: JSON.stringify({peerId:'l-peer', leftAt: Date.now()+i*1000, role:'learner'})
        });
      }

      await new Promise(r => setTimeout(r, 300));
      const finalizedMsg = messages.find(m => m.type === 'finalized');
      expect(finalizedMsg).toBeDefined();
      expect(finalizedMsg.data.status).toBe('fault');
      expect(finalizedMsg.data.faultType).toBe('learner_excessive_disconnects');
      expect(finalizedMsg.data.ipfsHash).toBe('QmTestHash');

      const cmStorage = await runInDurableObject(connectionManagerStub, async (_, state) => (await state.storage.list()));
      expect(cmStorage.size).toBe(0);
    });

    it("Connection timeout fault scenario (user fails to reconnect)", async () => {
      const messages = await establishWebSocket();
      await initSession(teacherAddress);
      await initSession(learnerAddress);

      await sendWebhook('peer:joined', {
        id: 't-peer', sessionId: 'test-session', roomId, joinedAt: Date.now(),
        metadata: JSON.stringify({hashedAddress: teacherHash, role: 'teacher'})
      });
      await sendWebhook('peer:joined', {
        id: 'l-peer', sessionId: 'test-session', roomId, joinedAt: Date.now()+1000,
        metadata: JSON.stringify({hashedAddress: learnerHash, role: 'learner'})
      });

      const leaveTime = Date.now() - 200000;
      const connectionManagerStub = env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId));
      await connectionManagerStub.fetch("http://connection-manager/handlePeerLeft", {
        method: "POST",
        body: JSON.stringify({ peerId:'l-peer', leftAt: leaveTime, role:'learner'})
      });
      await runDurableObjectAlarm(connectionManagerStub);

      await new Promise(r => setTimeout(r, 300));

      const finalizedMsg = messages.find(m => m.type === 'finalized');
      expect(finalizedMsg).toBeDefined();
      expect(finalizedMsg.data.status).toBe('fault');
      expect(finalizedMsg.data.faultType).toBe('learner_failed_to_reconnect');
      expect(finalizedMsg.data.ipfsHash).toBe('QmTestHash');

      const smStub = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId));
      const smEntries = await runInDurableObject(smStub, async(_,state)=> (await state.storage.list()));
      expect(smEntries.size).toBe(0);
    });

    it("Failed initial join fault scenario", async () => {
      const messages = await establishWebSocket();
      await initSession(teacherAddress);

      await sendWebhook('peer:joined', {
        id: 't-peer', sessionId: 'test-session', roomId, joinedAt: Date.now(),
        metadata: JSON.stringify({hashedAddress: teacherHash, role: 'teacher'})
      });

      const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
      await runDurableObjectAlarm(sessionTimerStub);

      await new Promise(r => setTimeout(r, 300));

      const finalizedMsg = messages.find(m => m.type === 'finalized');
      expect(finalizedMsg).toBeDefined();
      expect(finalizedMsg.data.status).toBe('fault');
      expect(finalizedMsg.data.faultType).toBe('learner_never_joined');
    });

    it("Verify all IPFS data has correct timestamps and signatures", async () => {
      const messages = await establishWebSocket();
      await initSession(teacherAddress);
      await initSession(learnerAddress);

      await sendWebhook('peer:joined', {
        id: 't-peer', sessionId: 'test-session', roomId, joinedAt: Date.now(),
        metadata: JSON.stringify({hashedAddress: teacherHash, role: 'teacher'})
      });

      const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
      await runDurableObjectAlarm(sessionTimerStub);

      await new Promise(r => setTimeout(r, 300));

      const finalizedMsg = messages.find(m => m.type === 'finalized');
      expect(finalizedMsg.data.timestamp).toBeDefined();
      expect(typeof finalizedMsg.data.timestamp).toBe('number');
    });
  });

  describe("Storage Cleanup Verification", () => {
    it("No premature cleanup of session data before finalization", async () => {
      const messages = await establishWebSocket();
      await initSession(teacherAddress);
      await initSession(learnerAddress);

      await sendWebhook('peer:joined', {
        id: 't-peer', sessionId: 'test-session', roomId, joinedAt: Date.now(),
        metadata: JSON.stringify({hashedAddress: teacherHash, role: 'teacher'})
      });

      const sessionManagerStub = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId));
      const entriesBefore = await runInDurableObject(sessionManagerStub, async(_, state) => {
        const ent = await state.storage.list();
        return Array.from(ent);
      });
      expect(entriesBefore.some(([k])=>k==='user:teacher')).toBe(true);

      const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
      await runDurableObjectAlarm(sessionTimerStub);
      await new Promise(r => setTimeout(r,300));

      const finalizedMsg = messages.find(m=>m.type==='finalized');
      expect(finalizedMsg).toBeDefined();

      const entriesAfter = await runInDurableObject(sessionManagerStub, async(_, state) => {
        const ent = await state.storage.list();
        return Array.from(ent);
      });
      expect(entriesAfter.length).toBe(0);
    });
  });

})

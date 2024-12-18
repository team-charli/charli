// test/webhook.test.ts
import { SELF, env, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";
import { User } from "../src/types";

const encoder = new TextEncoder();

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
  if (!data.id) {
    data.id = crypto.randomUUID();
  }

  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  const hashPayload = `${data.id}.${timestamp}.${JSON.stringify(data)}`;
  const hmac = await asyncGenerateHmac('SHA-256', hashPayload, apiKey);

  return `t=${timestamp},sha256=${hmac}`;
}

describe("Webhook Handler", () => {
  let ws: WebSocket | undefined;
  let roomId: string;
  let teacherAddress: string;
  let learnerAddress: string;
  let teacherHash: string;
  let learnerHash: string;
  const apiKey = env.TEST_HUDDLE_API_KEY || "test-api-key";

  // Generate fresh IDs before each test
  beforeEach(() => {
    const testId = crypto.randomUUID();
    roomId = `room-${testId}`;
    teacherAddress = `0x${testId.slice(0, 8)}`;
    learnerAddress = `0x${testId.slice(24, 32)}`;
    teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
    learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));
  });

  async function cleanup() {
    // 1. Close any open WebSocket connections
    if (ws) {
      ws.close();
      await new Promise(resolve => setTimeout(resolve, 100));
      ws = undefined;
    }

    // 2. Get stubs in dependency order
    const stubs = {
      sessionTimer: env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId)),
      connectionManager: env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId)),
      sessionManager: env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId)),
      messageRelay: env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId))
    };

    // 3. Clean in reverse dependency order
    for (const [_, stub] of Object.entries(stubs).reverse()) {
      try {
        await runDurableObjectAlarm(stub);
        await runInDurableObject(stub, async (_, state) => {
          await state.blockConcurrencyWhile(async () => {
            await state.storage.deleteAll();
            await state.storage.deleteAlarm();
          });
        });
      } catch (error) {
        throw error;
      } finally {
        stub[Symbol.dispose]?.();
      }
    }
  }

  beforeEach(async () => {
    await cleanup();
  });
  afterEach(async () => {
    await cleanup();
  });

  async function establishWebSocket() {
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
    ws.addEventListener('message', evt => {
      messages.push(JSON.parse(evt.data));
    });
    return messages;
  }

  async function sendWebhook(event: string, payloadData: any) {
    const data = { id: 'test-id', event, payload: [{ data: payloadData }] };
    const signatureHeader = await generateSignature(data, apiKey);

    const resp = await SELF.fetch("http://test.local/webhook", {
      method: "POST",
      headers: {
        "huddle01-signature": signatureHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return resp;
  }

  it("should establish session and handle webhook events", async () => {
    const sessionManagerStub = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId));

    try {
      // First establish WebSocket connection
      await establishWebSocket();
      // 1. First verify initial state by direct DO access
      await runInDurableObject(sessionManagerStub, async (_, state) => {
        const teacherData = await (state.storage.get('user:teacher')) as User;
        expect(teacherData).toBeUndefined();
      });

      // 2. Initialize session through main worker
      const initResponse = await SELF.fetch("http://test.local/init", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: 3600000
        })
      });
      expect(initResponse.status).toBe(200);

      // 3. Send webhook through main worker
      const webhookResponse = await sendWebhook('peer:joined', {
        id: 'peer-1',
        sessionId: 'test-session',
        roomId: roomId,
        joinedAt: Date.now(),
        metadata: JSON.stringify({
          hashedAddress: teacherHash,
          role: 'teacher'
        })
      });
      expect(webhookResponse.status).toBe(200);

      // 4. Verify final state
      await runInDurableObject(sessionManagerStub, async (_, state) => {
        const teacherData = await state.storage.get('user:teacher') as User;
        expect(teacherData.peerId).toBe('peer-1');
      });
    } finally {
      sessionManagerStub[Symbol.dispose]?.();
    }
  });

  it("should require WebSocket connection before init", async () => {
    try {
      // First attempt - without WebSocket - should fail
      const initResponse = await SELF.fetch("http://test.local/init", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: 3600000
        })
      });
      expect(initResponse.status).toBe(400);

      await establishWebSocket();

      // Test with WebSocket established
      const successResponse = await SELF.fetch("http://test.local/init", {
        headers: { 'Content-Type': 'application/json' },
        method: "POST",
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: 3600000
        })
      });
      expect(successResponse.status).toBe(200);
    } finally {
      if (ws) ws[Symbol.dispose]?.();
    }
  });

  it("should handle peer:left webhook event", async () => {
    const sessionManagerStub = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId));

    try {
      // Establish WebSocket
      const messages = await establishWebSocket();

      // Initialize session
      const initResponse = await SELF.fetch("http://test.local/init", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: 3600000
        })
      });
      expect(initResponse.status).toBe(200);

      const joinedAt = Date.now();
      const leftAt = joinedAt + 60000;

      // Send join webhook
      await sendWebhook('peer:joined', {
        id: 'peer-1',
        sessionId: 'test-session',
        roomId: roomId,
        joinedAt,
        metadata: JSON.stringify({
          hashedAddress: teacherHash,
          role: 'teacher'
        })
      });

      // Verify join state
      await runInDurableObject(sessionManagerStub, async (_, state) => {
        const teacherData = await (state.storage.get('user:teacher')) as User;
        expect(teacherData.peerId).toBe('peer-1');
      });

      // Send leave webhook
      await sendWebhook('peer:left', {
        id: 'peer-1',
        sessionId: 'test-session',
        roomId: roomId,
        leftAt,
        duration: 60000
      });

      // Wait for and verify messages
      await new Promise(resolve => setTimeout(resolve, 100));

      const leftMessage = messages.find(m => m.type === 'userLeft');
      expect(leftMessage).toBeDefined();
      expect(leftMessage.data.leftAt).toBe(leftAt);

    } finally {
      sessionManagerStub[Symbol.dispose]?.();
    }
  });

  it("should handle sequential peer joins and bothJoined state", async () => {
    const sessionManagerStub = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId));
    const connectionManagerStub = env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId));

    try {
      const messages = await establishWebSocket();

      // Initialize session for both teacher and learner
      await SELF.fetch("http://test.local/init", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: 3600000
        })
      });
      await SELF.fetch("http://test.local/init", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: learnerAddress,
          sessionDuration: 3600000
        })
      });

      const startTime = Date.now();

      // Teacher joins
      await sendWebhook('peer:joined', {
        id: 'peer-1',
        sessionId: 'test-session',
        roomId: roomId,
        joinedAt: startTime,
        metadata: JSON.stringify({
          hashedAddress: teacherHash,
          role: 'teacher'
        })
      });

      // Verify teacher state in both DOs
      await runInDurableObject(sessionManagerStub, async (_, state) => {
        const teacherData = await state.storage.get('user:teacher') as User;
        expect(teacherData.peerId).toBe('peer-1');
      });

      await runInDurableObject(connectionManagerStub, async (_, state) => {
        const participants = await state.storage.get<Record<string, string>>('participants');
        const joinTimes = await state.storage.get<Record<string, number>>('joinTimes');
        expect(participants?.['peer-1']).toBe('teacher');
        expect(joinTimes?.['teacher']).toBe(startTime);
      });

      // Learner joins
      await sendWebhook('peer:joined', {
        id: 'peer-2',
        sessionId: 'test-session',
        roomId: roomId,
        joinedAt: startTime + 30000,
        metadata: JSON.stringify({
          hashedAddress: learnerHash,
          role: 'learner'
        })
      });

      // Helper function to wait for messages
      const waitForMessages = async (predicate: (messages: any[]) => boolean, timeoutMs = 500) => {
        const startWait = Date.now();
        while (Date.now() - startWait < timeoutMs) {
          if (predicate(messages)) return true;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        return false;
      };

      // Verify final DO states
      await runInDurableObject(connectionManagerStub, async (_, state) => {
        const participants = await state.storage.get<Record<string, string>>('participants');
        const joinTimes = await state.storage.get<Record<string, number>>('joinTimes');
        expect(participants?.['peer-1']).toBe('teacher');
        expect(participants?.['peer-2']).toBe('learner');
        expect(joinTimes?.['teacher']).toBe(startTime);
        expect(joinTimes?.['learner']).toBe(startTime + 30000);
      });

      // Verify all expected messages were received
      expect(
        await waitForMessages(msgs =>
          msgs.some(m => m.type === 'userJoined' && m.data.role === 'teacher') &&
          msgs.some(m => m.type === 'userJoined' && m.data.role === 'learner') &&
          msgs.some(m => m.type === 'bothJoined')
        )
      ).toBe(true);

    } finally {
      sessionManagerStub[Symbol.dispose]?.();
      connectionManagerStub[Symbol.dispose]?.();
    }
  });
});

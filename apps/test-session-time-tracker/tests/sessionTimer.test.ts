// test/sessionTimer.test.ts
import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { hexToBytes, toHex } from "ethereum-cryptography/utils";
import { keccak256 } from "ethereum-cryptography/keccak";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SELF } from "cloudflare:test";

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

  const timestamp = Math.floor(Date.now() / 1000);
  const hashPayload = `${data.id}.${timestamp}.${JSON.stringify(data)}`;
  const hmac = await asyncGenerateHmac('SHA-256', hashPayload, apiKey);

  return `t=${timestamp},sha256=${hmac}`;
}

const apiKey = env.TEST_HUDDLE_API_KEY || "test-api-key";

describe("SessionTimer", () => {
  let ws: WebSocket | undefined;
  const firstJoinTime = Date.now();
  const duration = 3600000; // 1 hour
  let sessionTimerStub: DurableObjectStub;
  let roomId: string;
  let teacherAddress: string;
  let learnerAddress: string;
  let teacherHash: string;
  let learnerHash: string;

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
      } finally {
        stub[Symbol.dispose]?.();
      }
    }
  }

  beforeEach(async () => {
    await cleanup();
    sessionTimerStub = env.SESSION_TIMER.get(
      env.SESSION_TIMER.idFromName(roomId)
    );
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

  it("Test timer initialization with configurable duration", async () => {
    const sessionTimer = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));

    await establishWebSocket();
    // Initialize through main worker.
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

    // 3. Send a signed webhook (peer:joined)
    const data = {
      event: 'peer:joined',
      payload: [{
        data: {
          id: 'peer-1',
          sessionId: 'test-session',
          roomId: roomId,
          joinedAt: Date.now(),
          metadata: JSON.stringify({
            hashedAddress: teacherHash,
            role: 'teacher'
          })
        }
      }]
    };
    const signature = await generateSignature(data, apiKey);

    const learnerWebhookResponse = await SELF.fetch("http://test.local/webhook", {
      method: "POST",
      headers: {
        "huddle01-signature": signature,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    expect(learnerWebhookResponse.status).toBe(200);

    // Verify timer state
    await runInDurableObject(sessionTimer, async (instance, state) => {
      expect(await state.storage.get("alarmType")).toBe("joinWindow");
      expect(await state.storage.get("firstJoinRole")).toBe("teacher");

      const warningTime = await state.storage.get("warningTime");
      const expirationTime = await state.storage.get("expirationTime");

      const tolerance = 1000;
      expect(warningTime).toBeLessThan(firstJoinTime + duration - 180000 + tolerance);
      expect(expirationTime).toBeLessThan(firstJoinTime + duration + tolerance);
    });
  });

  it("should broadcast initialization message", async () => {
    const receivedMessages = await establishWebSocket();

    const initResponse = await sessionTimerStub.fetch(
      "http://session-timer/",
      {
        method: "POST",
        body: JSON.stringify({
          duration,
          firstJoinTime,
          firstJoinRole: "teacher",
          roomId,
        }),
      }
    );
    expect(initResponse.ok).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(receivedMessages[0]).toMatchObject({
      type: "initiated",
      data: {
        message: "Session timer started",
      },
    });
  });

  it("should handle join window alarm correctly when both users joined", async () => {
    const initResponse = await sessionTimerStub.fetch("http://session-timer/", {
      method: "POST",
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: "teacher",
        roomId,
      }),
    });
    expect(initResponse.ok).toBe(true);

    const connectionManagerStub = env.CONNECTION_MANAGER.get(
      env.CONNECTION_MANAGER.idFromName(roomId)
    );

    await connectionManagerStub.fetch("http://connection-manager/handlePeer", {
      method: "POST",
      body: JSON.stringify({
        peerId: "peer1",
        role: "teacher",
        joinedAt: firstJoinTime,
        roomId
      }),
    });

    await connectionManagerStub.fetch("http://connection-manager/handlePeer", {
      method: "POST",
      body: JSON.stringify({
        peerId: "peer2",
        role: "learner",
        joinedAt: firstJoinTime + 1000,
        roomId
      }),
    });

    const ran = await runDurableObjectAlarm(sessionTimerStub);
    expect(ran).toBe(true);

    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      expect(await state.storage.get("alarmType")).toBe("warning");
      expect(await state.storage.getAlarm()).not.toBeNull();
    });
  });

  it("should handle join window alarm correctly when second user missing", async () => {
    const receivedMessages = await establishWebSocket();

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

    // Send signed peer:joined webhook for teacher only
    const data = {
      event: 'peer:joined',
      payload: [{
        data: {
          id: 'peer-1',
          sessionId: 'test-session',
          roomId: roomId,
          joinedAt: Date.now(),
          metadata: JSON.stringify({
            hashedAddress: teacherHash,
            role: 'teacher'
          })
        }
      }]
    };
    const signature = await generateSignature(data, apiKey);

    const webhookResponse = await SELF.fetch("http://test.local/webhook", {
      method: "POST",
      headers: {
        "huddle01-signature": signature,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    console.log("webhookResponse", webhookResponse);
    expect(webhookResponse.status).toBe(200);

    // Execute the join window alarm without second user
    const ran = await runDurableObjectAlarm(sessionTimerStub);
    expect(ran).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      expect(await state.storage.get("alarmType")).toBeUndefined();
      expect(await state.storage.get("warningTime")).toBeUndefined();
      expect(await state.storage.get("expirationTime")).toBeUndefined();
      expect(await state.storage.get("firstJoinRole")).toBeUndefined();
    });

    console.log("receivedMessages", receivedMessages);
    expect(receivedMessages.some(msg =>
      msg.type === 'finalized' && msg.data.status === 'fault' && msg.data.faultType === 'learner_never_joined'
    )).toBe(true);
  });

  it("should broadcast warning message at warning phase", async () => {
    const receivedMessages = await establishWebSocket();

    const initResponse = await sessionTimerStub.fetch("http://session-timer/", {
      method: "POST",
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: "teacher",
        roomId,
      }),
    });
    expect(initResponse.ok).toBe(true);

    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      await state.storage.put("alarmType", "warning");
    });

    const ran = await runDurableObjectAlarm(sessionTimerStub);
    expect(ran).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(
      receivedMessages.some(
        (msg) => msg.type === "warning" && msg.data.message === "3-minute warning"
      )
    ).toBe(true);

    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      expect(await state.storage.get("alarmType")).toBe("expired");
    });
  });

  it("should handle session expiration correctly", async () => {
    const receivedMessages = await establishWebSocket();

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

    // Teacher joins (signed webhook)
    let data = {
      event: 'peer:joined',
      payload: [{
        data: {
          id: 'peer-1',
          sessionId: 'test-session',
          roomId: roomId,
          joinedAt: Date.now(),
          metadata: JSON.stringify({
            hashedAddress: teacherHash,
            role: 'teacher'
          })
        }
      }]
    };
    let signature = await generateSignature(data, apiKey);
    const learnerWebhookResponse = await SELF.fetch("http://test.local/webhook", {
      method: "POST",
      headers: {
        "huddle01-signature": signature,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    expect(learnerWebhookResponse.status).toBe(200);

    // Teacher again or possibly learner (to ensure both joined)
    data = {
      event: 'peer:joined',
      payload: [{
        data: {
          id: 'peer-1',
          sessionId: 'test-session',
          roomId: roomId,
          joinedAt: Date.now(),
          metadata: JSON.stringify({
            hashedAddress: teacherHash,
            role: 'teacher'
          })
        }
      }]
    };
    signature = await generateSignature(data, apiKey);
    const teacherWebhookResponse = await SELF.fetch("http://test.local/webhook", {
      method: "POST",
      headers: {
        "huddle01-signature": signature,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    expect(teacherWebhookResponse.status).toBe(200);

    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      await state.storage.put("alarmType", "expired");
    });

    const ran = await runDurableObjectAlarm(sessionTimerStub);
    expect(ran).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("receivedMessages", receivedMessages);
    expect(receivedMessages.some((msg) => msg.type === 'finalized' && msg.data.status === 'success')).toBe(true);

    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      expect(await state.storage.get("alarmType")).toBeUndefined();
      expect(await state.storage.get("warningTime")).toBeUndefined();
      expect(await state.storage.get("expirationTime")).toBeUndefined();
      expect(await state.storage.get("firstJoinRole")).toBeUndefined();
    });
  });
});

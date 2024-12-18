import { env, runInDurableObject, runDurableObjectAlarm, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hexToBytes, toHex } from "ethereum-cryptography/utils";
import { keccak256 } from "ethereum-cryptography/keccak";

// This test suite focuses on Session Initialization and Session Timer Initialization.
// We assume that when the first user joins, the SessionTimer DO is initialized
// with a join window alarm set 3 minutes after the first join time.
// We also verify that the session duration is taken from initial setup
// and that the SessionTimer correctly identifies the first user's role.

describe("Session Initialization Tests", () => {
  let ws: WebSocket | undefined;
  let roomId: string;
  let teacherAddress: string;
  let learnerAddress: string;
  let teacherHash: string;
  let learnerHash: string;
  let connectionManagerStub: DurableObjectStub;
  let messageRelayStub: DurableObjectStub;
  let sessionManagerStub: DurableObjectStub;
  let sessionTimerStub: DurableObjectStub;

  const duration = 3600000; // 1 hour
  const teacherPeerId = "test-teacher-peer";
  const learnerPeerId = "test-learner-peer";

  async function cleanup() {
    if (ws) {
      ws.close();
      await new Promise(resolve => setTimeout(resolve, 100));
      ws = undefined;
    }

    const stubs = {
      sessionTimer: env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId)),
      connectionManager: env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId)),
      sessionManager: env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId)),
      messageRelay: env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId))
    };

    for (const [_, stub] of Object.entries(stubs).reverse()) {
      try {
        await runDurableObjectAlarm(stub);
        await runInDurableObject(stub, async (instance, state) => {
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
    connectionManagerStub = env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId));
    messageRelayStub = env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId));
    sessionManagerStub = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId));
    sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
  });

  afterEach(async () => {
    await cleanup();
  });

  async function commonSetup() {
    // Step 1: Establish WebSocket connection
    const wsResponse = await messageRelayStub.fetch(`http://message-relay/connect/${roomId}`, {
      headers: { Upgrade: "websocket", Connection: "Upgrade" },
    });
    if (!wsResponse.webSocket) throw new Error("WebSocket connection failed");
    ws = wsResponse.webSocket;
    ws.accept();

    const receivedMessages: any[] = [];
    ws.addEventListener("message", (event) => {
      receivedMessages.push(JSON.parse(event.data));
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 2: Initialize session for teacher
    let initResponse = await SELF.fetch(`https://example.com/init`, {
      method: "POST",
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress: teacherAddress,
        sessionDuration: duration
      })
    });
    expect(initResponse.ok).toBe(true);

    // Step 3: Initialize session for learner as well
    initResponse = await SELF.fetch(`https://example.com/init`, {
      method: "POST",
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress: learnerAddress,
        sessionDuration: duration
      })
    });
    expect(initResponse.ok).toBe(true);

    return receivedMessages;
  }

  describe("Session Timer Initialization", () => {
    it("First user join initiates join window timer with 3-minute alarm", { timeout: 10000 }, async () => {
      const receivedMessages = await commonSetup();

      // Simulate first user (teacher) joining via webhook event
      const now = Date.now();
      const teacherJoinedAt = now;
      const teacherJoinedEvent = {
        event: "peer:joined",
        payload: [
          {
            data: {
              id: teacherPeerId,
              joinedAt: teacherJoinedAt,
              metadata: JSON.stringify({ hashedAddress: teacherHash }),
              roomId
            }
          }
        ]
      };

      let resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherJoinedEvent)
      });
      expect(resp.ok).toBe(true);

      // Wait a bit for the timer to initialize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check SessionTimer DO storage to verify join window alarm was set
      await runInDurableObject(sessionTimerStub, async (instance, state) => {
        const alarmType = await state.storage.get('alarmType');
        const firstJoinRole = await state.storage.get('firstJoinRole');
        const warningTime = await state.storage.get('warningTime');
        const expirationTime = await state.storage.get('expirationTime');

        // joinWindow alarm should be set
        expect(alarmType).toBe('joinWindow');
        // firstJoinRole should be 'teacher' since teacher joined first
        expect(firstJoinRole).toBe('teacher');
        // Check that the warning and expiration times align with sessionDuration
        const expectedExpirationTime = teacherJoinedAt + duration;
        expect(expirationTime).toBe(expectedExpirationTime);
        const expectedWarningTime = teacherJoinedAt + duration - 180000; // 3 minutes before expiration
        expect(warningTime).toBe(expectedWarningTime);

        // Join window alarm set for 3 minutes after first user joins
        const currentAlarm = await state.storage.getAlarm();
        expect(currentAlarm).toBeGreaterThan(teacherJoinedAt);
        expect(currentAlarm).toBeLessThanOrEqual(teacherJoinedAt + 180001);
        // Should roughly be teacherJoinedAt + 180000ms
      });
    });

    it("Timer takes correct session duration from initial setup", { timeout: 10000 }, async () => {
      const receivedMessages = await commonSetup();

      // First user join again (teacher)
      const now = Date.now();
      const teacherJoinedAt = now;
      const teacherJoinedEvent = {
        event: "peer:joined",
        payload: [
          {
            data: {
              id: teacherPeerId,
              joinedAt: teacherJoinedAt,
              metadata: JSON.stringify({ hashedAddress: teacherHash }),
              roomId
            }
          }
        ]
      };

      let resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherJoinedEvent)
      });
      expect(resp.ok).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Check SessionTimer DO storage
      await runInDurableObject(sessionTimerStub, async (instance, state) => {
        const expirationTime = await state.storage.get<number>('expirationTime');
        const expectedExpirationTime = teacherJoinedAt + duration;
        expect(expirationTime).toBe(expectedExpirationTime);
      });
    });

    it("Timer correctly identifies first user's role", { timeout: 10000 }, async () => {
      const receivedMessages = await commonSetup();

      // Teacher joins first
      const now = Date.now();
      const teacherJoinedAt = now;
      const teacherJoinedEvent = {
        event: "peer:joined",
        payload: [
          {
            data: {
              id: teacherPeerId,
              joinedAt: teacherJoinedAt,
              metadata: JSON.stringify({ hashedAddress: teacherHash }),
              roomId
            }
          }
        ]
      };

      let resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherJoinedEvent)
      });
      expect(resp.ok).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify firstJoinRole in SessionTimer storage
      await runInDurableObject(sessionTimerStub, async (instance, state) => {
        const firstJoinRole = await state.storage.get<'teacher' | 'learner'>('firstJoinRole');
        expect(firstJoinRole).toBe('teacher');
      });
    });
  });
});


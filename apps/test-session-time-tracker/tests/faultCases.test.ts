// faultCases.test.ts
import { env, runInDurableObject, runDurableObjectAlarm, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hexToBytes, toHex } from "ethereum-cryptography/utils";
import { keccak256 } from "ethereum-cryptography/keccak";

describe("Fault Cases", () => {
  let ws: WebSocket | undefined;
  let roomId: string;
  let teacherAddress: string;
  let learnerAddress: string;
  let teacherHash: string;
  let learnerHash: string;
  let connectionManagerStub: DurableObjectStub;
  let messageRelayStub: DurableObjectStub;
  let sessionManagerStub: DurableObjectStub;

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
  });

  afterEach(async () => {
    await cleanup();
  });

  /**
   * Common setup that:
   * 1. Establishes a WebSocket connection
   * 2. Initializes session for teacher and learner so both user:teacher and user:learner are set
   * 3. Returns receivedMessages array for later assertions
   */
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

  it("should detect late join fault (Case #1)", async () => {
    const receivedMessages = await commonSetup();

    // Simulate teacher joined over 3 minutes ago (peer:joined webhook)
    const oldJoinTime = Date.now() - 180001; // More than 3 minutes ago
    const teacherJoinedEvent = {
      event: "peer:joined",
      payload: [
        {
          data: {
            id: teacherPeerId,
            joinedAt: oldJoinTime,
            metadata: JSON.stringify({ hashedAddress: teacherHash }),
            roomId
          }
        }
      ]
    };

    let resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacherJoinedEvent)
    });
    expect(resp.ok).toBe(true);

    // Wait to ensure updates propagate
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now the learner joins at the current time (late)
    const learnerJoinedEvent = {
      event: "peer:joined",
      payload: [
        {
          data: {
            id: learnerPeerId,
            joinedAt: Date.now(),
            metadata: JSON.stringify({ hashedAddress: learnerHash }),
            roomId
          }
        }
      ]
    };

    resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(learnerJoinedEvent)
    });
    expect(resp.ok).toBe(true);

    // Wait for fault message
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check for the late join fault message
    const faultMessage = receivedMessages.find(m =>
      m.type === "fault" && m.data.faultType === "learnerFault_didnt_join"
    );

    // Assert the fault message is received
    expect(faultMessage).toBeDefined();
    expect(faultMessage.data.faultType).toBe("learnerFault_didnt_join");
  });
  it("should detect second user never joined (Case #2)", async () => {
    const receivedMessages = await commonSetup();

    // Teacher joins now (no learner joins)
    const teacherJoinedTime = Date.now();
    const teacherJoinedEvent = {
      event: "peer:joined",
      payload: [
        {
          data: {
            id: teacherPeerId,
            joinedAt: teacherJoinedTime,
            metadata: JSON.stringify({ hashedAddress: teacherHash }),
            roomId
          }
        }
      ]
    };

    let resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacherJoinedEvent)
    });
    expect(resp.ok).toBe(true);

    // Simulate time passing for the join window (3+ minutes)
    // Instead of actually waiting 3+ minutes, just trigger the alarm:
    await runDurableObjectAlarm(env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId)));
    await runDurableObjectAlarm(connectionManagerStub);

    // Check for the "secondUser_never_joined" fault message
    const faultMessage = receivedMessages.find(m =>
      m.type === "fault" && m.data.faultType === "secondUser_never_joined"
    );

    expect(faultMessage).toBeDefined();
    expect(faultMessage.data.faultType).toBe("secondUser_never_joined");
  });

  it("should detect user not reconnecting within 3 minutes (Case #3)", { timeout: 15000 }, async () => {
    const receivedMessages = await commonSetup();

    const now = Date.now();

    // Set times so that by the time we run alarms, the alarm is already overdue:
    // teacherJoinedAt ~3.5 minutes ago
    const teacherJoinedAt = now - 210000;
    // learnerJoinedAt ~3.25 minutes ago
    const learnerJoinedAt = now - 205000;
    // leftAt ~3.33 minutes ago (which is after the learner joined, ensuring logical order)
    // leftAt + 180000 = alarm time will be about 20 seconds in the past, guaranteeing it's overdue.
    const leftAt = now - 200000;

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

    const learnerJoinedEvent = {
      event: "peer:joined",
      payload: [
        {
          data: {
            id: learnerPeerId,
            joinedAt: learnerJoinedAt,
            metadata: JSON.stringify({ hashedAddress: learnerHash }),
            roomId
          }
        }
      ]
    };

    resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(learnerJoinedEvent)
    });
    expect(resp.ok).toBe(true);

    await new Promise(r => setTimeout(r, 100));

    const learnerLeftEvent = {
      event: "peer:left",
      payload: [
        {
          data: {
            id: learnerPeerId,
            leftAt: leftAt,
            duration: leftAt - learnerJoinedAt,
            metadata: JSON.stringify({ hashedAddress: learnerHash }),
            roomId
          }
        }
      ]
    };

    resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(learnerLeftEvent)
    });
    expect(resp.ok).toBe(true);

    // Now alarm time = leftAt + 180000 = now - 200000 + 180000 = now - 20000 (20 seconds in the past)
    // runDurableObjectAlarm should immediately trigger the alarm since it's overdue.
    await runDurableObjectAlarm(connectionManagerStub);
    await new Promise(resolve => setTimeout(resolve, 300));

    const faultMessage = receivedMessages.find(m =>
      m.type === "fault" && m.data.faultType === "learnerFault_connection_timeout"
    );

    expect(faultMessage).toBeDefined();
    expect(faultMessage.data.faultType).toBe("learnerFault_connection_timeout");
  });

  it("should trigger fault when user exceeds maximum disconnections (Case #4)", { timeout: 15000 }, async () => {
    const receivedMessages = await commonSetup();

    // Simulate the teacher joining
    const teacherJoinedTime = Date.now();
    const teacherJoinedEvent = {
      event: "peer:joined",
      payload: [
        {
          data: {
            id: teacherPeerId,
            joinedAt: teacherJoinedTime,
            metadata: JSON.stringify({ hashedAddress: teacherHash }),
            roomId
          }
        }
      ]
    };

    let resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacherJoinedEvent)
    });
    expect(resp.ok).toBe(true);

    await new Promise(r => setTimeout(r, 100)); // small delay to let state propagate

    // Simulate multiple disconnections for the teacher
    // MAX_DISCONNECTIONS = 3, so 4 disconnections triggers the fault
    for (let i = 0; i < 4; i++) {
      const leaveAt = Date.now() + i * 1000;
      const teacherLeftEvent = {
        event: "peer:left",
        payload: [
          {
            data: {
              id: teacherPeerId,
              leftAt: leaveAt,
              duration: leaveAt - teacherJoinedTime,
              metadata: JSON.stringify({ hashedAddress: teacherHash }),
              roomId
            }
          }
        ]
      };

      resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherLeftEvent)
      });
      expect(resp.ok).toBe(true);
    }

    // Give time for the fault message to broadcast
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check that we received the fault message for excessive disconnects
    const faultMessage = receivedMessages.find(m =>
      m.type === "fault" && m.data.faultType === "teacherFault_excessive_disconnects"
    );
    expect(faultMessage).toBeDefined();
    expect(faultMessage.data.faultType).toBe("teacherFault_excessive_disconnects");
  });

});

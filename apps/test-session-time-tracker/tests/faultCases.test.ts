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
  let sessionTimerStub: DurableObjectStub;
  const mockApiKey = "test-api-key";

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
      messageRelay: env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId)),
      sessionTimerStub: env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId))
    };

    for (const [name, stub] of Object.entries(stubs).reverse()) {
      try {
        await runDurableObjectAlarm(stub);
        await runInDurableObject(stub, async (instance, state) => {
          await state.blockConcurrencyWhile(async () => {
            await state.storage.deleteAll();
            await state.storage.deleteAlarm();
          });
        });

        // Check storage after cleanup to ensure it's empty
        const storageEntries = await runInDurableObject(stub, async (instance, state) => {
          const entries = await state.storage.list();
          return Object.fromEntries(entries);
        });
        //console.log(`>>> cleanup: Storage after clearing for ${name} (roomId=${roomId}):`, storageEntries);
      } finally {
        stub[Symbol.dispose]?.();
      }
    }
  }

  beforeEach(() => {
    const testId = crypto.randomUUID();
    roomId = `room-${testId}`;
    teacherAddress = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    learnerAddress  = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
    learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));
  });

  beforeEach(async () => {
    //console.log(`>>> beforeEach: Starting cleanup for roomId=${roomId}`);
     await cleanup();
    //console.log(`>>> beforeEach: Finished cleanup for roomId=${roomId}`);
    connectionManagerStub = env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId));
    messageRelayStub = env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId));
    sessionManagerStub = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId));
  });


  afterEach(async () => {
    //console.log(`>>> afterEach: Starting cleanup for roomId=${roomId}`);
     await cleanup();
    //console.log(`>>> afterEach: Finished cleanup for roomId=${roomId}`);

    // Give some time for any asynchronous tasks or delayed alarms
    await new Promise(resolve => setTimeout(resolve, 200));
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
  // Fault Case #1: User Never Joins (e.g., learner never joins after teacher does)
it("should finalize with a 'learner_never_joined' fault if the learner never joins within the join window", { timeout: 15000 }, async () => {
  const receivedMessages = await commonSetup();

  // Set the teacher join time sufficiently in the past so that the joinWindow alarm fires immediately.
  const baseline = Date.now() - 4 * 60 * 1000; // 4 minutes ago
  const teacherJoinTime = baseline;

  // Teacher joined event (in the past)
  const teacherJoinedEvent = {
    event: "peer:joined",
    payload: [
      {
        data: {
          id: teacherPeerId,
          joinedAt: teacherJoinTime,
          metadata: JSON.stringify({
            hashedAddress: teacherHash,
            sessionId: roomId,
            role: "teacher",
          }),
          roomId,
        }
      }
    ]
  };

  let resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
    method: "POST",
    headers: { "Content-Type": "application/json", "huddle01-signature": mockApiKey },
    body: JSON.stringify(teacherJoinedEvent)
  });
  expect(resp.ok).toBe(true);

  // Do NOT send a learner joined event.
  // The session timer should detect that the learner never joined and finalize as a fault.

  // Poll for the finalized message
  let finalizedMessage: any;
  for (let i = 0; i < 20; i++) {
    finalizedMessage = receivedMessages.find(m =>
      m.type === "finalized" &&
      m.data.status === "fault" &&
      m.data.faultType === "learner_never_joined" &&
      m.data.faultedRole === "learner"
    );
    if (finalizedMessage) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  expect(finalizedMessage).toBeDefined();
  expect(finalizedMessage.data.status).toBe("fault");
  expect(finalizedMessage.data.faultType).toBe("learner_never_joined");
  expect(finalizedMessage.data.faultedRole).toBe("learner");
});

  it("should detect user not reconnecting within 3 minutes (Case #2)", { timeout: 15000 }, async () => {
    const receivedMessages = await commonSetup();

    // Use current timestamps so the initial joining doesn't cause immediate faults
    const baseline = Date.now();
    const teacherJoinTime = baseline;
    const learnerJoinTime = baseline + 1000; // Learner joins 1 second after teacher

    // Teacher joins now
    const teacherJoinedEvent = {
      event: "peer:joined",
      payload: [
        {
          data: {
            id: teacherPeerId,
            joinedAt: teacherJoinTime,
            metadata: JSON.stringify({
              hashedAddress: teacherHash,
              sessionId: roomId,
              role: "teacher",
            }),
            roomId,
          }
        }
      ]
    };
    let resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
      method: "POST",
      headers: { "Content-Type": "application/json", "huddle01-signature": mockApiKey },
      body: JSON.stringify(teacherJoinedEvent)
    });
    expect(resp.ok).toBe(true);

    // Learner joins 1 second later
    const learnerJoinedEvent = {
      event: "peer:joined",
      payload: [
        {
          data: {
            id: learnerPeerId,
            joinedAt: learnerJoinTime,
            metadata: JSON.stringify({
              hashedAddress: learnerHash,
              sessionId: roomId,
              role: "learner",
            }),
            roomId,
          }
        }
      ]
    };

    resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
      method: "POST",
      headers: { "Content-Type": "application/json", "huddle01-signature": mockApiKey },
      body: JSON.stringify(learnerJoinedEvent)
    });
    expect(resp.ok).toBe(true);

    // Allow some time for cancelNoJoinCheck to take effect
    await new Promise(resolve => setTimeout(resolve, 500));

    // Now that both users have joined, we simulate the learner leaving 4 minutes in the past.
    // This ensures that the "3 minutes after leaving" reconnection deadline is already missed.
    const learnerLeftTime = Date.now() - 240000; // 4 minutes ago
    const learnerLeftEvent = {
      event: "peer:left",
      payload: [
        {
          data: {
            id: learnerPeerId,
            leftAt: learnerLeftTime,
            duration: learnerLeftTime - learnerJoinTime,
            metadata: JSON.stringify({
              hashedAddress: learnerHash,
              role: "learner",
              sessionId: roomId
            }),
            roomId,
          }
        }
      ]
    };

    await sessionManagerStub.fetch('http://session-manager/webhook', {
      method: "POST",
      headers: { "Content-Type": "application/json", "huddle01-signature": mockApiKey },
      body: JSON.stringify(learnerLeftEvent)
    });

    // Trigger the alarm. The learner failed to reconnect within 3 minutes, so the session should finalize as a fault.
    await runDurableObjectAlarm(connectionManagerStub);

    // Wait a bit for the finalize message to propagate through the WebSocket
    await new Promise(resolve => setTimeout(resolve, 500));

    // Poll for the finalized message (in case there's still a minor delay)
    let finalizedMessage: any;
    for (let i = 0; i < 10; i++) {
      finalizedMessage = receivedMessages.find(m =>
        m.type === "finalized" &&
          m.data.status === "fault" &&
          m.data.faultType === "learner_failed_to_reconnect" &&
          m.data.faultedRole === "learner"
      );
      if (finalizedMessage) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    expect(finalizedMessage).toBeDefined();
    expect(finalizedMessage.data.status).toBe("fault");
    expect(finalizedMessage.data.faultType).toBe("learner_failed_to_reconnect");
    expect(finalizedMessage.data.faultedRole).toBe("learner");
  });


  // Fault Case #3: Excessive Disconnections
  it("should finalize with a '{role}_excessive_disconnects' fault if a user exceeds the disconnection limit", async () => {
    const receivedMessages = await commonSetup();

    // Both teacher and learner join normally
    const baseline = Date.now();
    const teacherJoinTime = baseline;
    const learnerJoinTime = baseline + 1000; // join 1s later

    const teacherJoinedEvent = {
      event: "peer:joined",
      payload: [
        {
          data: {
            id: teacherPeerId,
            joinedAt: teacherJoinTime,
            metadata: JSON.stringify({
              hashedAddress: teacherHash,
              sessionId: roomId,
              role: "teacher",
            }),
            roomId,
          }
        }
      ]
    };

    let resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
      method: "POST",
      headers: { "Content-Type": "application/json", "huddle01-signature": mockApiKey },
      body: JSON.stringify(teacherJoinedEvent)
    });
    expect(resp.ok).toBe(true);

    const learnerJoinedEvent = {
      event: "peer:joined",
      payload: [
        {
          data: {
            id: learnerPeerId,
            joinedAt: learnerJoinTime,
            metadata: JSON.stringify({
              hashedAddress: learnerHash,
              sessionId: roomId,
              role: "learner",
            }),
            roomId,
          }
        }
      ]
    };

    resp = await sessionManagerStub.fetch('http://session-manager/webhook', {
      method: "POST",
      headers: { "Content-Type": "application/json", "huddle01-signature": mockApiKey },
      body: JSON.stringify(learnerJoinedEvent)
    });
    expect(resp.ok).toBe(true);

    // Let the user disconnect multiple times to exceed the limit
    // Each 'peer:left' event increments the disconnect count.
    const maxDisconnects = 3;
    for (let i = 1; i <= maxDisconnects + 1; i++) {
      const leftTime = Date.now() + i * 1000; // staggered disconnect times
      const learnerLeftEvent = {
        event: "peer:left",
        payload: [
          {
            data: {
              id: learnerPeerId,
              leftAt: leftTime,
              duration: leftTime - learnerJoinTime,
              metadata: JSON.stringify({
                hashedAddress: learnerHash,
                role: "learner",
                sessionId: roomId
              }),
              roomId,
            }
          }
        ]
      };

      await sessionManagerStub.fetch('http://session-manager/webhook', {
        method: "POST",
        headers: { "Content-Type": "application/json", "huddle01-signature": mockApiKey },
        body: JSON.stringify(learnerLeftEvent)
      });
    }

    // The last disconnection should trigger immediate fault finalization
    // Wait a moment for finalization to propagate
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check the messages for the finalized fault scenario
    const finalizedMessage = receivedMessages.find(m =>
      m.type === "finalized" &&
        m.data.status === "fault" &&
        m.data.faultType === "learner_excessive_disconnects" &&
        m.data.faultedRole === "learner"
    );

    expect(finalizedMessage).toBeDefined();
    expect(finalizedMessage.data.status).toBe("fault");
    expect(finalizedMessage.data.faultType).toBe("learner_excessive_disconnects");
    expect(finalizedMessage.data.faultedRole).toBe("learner");
  });


  // In the failing test #3 case, adjust the timing and event order
})

//sessionTimer.test.ts
import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("SessionTimer", () => {
  let ws: WebSocket | undefined;
  const roomId = "test-room";
  const firstJoinTime = Date.now();
  const duration = 3600000; // 1 hour
  let sessionTimerStub: DurableObjectStub;

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
    for (const [name, stub] of Object.entries(stubs).reverse()) {
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

  beforeEach(async () => {
    await cleanup();
    sessionTimerStub = env.SESSION_TIMER.get(
      env.SESSION_TIMER.idFromName(roomId)
    );
  });

  afterEach(async () => {
    await cleanup();
  });

  it("Test timer initialization with configurable duration", async () => {
    const sessionTimer = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));

    // Initialize timer through proper endpoint
    const initResponse = await sessionTimer.fetch("http://session-timer/", {
      method: "POST",
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: "teacher"
      })
    });
    expect(initResponse.ok).toBe(true);

    // Verify timer state
    await runInDurableObject(sessionTimer, async (instance, state) => {
      // Check core timer state
      expect(await state.storage.get("alarmType")).toBe("joinWindow");
      expect(await state.storage.get("firstJoinRole")).toBe("teacher");

      // Verify timing calculations
      const warningTime = await state.storage.get("warningTime");
      const expirationTime = await state.storage.get("expirationTime");

      expect(warningTime).toBe(firstJoinTime + duration - 180000); // 3 min warning
      expect(expirationTime).toBe(firstJoinTime + duration);
    });
  });
  it("should broadcast initialization message", async () => {
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );

    const wsResponse = await messageRelay.fetch(
      `http://message-relay/connect/${roomId}`,
      {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      }
    );

    if (!wsResponse.webSocket) {
      const status = wsResponse.status;
      const text = await wsResponse.text();
      console.error('WebSocket connection failed:', status, text);
      throw new Error("WebSocket not established");
    }

    ws = wsResponse.webSocket;
    ws.accept();

    const receivedMessages: any[] = [];
    ws.addEventListener("message", (event) => {
      receivedMessages.push(JSON.parse(event.data));
    });

    const initResponse = await sessionTimerStub.fetch(
      "http://session-timer/",  // Use proper URL format
      {
        method: "POST",
        body: JSON.stringify({
          duration,
          firstJoinTime,
          firstJoinRole: "teacher",
          roomId,
          hashedTeacherAddress: "0x123",
          hashedLearnerAddress: "0x456"
        }),
      }
    );
    expect(initResponse.ok).toBe(true);

    // Wait for message processing
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(receivedMessages[0]).toMatchObject({
      type: "initiated",
      data: {
        message: "Session timer started",
      },
    });
  });

  it("should handle join window alarm correctly when both users joined", async () => {
    // Initialize the session timer with proper URL pattern
    const initResponse = await sessionTimerStub.fetch("http://session-timer/", {
      method: "POST",
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: "teacher",
        roomId,
        hashedTeacherAddress: "0x123",
        hashedLearnerAddress: "0x456"
      }),
    });
    expect(initResponse.ok).toBe(true);

    // Simulate both users joined using correct ConnectionManager endpoints
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

    // Execute the join window alarm
    const ran = await runDurableObjectAlarm(sessionTimerStub);
    expect(ran).toBe(true);

    // Verify state transition to warning phase
    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      expect(await state.storage.get("alarmType")).toBe("warning");
      expect(await state.storage.getAlarm()).not.toBeNull();
    });
  });

  it("should handle join window alarm correctly when second user missing", async () => {
    // Set up WebSocket connection
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );

    const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
      headers: {
        Upgrade: "websocket",
        Connection: "Upgrade",
      },
    });

    if (!wsResponse.webSocket) {
      throw new Error("WebSocket not established");
    }

    ws = wsResponse.webSocket;
    ws.accept();

    const receivedMessages: any[] = [];
    ws.addEventListener("message", (event) => {
      receivedMessages.push(JSON.parse(event.data));
    });

    // Initialize the session timer with required fields
    const initResponse = await sessionTimerStub.fetch("http://session-timer/", {
      method: "POST",
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: "teacher",
        roomId,
        hashedTeacherAddress: "0x123",
        hashedLearnerAddress: "0x456"
      }),
    });
    expect(initResponse.ok).toBe(true);

    // Execute the join window alarm without second user joining
    const ran = await runDurableObjectAlarm(sessionTimerStub);
    expect(ran).toBe(true);

    // Wait for message processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify complete cleanup of timer state
    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      expect(await state.storage.get("alarmType")).toBeUndefined();
      expect(await state.storage.get("warningTime")).toBeUndefined();
      expect(await state.storage.get("expirationTime")).toBeUndefined();
      expect(await state.storage.get("firstJoinRole")).toBeUndefined();
    });

    // Verify fault message was sent
    expect(receivedMessages.some(msg =>
      msg.type === 'fault' &&
        msg.data.faultType === 'secondUser_never_joined' &&
        typeof msg.data.timestamp === 'number' &&
        msg.data.timestamp > 0
    )).toBe(true);
  });
  it("should broadcast warning message at warning phase", async () => {
    // Set up WebSocket connection
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );

    const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
      headers: {
        Upgrade: "websocket",
        Connection: "Upgrade",
      },
    });

    if (!wsResponse.webSocket) {
      throw new Error("WebSocket not established");
    }

    ws = wsResponse.webSocket;
    ws.accept();

    const receivedMessages: any[] = [];
    ws.addEventListener("message", (event) => {
      receivedMessages.push(JSON.parse(event.data));
    });

    // Initialize the session timer with required fields
    const initResponse = await sessionTimerStub.fetch("http://session-timer/", {
      method: "POST",
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: "teacher",
        roomId,
        hashedTeacherAddress: "0x123",
        hashedLearnerAddress: "0x456"
      }),
    });
    expect(initResponse.ok).toBe(true);

    // Set the alarmType to 'warning' to simulate that phase
    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      await state.storage.put("alarmType", "warning");
    });

    // Execute the warning alarm
    const ran = await runDurableObjectAlarm(sessionTimerStub);
    expect(ran).toBe(true);

    // Wait for message processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify warning message broadcast
    console.log("receivedMessages", receivedMessages)
    expect(
      receivedMessages.some(
        (msg) =>
          msg.type === "warning" &&
            msg.data.message === "3-minute warning"
      )
    ).toBe(true);

    // Verify transition to 'expired' phase
    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      expect(await state.storage.get("alarmType")).toBe("expired");
    });
  });
  it("should handle session expiration correctly", async () => {
    // Set up WebSocket connection
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );

    const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
      headers: {
        Upgrade: "websocket",
        Connection: "Upgrade",
      },
    });

    if (!wsResponse.webSocket) {
      throw new Error("WebSocket not established");
    }

    ws = wsResponse.webSocket;
    ws.accept();

    const receivedMessages: any[] = [];
    ws.addEventListener("message", (event) => {
      receivedMessages.push(JSON.parse(event.data));
    });

    // Initialize the session timer with required fields
    const initResponse = await sessionTimerStub.fetch("http://session-timer/", {
      method: "POST",
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: "teacher",
        roomId,
        hashedTeacherAddress: "0x123",
        hashedLearnerAddress: "0x456"
      }),
    });
    expect(initResponse.ok).toBe(true);

    // Set the alarmType to 'expired' to simulate that phase
    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      await state.storage.put("alarmType", "expired");
    });

    // Execute the expiration alarm
    const ran = await runDurableObjectAlarm(sessionTimerStub);
    expect(ran).toBe(true);

    // Wait for message processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify expiration message broadcast
    expect(
      receivedMessages.some(
        (msg) =>
          msg.type === "expired" &&
            msg.data.message === "Session expired"
      )
    ).toBe(true);

    // Verify complete cleanup of timer state
    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      expect(await state.storage.get("alarmType")).toBeUndefined();
      expect(await state.storage.get("warningTime")).toBeUndefined();
      expect(await state.storage.get("expirationTime")).toBeUndefined();
      expect(await state.storage.get("firstJoinRole")).toBeUndefined();
    });
  });
});

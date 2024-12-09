import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("SessionTimer", () => {
  const roomId = "test-room";
  const firstJoinTime = Date.now();
  const duration = 3600000; // 1 hour
  let sessionTimerStub: DurableObjectStub;

  async function cleanup() {
    const stubs = [
      env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId)),
      env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId)),
      env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId)),
      env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId)),
    ];

    await Promise.all(
      stubs.map((stub) =>
        runInDurableObject(stub, async (instance, state) => {
          await state.blockConcurrencyWhile(async () => {
            await state.storage.deleteAll();
          });
        })
      )
    );
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

  it("should initialize timer with correct phases", async () => {
    // Make the fetch request directly to the stub
    const initResponse = await sessionTimerStub.fetch(
      "http://localhost/session-timer/",
      {
        method: "POST",
        body: JSON.stringify({
          duration,
          firstJoinTime,
          firstJoinRole: "teacher",
          hashedTeacherAddress: "0x123",
          hashedLearnerAddress: "0x456",
        }),
      }
    );
    expect(initResponse.ok).toBe(true);

    // Access the storage to make assertions
    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      expect(await state.storage.get("alarmType")).toBe("joinWindow");
      expect(await state.storage.get("firstJoinRole")).toBe("teacher");
      expect(await state.storage.get("warningTime")).toBe(
        firstJoinTime + duration - 180000
      );
      expect(await state.storage.get("expirationTime")).toBe(
        firstJoinTime + duration
      );
    });
  });

  it("should broadcast initialization message", async () => {
    let ws: WebSocket | undefined;
    try {
      const messageRelay = env.MESSAGE_RELAY.get(
        env.MESSAGE_RELAY.idFromName(roomId)
      );

      const wsResponse = await messageRelay.fetch(
        `http://localhost/connect/${roomId}`,
        {
          headers: {
            Upgrade: "websocket",
            Connection: "Upgrade",
          },
        }
      );

      // Log the status and response body if the WebSocket is not established
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
        "http://localhost/session-timer/",
        {
          method: "POST",
          body: JSON.stringify({
            duration,
            firstJoinTime,
            firstJoinRole: "teacher",
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
    } finally {
      if (ws) {
        ws.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  });

  it("should handle join window alarm correctly when both users joined", async () => {
    // Initialize the session timer
    const initResponse = await sessionTimerStub.fetch(
      "http://localhost/session-timer/",
      {
        method: "POST",
        body: JSON.stringify({
          duration,
          firstJoinTime,
          firstJoinRole: "teacher",
        }),
      }
    );
    expect(initResponse.ok).toBe(true);

    // Simulate both users joined in ConnectionManager
    const connectionManagerStub = env.CONNECTION_MANAGER.get(
      env.CONNECTION_MANAGER.idFromName(roomId)
    );

    await connectionManagerStub.fetch(
      "http://localhost/connection-manager/updateParticipantRole",
      {
        method: "POST",
        body: JSON.stringify({ peerId: "peer1", role: "teacher" }),
      }
    );
    await connectionManagerStub.fetch(
      "http://localhost/connection-manager/updateParticipantRole",
      {
        method: "POST",
        body: JSON.stringify({ peerId: "peer2", role: "learner" }),
      }
    );

    // Execute the join window alarm
    const ran = await runDurableObjectAlarm(sessionTimerStub);
    expect(ran).toBe(true);

    // Verify state transition to warning phase
    await runInDurableObject(sessionTimerStub, async (instance, state) => {
      expect(await state.storage.get("alarmType")).toBe("warning");
    });
  });

  it("should handle join window alarm correctly when second user missing", async () => {
    let ws: WebSocket | undefined;
    try {
      const messageRelay = env.MESSAGE_RELAY.get(
        env.MESSAGE_RELAY.idFromName(roomId)
      );

      const wsResponse = await messageRelay.fetch(
        `http://localhost/connect/${roomId}`,
        {
          headers: {
            Upgrade: "websocket",
            Connection: "Upgrade",
          },
        }
      );

      // Log the status and response body if the WebSocket is not established
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

      // Initialize the session timer
      const initResponse = await sessionTimerStub.fetch(
        "http://localhost/session-timer/",
        {
          method: "POST",
          body: JSON.stringify({
            duration,
            firstJoinTime,
            firstJoinRole: "teacher",
          }),
        }
      );
      expect(initResponse.ok).toBe(true);

      // Execute the join window alarm without second user joining
      const ran = await runDurableObjectAlarm(sessionTimerStub);
      expect(ran).toBe(true);

      // Wait for message processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify that the session timer cleaned up its state
      await runInDurableObject(sessionTimerStub, async (instance, state) => {
        expect(await state.storage.get("alarmType")).toBeUndefined();
        expect(await state.storage.get("warningTime")).toBeUndefined();
        expect(await state.storage.get("expirationTime")).toBeUndefined();
        expect(await state.storage.get("firstJoinRole")).toBeUndefined();
      });

      // Optionally, verify that a fault message was sent via MessageRelay
      // For example:
      // expect(receivedMessages.some(msg => msg.type === 'fault')).toBe(true);
    } finally {
      if (ws) {
        ws.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  });

  it("should broadcast warning message at warning phase", async () => {
    let ws: WebSocket | undefined;
    try {
      const messageRelay = env.MESSAGE_RELAY.get(
        env.MESSAGE_RELAY.idFromName(roomId)
      );

      const wsResponse = await messageRelay.fetch(
        `http://localhost/connect/${roomId}`,
        {
          headers: {
            Upgrade: "websocket",
            Connection: "Upgrade",
          },
        }
      );

      // Log the status and response body if the WebSocket is not established
      if (!wsResponse.webSocket) {
        const status = wsResponse.status;
        const text = await wsResponse.text();
        console.error('WebSocket connection failed:', status, text);
        throw new Error("WebSocket not established");
      }
      ws = wsResponse.webSocket;
      if (!ws) throw new Error("WebSocket not established");
      ws.accept();

      const receivedMessages: any[] = [];
      ws.addEventListener("message", (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

      // Initialize the session timer
      const initResponse = await sessionTimerStub.fetch(
        "http://localhost/session-timer/",
        {
          method: "POST",
          body: JSON.stringify({
            duration,
            firstJoinTime,
            firstJoinRole: "teacher",
          }),
        }
      );
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

      // Verify that the warning message was broadcasted
      expect(
        receivedMessages.some(
          (msg) =>
            msg.type === "warning" && msg.data.message === "3-minute warning"
        )
      ).toBe(true);

      // Verify transition to 'expired' phase
      await runInDurableObject(sessionTimerStub, async (instance, state) => {
        expect(await state.storage.get("alarmType")).toBe("expired");
      });
    } finally {
      if (ws) {
        ws.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  });

  it("should handle session expiration correctly", async () => {
    let ws: WebSocket | undefined;
    try {
      const messageRelay = env.MESSAGE_RELAY.get(
        env.MESSAGE_RELAY.idFromName(roomId)
      );

      const wsResponse = await messageRelay.fetch(
        `http://localhost/connect/${roomId}`,
        {
          headers: {
            Upgrade: "websocket",
            Connection: "Upgrade",
          },
        }
      );

      // Log the status and response body if the WebSocket is not established
      if (!wsResponse.webSocket) {
        const status = wsResponse.status;
        const text = await wsResponse.text();
        console.error('WebSocket connection failed:', status, text);
        throw new Error("WebSocket not established");
      }
      ws = wsResponse.webSocket;
      if (!ws) throw new Error("WebSocket not established");
      ws.accept();

      const receivedMessages: any[] = [];
      ws.addEventListener("message", (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

      // Initialize the session timer
      const initResponse = await sessionTimerStub.fetch(
        "http://localhost/session-timer/",
        {
          method: "POST",
          body: JSON.stringify({
            duration,
            firstJoinTime,
            firstJoinRole: "teacher",
          }),
        }
      );
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

      // Verify that the 'expired' message was broadcasted
      expect(
        receivedMessages.some(
          (msg) =>
            msg.type === "expired" && msg.data.message === "Session expired"
        )
      ).toBe(true);

      // Verify that the session timer cleaned up its state
      await runInDurableObject(sessionTimerStub, async (instance, state) => {
        expect(await state.storage.get("alarmType")).toBeUndefined();
        expect(await state.storage.get("warningTime")).toBeUndefined();
        expect(await state.storage.get("expirationTime")).toBeUndefined();
        expect(await state.storage.get("firstJoinRole")).toBeUndefined();
      });
    } finally {
      if (ws) {
        ws.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  });
});

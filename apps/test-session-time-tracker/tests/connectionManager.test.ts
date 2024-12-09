import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";

describe("ConnectionManager", () => {
  const roomId = "test-room";
  const peerId = "peer-1";
  let connectionManagerStub: DurableObjectStub;
  let messageRelayStub: DurableObjectStub;

  // Cleanup function to reset DO storage before each test
  async function cleanup() {
    const stubs = [
      env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId)),
      env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId)),
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
    connectionManagerStub = env.CONNECTION_MANAGER.get(
      env.CONNECTION_MANAGER.idFromName(roomId)
    );
    messageRelayStub = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );
  });

  it("should track user join events and store participant roles", async () => {
    await runInDurableObject(connectionManagerStub, async (instance, state) => {
      // Store participant role
      const updateRoleResponse = await instance.fetch(
        "http://connection-manager/updateParticipantRole",
        {
          method: "POST",
          body: JSON.stringify({ peerId, role: "teacher" }),
        }
      );
      expect(updateRoleResponse.ok).toBe(true);

      // Simulate join event
      const joinedAt = Date.now();
      const handleWebhookResponse = await instance.fetch(
        "http://connection-manager/handleWebhook",
        {
          method: "POST",
          body: JSON.stringify({
            event: {
              event: "peer:joined",
              payload: {
                id: peerId,
                roomId,
                joinedAt,
              },
            },
          }),
        }
      );
      expect(handleWebhookResponse.ok).toBe(true);

      // Verify state within the ConnectionManager DO
      const participants = await state.storage.get<Record<string, string>>(
        "participants"
      );
      expect(participants[peerId]).toBe("teacher");

      const teacherData = await state.storage.get("user:teacher");
      expect(teacherData).toMatchObject({
        peerId,
        joinedAt,
        role: "teacher",
      });
    });
  });

  it("should handle disconnections and track reconnection window", async () => {
    await runInDurableObject(connectionManagerStub, async (instance, state) => {
      // Set up initial state
      await instance.fetch("http://connection-manager/updateParticipantRole", {
        method: "POST",
        body: JSON.stringify({ peerId, role: "teacher" }),
      });

      const leftAt = Date.now();
      await instance.fetch("http://connection-manager/handleWebhook", {
        method: "POST",
        body: JSON.stringify({
          event: {
            event: "peer:left",
            payload: {
              id: peerId,
              roomId,
              leftAt,
            },
          },
        }),
      });

      // Verify that the reconnection alarm was set
      const disconnectionAlarms = await state.storage.list();
      const alarmKey = `${peerId}_reconnect`;
      expect(disconnectionAlarms.keys.some((key) => key.name === alarmKey)).toBe(
        true
      );
    });
  });

  it("should handle reconnection and clear alarms", async () => {
    await runInDurableObject(connectionManagerStub, async (instance, state) => {
      // Set up disconnection
      await instance.fetch("http://connection-manager/updateParticipantRole", {
        method: "POST",
        body: JSON.stringify({ peerId, role: "teacher" }),
      });

      await instance.fetch("http://connection-manager/handleWebhook", {
        method: "POST",
        body: JSON.stringify({
          event: {
            event: "peer:left",
            payload: {
              id: peerId,
              roomId,
              leftAt: Date.now(),
            },
          },
        }),
      });

      // Simulate reconnection
      await instance.fetch("http://connection-manager/handleWebhook", {
        method: "POST",
        body: JSON.stringify({
          event: {
            event: "peer:joined",
            payload: {
              id: peerId,
              roomId,
              joinedAt: Date.now(),
            },
          },
        }),
      });

      // Verify that the reconnection alarm was cleared
      const disconnectionAlarms = await state.storage.list();
      const alarmKey = `${peerId}_reconnect`;
      expect(disconnectionAlarms.keys.some((key) => key.name === alarmKey)).toBe(
        false
      );
    });
  });

  it("should track and enforce MAX_DISCONNECTIONS", async () => {
    await runInDurableObject(connectionManagerStub, async (instance, state) => {
      await instance.fetch("http://connection-manager/updateParticipantRole", {
        method: "POST",
        body: JSON.stringify({ peerId, role: "teacher" }),
      });

      // Simulate multiple disconnections
      for (let i = 0; i < 4; i++) {
        await instance.fetch("http://connection-manager/handleWebhook", {
          method: "POST",
          body: JSON.stringify({
            event: {
              event: "peer:left",
              payload: {
                id: peerId,
                roomId,
                leftAt: Date.now() + i * 1000,
              },
            },
          }),
        });
      }

      // Verify disconnect count
      const disconnectCount = await state.storage.get<number>(
        "teacher_disconnectCount"
      );
      expect(disconnectCount).toBe(4);
    });
  });

  it("should broadcast faults through MessageRelay", async () => {
    let ws: WebSocket | undefined;
    try {
      // Establish WebSocket connection to MessageRelay
      const wsResponse = await messageRelayStub.fetch(
        `http://message-relay/connect/${roomId}`,
        {
          headers: {
            Upgrade: "websocket",
            Connection: "Upgrade",
          },
        }
      );
      ws = wsResponse.webSocket;
      if (!ws) throw new Error("WebSocket not established");
      ws.accept();

      const receivedMessages: any[] = [];
      ws.addEventListener("message", (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

      // Trigger a fault condition (excessive disconnects)
      await runInDurableObject(connectionManagerStub, async (instance) => {
        await instance.fetch("http://connection-manager/updateParticipantRole", {
          method: "POST",
          body: JSON.stringify({ peerId, role: "teacher" }),
        });

        for (let i = 0; i < 4; i++) {
          await instance.fetch("http://connection-manager/handleWebhook", {
            method: "POST",
            body: JSON.stringify({
              event: {
                event: "peer:left",
                payload: {
                  id: peerId,
                  roomId,
                  leftAt: Date.now(),
                },
              },
            }),
          });
        }
      });

      // Wait for message processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedMessages.length).toBeGreaterThan(0);
      expect(receivedMessages[0]).toMatchObject({
        type: "fault",
        data: {
          faultType: "teacherFault_excessive_disconnects",
          role: "teacher",
        },
      });
    } finally {
      if (ws) {
        ws.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  });

  it("should execute reconnection timeout alarm correctly", async () => {
    let ws: WebSocket | undefined;
    try {
      // Establish WebSocket connection to MessageRelay
      const wsResponse = await messageRelayStub.fetch(
        `http://message-relay/connect/${roomId}`,
        {
          headers: {
            Upgrade: "websocket",
            Connection: "Upgrade",
          },
        }
      );
      ws = wsResponse.webSocket;
      if (!ws) throw new Error("WebSocket not established");
      ws.accept();

      const receivedMessages: any[] = [];
      ws.addEventListener("message", (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

      // Set up disconnection
      await runInDurableObject(connectionManagerStub, async (instance) => {
        await instance.fetch("http://connection-manager/updateParticipantRole", {
          method: "POST",
          body: JSON.stringify({ peerId, role: "teacher" }),
        });

        const leftAt = Date.now();
        await instance.fetch("http://connection-manager/handleWebhook", {
          method: "POST",
          body: JSON.stringify({
            event: {
              event: "peer:left",
              payload: {
                id: peerId,
                roomId,
                leftAt,
              },
            },
          }),
        });
      });

      // Execute the alarm
      const alarmRan = await runDurableObjectAlarm(connectionManagerStub);
      expect(alarmRan).toBe(true);

      // Wait for message processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedMessages.length).toBeGreaterThan(0);
      expect(receivedMessages[0]).toMatchObject({
        type: "fault",
        data: {
          faultType: "teacherFault_connection_timeout",
          role: "teacher",
        },
      });
    } finally {
      if (ws) {
        ws.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  });
});

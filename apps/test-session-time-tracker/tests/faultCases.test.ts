import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { WebhookData, User } from "../src/types";

describe("Fault Cases", () => {
  const roomId = "test-room";
  let connectionManager: DurableObjectStub;
  let messageRelay: DurableObjectStub;
  let ws: WebSocket | undefined;
  let messages: any[] = []; // Changed to let

async function cleanup() {
  // Single atomic cleanup operation
  await Promise.all([
    new Promise<void>(resolve => {
      if (ws) {
        ws.close();
        ws.addEventListener('close', () => resolve(), { once: true });
        // Backup timeout
        setTimeout(resolve, 100);
      } else {
        resolve();
      }
    }),

    // DO cleanup in one batch with single timeout
    (async () => {
      const stubs = [
        messageRelay,
        connectionManager,
        env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId)),
        env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId))
      ];

      await Promise.all(stubs.map(stub =>
        runInDurableObject(stub, async (_, state) => {
          await state.blockConcurrencyWhile(async () => {
            await state.storage.deleteAlarm();
            await state.storage.deleteAll();
          });
        })
      ));
    })()
  ]);

  // Single final wait
  await new Promise(resolve => setTimeout(resolve, 200));

  messages = [];
  ws = undefined;
}

beforeEach(async () => {
  connectionManager = env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId));
  messageRelay = env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId));
  messages = [];
  await cleanup();
});

afterEach(cleanup);

  afterEach(async () => {
    await cleanup();
    // Additional cleanup and wait after each test
    messages = [];
    ws = undefined;
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  // ... rest of the tests remain the same

  it("should detect late join fault (Case #1)", async () => {
    // Setup WebSocket
    const wsResponse = await messageRelay.fetch(`http://localhost/connect/${roomId}`, {
      headers: { Upgrade: "websocket", Connection: "Upgrade" }
    });
    if (!wsResponse.webSocket) throw new Error("WebSocket connection failed");
    ws = wsResponse.webSocket;
    ws.accept();

    ws.addEventListener("message", event => messages.push(JSON.parse(event.data)));
    await new Promise(resolve => setTimeout(resolve, 100));

    // Setup initial state
    await runInDurableObject(connectionManager, async (_, state) => {
      await state.blockConcurrencyWhile(async () => {
        await state.storage.put("participants", {
          [teacherPeerId]: "teacher",
          [learnerPeerId]: "learner",
        });
        await state.storage.put("user:teacher", {
          role: "teacher",
          peerId: teacherPeerId,
          joinedAt: Date.now() - 180001,
        } as User);
      });
    });

    // Trigger fault
    await connectionManager.fetch("http://localhost/handleWebhook", {
      method: "POST",
      body: JSON.stringify({
        event: {
          event: "peer:joined",
          payload: { id: learnerPeerId, roomId, joinedAt: Date.now() }
        }
      }),
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const faultMessage = messages.find(m =>
      m.type === "fault" && m.data.faultType === "learnerFault_didnt_join"
    );
    expect(faultMessage?.data.role).toBe("learner");
  });

  it("should handle second user never joining (Case #2)", async () => {
    // Setup WebSocket
    const wsResponse = await messageRelay.fetch(`http://localhost/connect/${roomId}`, {
      headers: { Upgrade: "websocket", Connection: "Upgrade" }
    });
    if (!wsResponse.webSocket) throw new Error("WebSocket connection failed");
    ws = wsResponse.webSocket;
    ws.accept();

    ws.addEventListener("message", event => messages.push(JSON.parse(event.data)));
    await new Promise(resolve => setTimeout(resolve, 100));

    // Setup initial state
    await runInDurableObject(connectionManager, async (_, state) => {
      await state.blockConcurrencyWhile(async () => {
        await state.storage.put("participants", {
          [teacherPeerId]: "teacher",
          [learnerPeerId]: "learner",
        });
        await state.storage.put("user:teacher", {
          role: "teacher",
          peerId: teacherPeerId,
          joinedAt: Date.now(),
        } as User);
      });
    });

    await connectionManager.fetch("http://localhost/timerFault", {
      method: "POST",
      body: JSON.stringify({
        faultType: "noJoin",
        data: { role: "learner" },
      }),
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const faultMessage = messages.find(m =>
      m.type === "fault" && m.data.faultType === "secondUser_never_joined"
    );
    expect(faultMessage?.data.role).toBe("learner");
  });

  it("should handle reconnection timeout (Case #3)", async () => {
    // Setup WebSocket
    const wsResponse = await messageRelay.fetch(`http://localhost/connect/${roomId}`, {
      headers: { Upgrade: "websocket", Connection: "Upgrade" }
    });
    if (!wsResponse.webSocket) throw new Error("WebSocket connection failed");
    ws = wsResponse.webSocket;
    ws.accept();

    ws.addEventListener("message", event => messages.push(JSON.parse(event.data)));
    await new Promise(resolve => setTimeout(resolve, 100));

    // Setup timeout state
    const leftAt = Date.now() - 200000;
    await runInDurableObject(connectionManager, async (_, state) => {
      await state.blockConcurrencyWhile(async () => {
        await state.storage.put("participants", {
          [teacherPeerId]: "teacher",
          [learnerPeerId]: "learner",
        });
        await state.storage.put("teacher_disconnectCount", 1);
        await state.storage.put("disconnectionAlarms", {
          [`${teacherPeerId}_reconnect`]: leftAt + 180000
        });
        await state.storage.setAlarm(leftAt + 180000);
      });
    });

    const alarmRan = await runDurableObjectAlarm(connectionManager);
    expect(alarmRan).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 100));

    const faultMessage = messages.find(m =>
      m.type === "fault" && m.data.faultType === "teacherFault_connection_timeout"
    );
    expect(faultMessage).toBeDefined();
  });

  it("should handle excessive disconnections (Case #4)", async () => {
    // Setup WebSocket
    const wsResponse = await messageRelay.fetch(`http://localhost/connect/${roomId}`, {
      headers: { Upgrade: "websocket", Connection: "Upgrade" }
    });
    if (!wsResponse.webSocket) throw new Error("WebSocket connection failed");
    ws = wsResponse.webSocket;
    ws.accept();

    ws.addEventListener("message", event => messages.push(JSON.parse(event.data)));
    await new Promise(resolve => setTimeout(resolve, 100));

    // Setup disconnect state
    await runInDurableObject(connectionManager, async (_, state) => {
      await state.blockConcurrencyWhile(async () => {
        await state.storage.put("participants", {
          [teacherPeerId]: "teacher",
          [learnerPeerId]: "learner",
        });
        await state.storage.put("teacher_disconnectCount", 3);
      });
    });

    // Trigger another disconnect
    await connectionManager.fetch("http://localhost/handleWebhook", {
      method: "POST",
      body: JSON.stringify({
        event: {
          event: "peer:left",
          payload: {
            id: teacherPeerId,
            roomId,
            leftAt: Date.now(),
          },
        },
      }),
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const faultMessage = messages.find(m =>
      m.type === "fault" && m.data.faultType === "teacherFault_excessive_disconnects"
    );
    expect(faultMessage).toBeDefined();
  });

  it("should clear reconnection tracking on successful rejoin", async () => {
    // Setup WebSocket
    const wsResponse = await messageRelay.fetch(`http://localhost/connect/${roomId}`, {
      headers: { Upgrade: "websocket", Connection: "Upgrade" }
    });
    if (!wsResponse.webSocket) throw new Error("WebSocket connection failed");
    ws = wsResponse.webSocket;
    ws.accept();

    ws.addEventListener("message", event => messages.push(JSON.parse(event.data)));
    await new Promise(resolve => setTimeout(resolve, 100));

    // Setup reconnection state
    await runInDurableObject(connectionManager, async (_, state) => {
      await state.blockConcurrencyWhile(async () => {
        await state.storage.put("participants", {
          [teacherPeerId]: "teacher",
          [learnerPeerId]: "learner",
        });
        await state.storage.put("teacher_disconnectCount", 1);
        await state.storage.put("disconnectionAlarms", {
          [`${teacherPeerId}_reconnect`]: Date.now() + 180000
        });
        await state.storage.setAlarm(Date.now() + 180000);
      });
    });

    // Trigger rejoin
    await connectionManager.fetch("http://localhost/handleWebhook", {
      method: "POST",
      body: JSON.stringify({
        event: {
          event: "peer:joined",
          payload: {
            id: teacherPeerId,
            roomId,
            joinedAt: Date.now(),
          },
        },
      }),
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    const alarmWasRun = await runDurableObjectAlarm(connectionManager);
    expect(alarmWasRun).toBe(false);
  });
});

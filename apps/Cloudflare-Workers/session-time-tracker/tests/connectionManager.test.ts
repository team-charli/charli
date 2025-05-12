//connectionManager.test.ts
import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hexToBytes, toHex } from "ethereum-cryptography/utils";
import { keccak256 } from "ethereum-cryptography/keccak";
import { SELF } from "cloudflare:test";

describe("ConnectionManager", () => {
  let ws: WebSocket | undefined;
  let roomId: string;
  let teacherAddress: string;
  let learnerAddress: string;
  let teacherHash: string;
  let learnerHash: string;
  const firstJoinTime = Date.now();
  const duration = 3600000; // 1 hour
  let connectionManagerStub: DurableObjectStub;
  let messageRelayStub: DurableObjectStub;
  const peerId = "test-peer-1";

  beforeEach(() => {
    const testId = crypto.randomUUID();
    roomId = `room-${testId}`;
    teacherAddress = `0x${testId.slice(0, 8)}`;
    learnerAddress = `0x${testId.slice(24, 32)}`;
    teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
    learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));
  });

async function cleanup() {
  if (ws) {
    // Wait for any pending messages
    await new Promise(resolve => setTimeout(resolve, 500));
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
    // Initialize stubs
    connectionManagerStub = env.CONNECTION_MANAGER.get(
      env.CONNECTION_MANAGER.idFromName(roomId)
    );
    messageRelayStub = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
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

  describe("Participant tracking", () => {
    it("should properly track user joins and store roles", async () => {
      // 1. First initialize SessionManager (needed for state setup)
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      await sessionManager.fetch("http://session-manager/init", {
        method: "POST",
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: duration
        })
      });

      // 2. Set up WebSocket connection
      const receivedMessages = await establishWebSocket();

      // 3. Make the direct call that we know works
      const response = await connectionManagerStub.fetch("http://connection-manager/handlePeer", {
        method: "POST",
        body: JSON.stringify({
          peerId,
          role: "teacher",
          joinedAt: firstJoinTime,
          roomId
        })
      });

      expect(response.ok).toBe(true);

      // 4. Verify results
      await runInDurableObject(connectionManagerStub, async (instance, state) => {
        const participants = await state.storage.get<Record<string, string>>("participants");
        expect(participants["test-peer-1"]).toBe("teacher");
      });

      expect(receivedMessages.some(msg =>
        msg.type === "userJoined" &&
          msg.data.role === "teacher"
      )).toBe(true);
    });
  });
  describe("Disconnection handling", () => {
    it("should track disconnections and manage reconnection window", async () => {
      // 1. Initialize SessionManager for required session state
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );
      await sessionManager.fetch("http://session-manager/init", {
        method: "POST",
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: teacherHash,
          userAddress: teacherAddress,
          sessionDuration: duration
        })
      });

      // 2. Establish WebSocket connection via MessageRelay
      const wsResponse = await messageRelayStub.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });
      if (!wsResponse.webSocket) throw new Error("WebSocket not established");
      ws = wsResponse.webSocket;
      ws.accept();

      // 3. Initially connect peer to set a known state
      const joinAt = Date.now();
      const joinResponse = await connectionManagerStub.fetch("http://connection-manager/handlePeer", {
        method: "POST",
        body: JSON.stringify({
          peerId,
          role: "teacher",
          joinedAt: joinAt,
          roomId
        }),
      });
      expect(joinResponse.ok).toBe(true);

      // 4. Simulate disconnection
      const leftAt = Date.now();
      const leaveResponse = await connectionManagerStub.fetch("http://connection-manager/handlePeerLeft", {
        method: "POST",
        body: JSON.stringify({
          peerId,
          leftAt,
          role: "teacher"
        })
      });
      expect(leaveResponse.ok).toBe(true);

      // 5. Verify reconnection alarm was set
      await runInDurableObject(connectionManagerStub, async (instance, state) => {
        const alarmTime = await state.storage.getAlarm();
        expect(alarmTime).toBeDefined();
        expect(alarmTime).toBeGreaterThan(leftAt);
      });
    });

    it("should handle reconnections and clear pending alarms", async () => {
      // 1. Initialize SessionManager
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );
      await sessionManager.fetch("http://session-manager/init", {
        method: "POST",
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: duration
        })
      });

      // 2. Establish WebSocket connection
      const wsResponse = await messageRelayStub.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });
      if (!wsResponse.webSocket) throw new Error("WebSocket not established");
      ws = wsResponse.webSocket;
      ws.accept();

      // 3. Connect peer, then simulate disconnection and reconnection
      const joinTime = Date.now();
      const joinResponse = await connectionManagerStub.fetch("http://connection-manager/handlePeer", {
        method: "POST",
        body: JSON.stringify({
          peerId,
          role: "teacher",
          joinedAt: joinTime,
          roomId
        })
      });
      expect(joinResponse.ok).toBe(true);

      const leaveResponse = await connectionManagerStub.fetch("http://connection-manager/handlePeerLeft", {
        method: "POST",
        body: JSON.stringify({
          peerId,
          leftAt: Date.now(),
          role: "teacher"
        })
      });
      expect(leaveResponse.ok).toBe(true);

      const rejoinResponse = await connectionManagerStub.fetch("http://connection-manager/handlePeer", {
        method: "POST",
        body: JSON.stringify({
          peerId,
          role: "teacher",
          joinedAt: Date.now() + 500,
          roomId
        })
      });
      expect(rejoinResponse.ok).toBe(true);

      // 4. Verify alarm cleared after reconnection
      await runInDurableObject(connectionManagerStub, async (instance, state) => {
        const alarm = await state.storage.getAlarm();
        expect(alarm).toBeFalsy;
      });
    });
  });

  describe("Fault detection", () => {
    it("should enforce maximum disconnection limit", async () => {
      // 1. Initialize SessionManager
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );
      await sessionManager.fetch("http://session-manager/init", {
        method: "POST",
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: duration
        })
      });

      // 2. WebSocket connection for message tracking
      const wsResponse = await messageRelayStub.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });
      if (!wsResponse.webSocket) throw new Error("WebSocket not established");
      ws = wsResponse.webSocket;
      ws.accept();

      const receivedMessages: any[] = [];
      ws.addEventListener("message", (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

      // 3. Establish participant
      const joinAt = Date.now();
      await connectionManagerStub.fetch("http://connection-manager/handlePeer", {
        method: "POST",
        body: JSON.stringify({
          peerId,
          role: "teacher",
          joinedAt: joinAt,
          roomId,
          teacherData: { joinedAt: joinAt },
          learnerData: { joinedAt: null }
        })
      });

      // 4. Simulate multiple disconnections exceeding MAX_DISCONNECTIONS
      // After the maximum limit is exceeded, the session will be finalized,
      // clearing the storage and broadcasting a finalization message.
      for (let i = 0; i < 4; i++) {
        await connectionManagerStub.fetch("http://connection-manager/handlePeerLeft", {
          method: "POST",
          body: JSON.stringify({
            peerId,
            leftAt: Date.now() + i * 1000,
            role: "teacher",
            teacherData: { joinedAt: joinAt },
            learnerData: { joinedAt: null }
          })
        });
      }

      // 5. Wait a bit for messages
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Instead of checking disconnectCount (which is cleared after finalization),
      // we verify that a final 'finalized' message was broadcast with the expected fault.
      expect(receivedMessages).toContainEqual(
        expect.objectContaining({
          type: "finalized",
          data: expect.objectContaining({
            status: "fault",
            faultType: "teacher_excessive_disconnects",
            faultedRole: "teacher"
          })
        })
      );
    });

    it("should handle reconnection timeout alarms", async () => {
      // 1. Initialize SessionManager
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );
      await sessionManager.fetch("http://session-manager/init", {
        method: "POST",
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: "0x0000000000000000000000000000000000000123",
          hashedLearnerAddress: "0x0000000000000000000000000000000000000456",
          userAddress: "0x0000000000000000000000000000000000000123",
          sessionDuration: duration
        })
      });

      // 2. WebSocket connection
      const wsResponse = await messageRelayStub.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });
      if (!wsResponse.webSocket) throw new Error("WebSocket not established");
      ws = wsResponse.webSocket;
      ws.accept();

      const receivedMessages: any[] = [];
      ws.addEventListener("message", (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

      // 3. Setup participant and simulate a single disconnection far in the past
      const joinTime = Date.now();
      await connectionManagerStub.fetch("http://connection-manager/handlePeer", {
        method: "POST",
        body: JSON.stringify({
          peerId,
          role: "teacher",
          joinedAt: joinTime,
          roomId,
          teacherData: { joinedAt: joinTime },
          learnerData: { joinedAt: null }
        })
      });

      const pastTime = Date.now() - 200000; // 200 seconds in the past
      await connectionManagerStub.fetch("http://connection-manager/handlePeerLeft", {
        method: "POST",
        body: JSON.stringify({
          peerId,
          leftAt: pastTime,
          role: "teacher",
          teacherData: { joinedAt: joinTime },
          learnerData: { joinedAt: null }
        })
      });

      // 4. Trigger alarm manually since reconnection didn't occur, causing fault finalization.
      await runDurableObjectAlarm(connectionManagerStub);

      await new Promise(resolve => setTimeout(resolve, 1000));
      //console.log("receivedMessages", receivedMessages);

      // Instead of expecting a direct "fault" message, we now expect a "finalized" message
      // indicating that the session ended in a fault scenario because the teacher failed to reconnect.
      expect(receivedMessages).toContainEqual(
        expect.objectContaining({
          type: "finalized",
          data: expect.objectContaining({
            status: "fault",
            faultType: "teacher_failed_to_reconnect",
            faultedRole: "teacher"
          })
        })
      );
    });
  });
})

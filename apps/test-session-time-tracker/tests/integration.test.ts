import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";

describe("System Integration", () => {
  // Test session setup helpers
  async function initializeSession(roomId: string, teacherAddress: string, learnerAddress: string) {
    const sessionManager = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );

    const teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
    const learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));

    // Initialize teacher
    await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress: teacherAddress,
        sessionDuration: 3600000
      })
    });

    // Initialize learner
    await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress: learnerAddress,
        sessionDuration: 3600000
      })
    });

    return { teacherHash, learnerHash };
  }

  it("should handle complete session lifecycle", async () => {
    const roomId = "test-room-1";
    const messages: any[] = [];

    // Set up WebSocket listener
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );
    const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    const ws = wsResponse.webSocket;
    ws.addEventListener('message', (event) => {
      messages.push(JSON.parse(event.data));
    });

    // Initialize session
    await initializeSession(roomId, "0x1234", "0x5678");

    // Simulate teacher joining
    const sessionManager = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );
    await sessionManager.fetch('http://session-manager/webhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:joined',
          payload: {
            id: 'teacher-1',
            roomId,
            joinedAt: Date.now(),
            metadata: JSON.stringify({ role: 'teacher' })
          }
        }
      })
    });

    // Verify timer started and states updated
    expect(messages.some(m => m.type === 'initiated')).toBe(true);

    // Simulate learner joining
    await sessionManager.fetch('http://session-manager/webhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:joined',
          payload: {
            id: 'learner-1',
            roomId,
            joinedAt: Date.now(),
            metadata: JSON.stringify({ role: 'learner' })
          }
        }
      })
    });

    // Verify both users joined state
    const connectionManager = env.CONNECTION_MANAGER.get(
      env.CONNECTION_MANAGER.idFromName(roomId)
    );
    const response = await connectionManager.fetch('http://connection-manager/checkBothJoined');
    const { bothJoined } = await response.json();
    expect(bothJoined).toBe(true);
  });

  it("should handle concurrent sessions independently", async () => {
    const room1 = "room-1";
    const room2 = "room-2";
    const messages1: any[] = [];
    const messages2: any[] = [];

    // Set up WebSocket listeners for both rooms
    const messageRelay1 = env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(room1));
    const messageRelay2 = env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(room2));

    const ws1Response = await messageRelay1.fetch(`http://message-relay/connect/${room1}`);
    const ws2Response = await messageRelay2.fetch(`http://message-relay/connect/${room2}`);

    ws1Response.webSocket.addEventListener('message', (event) => messages1.push(JSON.parse(event.data)));
    ws2Response.webSocket.addEventListener('message', (event) => messages2.push(JSON.parse(event.data)));

    // Initialize both sessions
    await initializeSession(room1, "0x1234", "0x5678");
    await initializeSession(room2, "0x9abc", "0xdef0");

    // Simulate users joining in different rooms
    const sessionManager1 = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(room1));
    const sessionManager2 = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(room2));

    // Join events for room 1
    await sessionManager1.fetch('http://session-manager/webhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:joined',
          payload: {
            id: 'teacher-1',
            roomId: room1,
            joinedAt: Date.now(),
            metadata: JSON.stringify({ role: 'teacher' })
          }
        }
      })
    });

    // Join events for room 2
    await sessionManager2.fetch('http://session-manager/webhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:joined',
          payload: {
            id: 'teacher-2',
            roomId: room2,
            joinedAt: Date.now(),
            metadata: JSON.stringify({ role: 'teacher' })
          }
        }
      })
    });

    // Verify each room received its own messages
    expect(messages1.some(m => m.type === 'initiated')).toBe(true);
    expect(messages2.some(m => m.type === 'initiated')).toBe(true);
    expect(messages1).not.toEqual(messages2);
  });

  it("should maintain state persistence across operations", async () => {
    const roomId = "test-room-3";
    await initializeSession(roomId, "0x1234", "0x5678");

    const connectionManager = env.CONNECTION_MANAGER.get(
      env.CONNECTION_MANAGER.idFromName(roomId)
    );

    // Store some state
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId: 'peer-1', role: 'teacher' })
    });

    // Verify state persists through multiple operations
    await runInDurableObject(connectionManager, async (instance, state) => {
      const participants = await state.storage.get<Record<string, string>>('participants');
      expect(participants['peer-1']).toBe('teacher');
    });
  });

  it("should handle WebSocket reconnection scenarios", async () => {
    const roomId = "test-room-4";
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );

    // Initial connection
    const response1 = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    const ws1 = response1.webSocket;

    // Simulate disconnect by closing first connection
    ws1.close();

    // Reconnect
    const response2 = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    const ws2 = response2.webSocket;

    // Verify new connection can receive messages
    let receivedMessage = false;
    ws2.addEventListener('message', () => {
      receivedMessage = true;
    });

    // Send test message
    await messageRelay.fetch(`http://message-relay/broadcast/${roomId}`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'warning',
        data: { message: 'test' }
      })
    });

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(receivedMessage).toBe(true);
  });

  it("should clean up resources properly", async () => {
    const roomId = "test-room-5";
    const sessionTimer = env.SESSION_TIMER.get(
      env.SESSION_TIMER.idFromName(roomId)
    );

    // Initialize timer
    await sessionTimer.fetch('http://session-timer/', {
      method: 'POST',
      body: JSON.stringify({
        duration: 3600000,
        firstJoinTime: Date.now(),
        firstJoinRole: 'teacher'
      })
    });

    // Force cleanup
    await runInDurableObject(sessionTimer, async (instance) => {
      await instance['cleanup']();
    });

    // Verify cleanup
    await runInDurableObject(sessionTimer, async (instance, state) => {
      expect(await state.storage.get('alarmType')).toBeUndefined();
      expect(await state.storage.get('warningTime')).toBeUndefined();
      expect(await state.storage.get('expirationTime')).toBeUndefined();
      expect(await state.storage.get('firstJoinRole')).toBeUndefined();
    });
  });
});

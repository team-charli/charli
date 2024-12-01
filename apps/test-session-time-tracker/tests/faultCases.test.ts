import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { ConnectionManager } from "../src/connectionManager";

describe("Fault Cases", () => {
  const roomId = "test-room";
  let connectionManager: DurableObjectStub;
  let messageRelay: DurableObjectStub;
  let ws: WebSocket;
  let messages: any[] = [];

  beforeEach(async () => {
    // Reset messages array
    messages = [];

    // Get DO instances
    connectionManager = env.CONNECTION_MANAGER.get(
      env.CONNECTION_MANAGER.idFromName(roomId)
    );

    // Set up WebSocket to catch fault broadcasts
    messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );
    const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    ws = wsResponse.webSocket;
    ws.accept();

    ws.addEventListener('message', (event) => {
      messages.push(JSON.parse(event.data));
    });
  });

  it("should detect and handle late join fault (Fault Case #1)", async () => {
    // First user joins (teacher)
    const teacherPeerId = "teacher-1";
    const joinTime = Date.now() - 200000; // More than 3 minutes ago

    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId: teacherPeerId, role: 'teacher' })
    });

    await connectionManager.fetch('http://connection-manager/handleWebhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:joined',
          payload: {
            id: teacherPeerId,
            roomId,
            joinedAt: joinTime
          }
        }
      })
    });

    // Trigger join sequence check
    await connectionManager.fetch('http://connection-manager/handleWebhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:joined',
          payload: {
            id: 'another-peer',
            roomId,
            joinedAt: Date.now()
          }
        }
      })
    });

    const faultMessage = messages.find(m =>
      m.type === 'fault' &&
      m.data.faultType === 'learnerFault_didnt_join'
    );
    expect(faultMessage).toBeDefined();
  });

  it("should handle second user never joining (Fault Case #2)", async () => {
    const teacherPeerId = "teacher-1";
    const joinTime = Date.now();

    // Set up initial state
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId: teacherPeerId, role: 'teacher' })
    });

    // Simulate SessionTimer fault notification
    await connectionManager.fetch('http://connection-manager/timerFault', {
      method: 'POST',
      body: JSON.stringify({
        faultType: 'noJoin',
        data: { role: 'learner' }
      })
    });

    const faultMessage = messages.find(m =>
      m.type === 'fault' &&
      m.data.faultType === 'secondUser_never_joined'
    );
    expect(faultMessage).toBeDefined();
    expect(faultMessage.data.role).toBe('learner');
  });

  it("should handle reconnection timeout (Fault Case #3)", async () => {
    const teacherPeerId = "teacher-1";

    // Set up initial state and disconnection
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId: teacherPeerId, role: 'teacher' })
    });

    const leftAt = Date.now() - 200000; // More than 3 minutes ago
    await connectionManager.fetch('http://connection-manager/handleWebhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:left',
          payload: {
            id: teacherPeerId,
            roomId,
            leftAt
          }
        }
      })
    });

    // Execute reconnection timeout alarm
    await runDurableObjectAlarm(connectionManager);

    const faultMessage = messages.find(m =>
      m.type === 'fault' &&
      m.data.faultType === 'teacherFault_connection_timeout'
    );
    expect(faultMessage).toBeDefined();
  });

  it("should handle excessive disconnections (Fault Case #4)", async () => {
    const teacherPeerId = "teacher-1";

    // Set up initial state
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId: teacherPeerId, role: 'teacher' })
    });

    // Simulate multiple disconnections
    for (let i = 0; i < 4; i++) {
      await connectionManager.fetch('http://connection-manager/handleWebhook', {
        method: 'POST',
        body: JSON.stringify({
          event: {
            event: 'peer:left',
            payload: {
              id: teacherPeerId,
              roomId,
              leftAt: Date.now() + i * 1000
            }
          }
        })
      });
    }

    // Verify state and fault message
    await runInDurableObject(connectionManager, async (instance: ConnectionManager, state) => {
      const disconnectCount = await state.storage.get<number>('teacher_disconnectCount');
      expect(disconnectCount).toBe(4);
    });

    const faultMessage = messages.find(m =>
      m.type === 'fault' &&
      m.data.faultType === 'teacherFault_excessive_disconnects'
    );
    expect(faultMessage).toBeDefined();
  });

  it("should clear reconnection tracking on successful rejoin", async () => {
    const teacherPeerId = "teacher-1";

    // Set up initial state and disconnection
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId: teacherPeerId, role: 'teacher' })
    });

    // User leaves
    await connectionManager.fetch('http://connection-manager/handleWebhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:left',
          payload: {
            id: teacherPeerId,
            roomId,
            leftAt: Date.now()
          }
        }
      })
    });

    // Verify alarm was set
    await runInDurableObject(connectionManager, async (instance: ConnectionManager) => {
      expect(instance['disconnectionAlarms'].has(`${teacherPeerId}_reconnect`)).toBe(true);
    });

    // User rejoins
    await connectionManager.fetch('http://connection-manager/handleWebhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:joined',
          payload: {
            id: teacherPeerId,
            roomId,
            joinedAt: Date.now()
          }
        }
      })
    });

    // Verify alarm was cleared
    await runInDurableObject(connectionManager, async (instance: ConnectionManager) => {
      expect(instance['disconnectionAlarms'].has(`${teacherPeerId}_reconnect`)).toBe(false);
    });
  });
});

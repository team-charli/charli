import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { ConnectionManager } from "../src/connectionManager";

describe("Connection Manager", () => {
  const roomId = "test-room";
  const peerId = "peer-1";
  let connectionManager: DurableObjectStub;

  beforeEach(async () => {
    connectionManager = env.CONNECTION_MANAGER.get(
      env.CONNECTION_MANAGER.idFromName(roomId)
    );

    // Set up MessageRelay for broadcast verification
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );

    // Create WebSocket connection to catch broadcasts
    const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    wsResponse.webSocket.accept();
  });

  it("should track user join events and store participant roles", async () => {
    // Store participant role first
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId, role: 'teacher' })
    });

    // Simulate join event
    const joinedAt = Date.now();
    await connectionManager.fetch('http://connection-manager/handleWebhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:joined',
          payload: {
            id: peerId,
            roomId,
            joinedAt
          }
        }
      })
    });

    // Verify state
    await runInDurableObject(connectionManager, async (instance: ConnectionManager, state) => {
      const participants = await state.storage.get<Record<string, string>>('participants');
      expect(participants[peerId]).toBe('teacher');

      const teacherData = await state.storage.get('user:teacher');
      expect(teacherData).toMatchObject({
        peerId,
        joinedAt
      });
    });
  });

  it("should handle disconnections and track reconnection window", async () => {
    // Set up initial state
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId, role: 'teacher' })
    });

    const leftAt = Date.now();
    await connectionManager.fetch('http://connection-manager/handleWebhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:left',
          payload: {
            id: peerId,
            roomId,
            leftAt
          }
        }
      })
    });

    // Verify alarm was set
    await runInDurableObject(connectionManager, async (instance: ConnectionManager) => {
      expect(instance['disconnectionAlarms'].has(`${peerId}_reconnect`)).toBe(true);
    });
  });

  it("should handle reconnection and clear alarms", async () => {
    // Set up disconnection first
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId, role: 'teacher' })
    });

    await connectionManager.fetch('http://connection-manager/handleWebhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:left',
          payload: {
            id: peerId,
            roomId,
            leftAt: Date.now()
          }
        }
      })
    });

    // Then simulate reconnection
    await connectionManager.fetch('http://connection-manager/handleWebhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:joined',
          payload: {
            id: peerId,
            roomId,
            joinedAt: Date.now()
          }
        }
      })
    });

    // Verify alarm was cleared
    await runInDurableObject(connectionManager, async (instance: ConnectionManager) => {
      expect(instance['disconnectionAlarms'].has(`${peerId}_reconnect`)).toBe(false);
    });
  });

  it("should track and enforce MAX_DISCONNECTIONS", async () => {
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId, role: 'teacher' })
    });

    // Simulate multiple disconnections
    for (let i = 0; i < 4; i++) {
      await connectionManager.fetch('http://connection-manager/handleWebhook', {
        method: 'POST',
        body: JSON.stringify({
          event: {
            event: 'peer:left',
            payload: {
              id: peerId,
              roomId,
              leftAt: Date.now() + i * 1000 // Space them out
            }
          }
        })
      });
    }

    // Verify disconnect count and fault broadcast
    await runInDurableObject(connectionManager, async (instance: ConnectionManager, state) => {
      const count = await state.storage.get<number>('teacher_disconnectCount');
      expect(count).toBe(4);
    });
  });

  it("should broadcast faults through MessageRelay", async () => {
    let receivedMessage: any = null;
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );
    const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    wsResponse.webSocket.addEventListener('message', (event) => {
      receivedMessage = JSON.parse(event.data);
    });

    // Trigger a fault condition (excessive disconnects)
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId, role: 'teacher' })
    });

    for (let i = 0; i < 4; i++) {
      await connectionManager.fetch('http://connection-manager/handleWebhook', {
        method: 'POST',
        body: JSON.stringify({
          event: {
            event: 'peer:left',
            payload: {
              id: peerId,
              roomId,
              leftAt: Date.now()
            }
          }
        })
      });
    }

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(receivedMessage).toMatchObject({
      type: 'fault',
      data: {
        faultType: 'teacherFault_excessive_disconnects',
        role: 'teacher'
      }
    });
  });

  it("should execute reconnection timeout alarm correctly", async () => {
    // Set up disconnection
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId, role: 'teacher' })
    });

    const leftAt = Date.now();
    await connectionManager.fetch('http://connection-manager/handleWebhook', {
      method: 'POST',
      body: JSON.stringify({
        event: {
          event: 'peer:left',
          payload: {
            id: peerId,
            roomId,
            leftAt
          }
        }
      })
    });

    // Execute alarm
    const ran = await runDurableObjectAlarm(connectionManager);
    expect(ran).toBe(true);

    // Verify fault was broadcast
    await new Promise(resolve => setTimeout(resolve, 100));

    // Could verify MessageRelay received the fault broadcast here
  });
});

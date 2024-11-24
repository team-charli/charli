// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import { WebSocketManager } from '../src/websocketManager';
import type { WebhookData, User } from '../src/types';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";

describe('WebSocket Endpoint', () => {
  const teacherAddress = "0x1234567890123456789012345678901234567890";
  const learnerAddress = "0x9876543210987654321098765432109876543210";
  const roomId = 'test-room';
  let webSocketManagerStub: DurableObjectStub;

  beforeEach(() => {
    const wsId = env.WEBSOCKET_MANAGER.idFromName(roomId);
    webSocketManagerStub = env.WEBSOCKET_MANAGER.get(wsId);
  });

it('should process peer join event and update DO storage', async () => {
  await runInDurableObject(webSocketManagerStub, async (instance: WebSocketManager, state) => {
    // Setup phase
    const hashedTeacherAddressBytes = keccak256(hexToBytes(teacherAddress));
    const hashedLearnerAddressBytes = keccak256(hexToBytes(learnerAddress));
    const hashedTeacherAddress = toHex(hashedTeacherAddressBytes);
    const hashedLearnerAddress = toHex(hashedLearnerAddressBytes);

    // Initialize DO first
    await instance.fetch(new Request('http://localhost/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress,
        hashedLearnerAddress,
        userAddress: teacherAddress,
      }),
    }));

    // Create WebSocket pair
    const pair = new WebSocketPair();
    // Must use state.acceptWebSocket for both ends
    await state.acceptWebSocket(pair[0]);
    await state.acceptWebSocket(pair[1]);

    instance.handleWebSocketConnection(pair[1]);

    // Now safe to send messages
    pair[0].send(JSON.stringify({
      type: 'initConnection',
      data: { role: 'teacher' }
    }));

    // Rest of test...
    const joinedAt = Date.now();
    await instance.processWebhook({
      id: 'event-id',
      event: 'peer:joined',
      payload: {
        id: 'peer-id',
        sessionId: 'session-id',
        roomId,
        joinedAt,
        role: 'teacher'
      },
    });

    // Verify storage
    const teacherData = await instance.state.storage.get('user:teacher') as User;
    expect(teacherData).toMatchObject({
      peerId: 'peer-id',
      joinedAt,
    });

    // Clean up
    pair[0].close();
    pair[1].close();
  });
});

  it('should process peer leave event and handle cleanup', async () => {
    await runInDurableObject(webSocketManagerStub, async (instance: WebSocketManager) => {
      // First initialize and join
      const joinedAt = Date.now();
      await instance.processWebhook({
        id: 'event-id',
        event: 'peer:joined',
        payload: {
          id: 'peer-id',
          sessionId: 'session-id',
          roomId,
          joinedAt,
          role: 'teacher'
        },
      });

      // Process leave
      const leftAt = Date.now() + 1000;
      const duration = leftAt - joinedAt;
      await instance.processWebhook({
        id: 'event-id',
        event: 'peer:left',
        payload: {
          id: 'peer-id',
          sessionId: 'session-id',
          roomId,
          leftAt,
          duration
        },
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify storage
      const teacherData = await instance.state.storage.get('user:teacher') as User;
      expect(teacherData).toMatchObject({
        leftAt,
        duration
      });
    });
  });

  it('should check for fault conditions', async () => {
    await runInDurableObject(webSocketManagerStub, async (instance: WebSocketManager) => {
      // Setup websocket connection
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      instance.handleWebSocketConnection(server);

      // Initialize connection
      client.send(JSON.stringify({
        type: 'initConnection',
        data: { role: 'teacher' }
      }));

      // Create promise for fault message
      const faultPromise = new Promise(resolve => {
        client.addEventListener('message', event => {
          const data = JSON.parse(event.data);
          if (data.type === 'fault') {
            resolve(data);
          }
        });
      });

      // Join teacher
      const teacherJoinedAt = Date.now();
      await instance.processWebhook({
        event: 'peer:joined',
        payload: {
          id: 'teacher-peer',
          roomId,
          joinedAt: teacherJoinedAt,
          role: 'teacher'
        },
      });

      // Join learner late (4 minutes later)
      const learnerJoinedAt = teacherJoinedAt + (4 * 60 * 1000);
      await instance.processWebhook({
        event: 'peer:joined',
        payload: {
          id: 'learner-peer',
          roomId,
          joinedAt: learnerJoinedAt,
          role: 'learner'
        },
      });

      // Wait for fault broadcast
      const faultMessage = await faultPromise;
      expect(faultMessage).toMatchObject({
        type: 'fault',
        data: {
          faultType: 'learnerFault_didnt_join',
        }
      });

      // Cleanup
      client.close();
      server.close();
    });
  });
});

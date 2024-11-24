///Users/zm/Projects/charli/apps/session-time-tracker/tests/webhookEndpoint.test.ts
import { describe, it, expect } from 'vitest';
import { env, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { WebSocketManager } from '../src/websocketManager';
import type { WebhookData, User } from '../src/types';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";

describe('WebSocket Endpoint', () => {
  const teacherAddress = "0x1234567890123456789012345678901234567890";
  const learnerAddress = "0x9876543210987654321098765432109876543210";
  const roomId = 'test-room';
  it('should process peer join event and update DO storage', async () => {
    const wsId = env.WEBSOCKET_MANAGER.idFromName(roomId);
    const webSocketManagerStub = env.WEBSOCKET_MANAGER.get(wsId);

    await runInDurableObject(webSocketManagerStub, async (instance: WebSocketManager) => {
      // Setup phase
      const hashedTeacherAddressBytes = keccak256(hexToBytes(teacherAddress));
      const hashedLearnerAddressBytes = keccak256(hexToBytes(learnerAddress));
      const hashedTeacherAddress = toHex(hashedTeacherAddressBytes);
      const hashedLearnerAddress = toHex(hashedLearnerAddressBytes);

      // Initialize DO
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

      // WebSocket setup
      const wsResponse = await instance.fetch(new Request(`http://localhost/websocket/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      }));

      // Get both sides of the WebSocket pair
      const clientWs = wsResponse.webSocket!;
      clientWs.accept();  // Accept the client side

      // Initialize connection
      clientWs.send(JSON.stringify({
        type: 'initConnection',
        data: { role: 'teacher' }
      }));

      // Wait for connection confirmation
      const confirmationPromise = new Promise(resolve => {
        clientWs.addEventListener('message', event => {
          resolve(JSON.parse(event.data));
        });
      });
      await confirmationPromise;

      // Create webhook event
      const joinedAt = Date.now();
      const webhookEvent: WebhookData = {
        id: 'event-id',
        event: 'peer:joined',
        payload: {
          id: 'peer-id',
          sessionId: 'session-id',
          roomId,
          joinedAt,
          metadata: 'metadata',
          role: 'teacher',
          browser: { name: 'Chrome', version: '90.0' },
          device: { model: 'Pixel', type: 'mobile', vendor: 'Google' },
        },
      };

      // Create promise to capture broadcast message
      const broadcastPromise = new Promise(resolve => {
        clientWs.addEventListener('message', event => {
          resolve(JSON.parse(event.data));
        });
      });

      // Send webhook
      const response = await instance.fetch(new Request('http://localhost/handleWebhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookEvent),
      }));

      expect(response.status).toBe(200);

      // Verify broadcast message
      const message = await broadcastPromise;
      expect(message).toMatchObject({
        type: 'userJoined',
        data: {
          user: expect.objectContaining({
            peerId: 'peer-id',
            joinedAt
          })
        }
      });

      // Verify storage
      const teacherData = await instance.state.storage.get('user:teacher') as User;
      expect(teacherData).toMatchObject({
        peerId: 'peer-id',
        joinedAt
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
  it('should process peer leave event and handle cleanup', async () => {
    const wsId = env.WEBSOCKET_MANAGER.idFromName(roomId);
    const webSocketManagerStub = env.WEBSOCKET_MANAGER.get(wsId);

    await runInDurableObject(webSocketManagerStub, async (instance: WebSocketManager) => {
      // Setup phase
      const hashedTeacherAddressBytes = keccak256(hexToBytes(teacherAddress));
      const hashedLearnerAddressBytes = keccak256(hexToBytes(learnerAddress));
      const hashedTeacherAddress = toHex(hashedTeacherAddressBytes);
      const hashedLearnerAddress = toHex(hashedLearnerAddressBytes);

      // Initialize DO
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

      // WebSocket setup for capturing messages
      const wsResponse = await instance.fetch(new Request(`http://localhost/websocket/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      }));
      const clientWs = wsResponse.webSocket!;
      clientWs.accept();

      // Initialize connection
      clientWs.send(JSON.stringify({
        type: 'initConnection',
        data: { role: 'teacher' }
      }));

      // Wait for connection confirmation
      const confirmationPromise = new Promise(resolve => {
        clientWs.addEventListener('message', event => {
          resolve(JSON.parse(event.data));
        });
      });
      await confirmationPromise;

      // First join the peer
      const joinedAt = Date.now();
      await instance.fetch(new Request('http://localhost/handleWebhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'event-id',
          event: 'peer:joined',
          payload: {
            id: 'peer-id',
            sessionId: 'session-id',
            roomId,
            joinedAt,
            role: 'teacher'
          },
        }),
      }));

      // Prepare to capture leave broadcast
      const broadcastPromise = new Promise(resolve => {
        clientWs.addEventListener('message', event => {
          const data = JSON.parse(event.data);
          if (data.type === 'userLeft') {
            resolve(data);
          }
        });
      });

      // Then process leave event
      const leftAt = Date.now() + 1000; // 1 second later
      const duration = leftAt - joinedAt;

      const leaveResponse = await instance.fetch(new Request('http://localhost/handleWebhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'event-id',
          event: 'peer:left',
          payload: {
            id: 'peer-id',
            sessionId: 'session-id',
            roomId,
            leftAt,
            duration
          },
        }),
      }));

      expect(leaveResponse.status).toBe(200);

      // Verify broadcast
      const message = await broadcastPromise;
      expect(message).toMatchObject({
        type: 'userLeft',
        data: {
          user: expect.objectContaining({
            peerId: 'peer-id',
            leftAt,
            duration
          })
        }
      });

      // Verify storage updates
      const teacherData = await instance.state.storage.get('user:teacher') as User;
      expect(teacherData).toMatchObject({
        leftAt,
        duration
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  it('should check for fault conditions', async () => {
    const wsId = env.WEBSOCKET_MANAGER.idFromName(roomId);
    const webSocketManagerStub = env.WEBSOCKET_MANAGER.get(wsId);

    await runInDurableObject(webSocketManagerStub, async (instance: WebSocketManager) => {
      // Setup phase
      const hashedTeacherAddressBytes = keccak256(hexToBytes(teacherAddress));
      const hashedLearnerAddressBytes = keccak256(hexToBytes(learnerAddress));
      const hashedTeacherAddress = toHex(hashedTeacherAddressBytes);
      const hashedLearnerAddress = toHex(hashedLearnerAddressBytes);

 // Initialize DO with teacher
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

    // Initialize DO with learner
    await instance.fetch(new Request('http://localhost/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress,
        hashedLearnerAddress,
        userAddress: learnerAddress,
      }),
    }));
      // WebSocket setup
      const wsResponse = await instance.fetch(new Request(`http://localhost/websocket/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      }));

      const { webSocket } = wsResponse;
      if (!webSocket) throw new Error('No WebSocket in response');

      webSocket.accept();

      // Store received messages
      const receivedMessages: any[] = [];
      webSocket.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        receivedMessages.push(data);
      });

      // Initialize connection
      webSocket.send(JSON.stringify({
        type: 'initConnection',
        data: { role: 'teacher' }
      }));

      // Wait for connection confirmation
      await new Promise<void>(resolve => {
        const handler = (event: MessageEvent) => {
          const data = JSON.parse(event.data);
          if (data.type === 'connectionConfirmed') {
            resolve();
          }
        };
        webSocket.addEventListener('message', handler);
      });

 // Create a consistent timeline
    const now = Date.now();
    const teacherJoinedAt = now - (4 * 60 * 1000); // 4 minutes ago

    // First simulate teacher join from 4 minutes ago
    await instance.fetch(new Request('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'event-id',
        event: 'peer:joined',
        payload: {
          id: 'teacher-peer',
          sessionId: 'session-id',
          roomId,
          joinedAt: teacherJoinedAt,
          role: 'teacher',
          metadata: 'metadata'
        },
      }),
    }));

    // Wait a moment for storage to update
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check storage to verify teacher joined
    const teacherData = await instance.state.storage.get('user:teacher') as User;
    console.log('Teacher data after join:', teacherData);

    // Now check for fault since learner hasn't joined after 4 minutes
    const learnerData = await instance.state.storage.get('user:learner') as User;
    console.log('Learner data:', learnerData);

    // Trigger fault check by having teacher leave
    await instance.fetch(new Request('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'event-id',
        event: 'peer:left',
        payload: {
          id: 'teacher-peer',
          sessionId: 'session-id',
          roomId,
          leftAt: now,
          duration: 240000 // 4 minutes
        },
      }),
    }));

    // Wait briefly for messages to be processed
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify the messages
    console.log('All messages:', receivedMessages);

    // Check for fault messages
    const faultMessages = receivedMessages.filter(msg => msg.type === 'fault');
    expect(faultMessages.length).toBeGreaterThan(0);
    expect(faultMessages[0].data.faultType).toBe('learnerFault_didnt_join');

    // Verify storage state
    const finalLearnerData = await instance.state.storage.get('user:learner') as User;
    expect(finalLearnerData.faultTime).toBeDefined();
  });
  });
});

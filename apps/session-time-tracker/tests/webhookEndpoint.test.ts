///Users/zm/Projects/charli/apps/session-time-tracker/tests/webhookEndpoint.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import { WebSocketManager } from '../src/websocketManager';
import type { WebhookData, User } from '../src/types';
import { keccak256 } from 'ethers';

describe('Webhook Endpoint', () => {
  let webSocketManagerStub: DurableObjectStub;
  const teacherAddress = "0x1234567890123456789012345678901234567890";
  const learnerAddress = "0x9876543210987654321098765432109876543210";
  const hashedTeacherAddress = keccak256(teacherAddress);
  const hashedLearnerAddress = keccak256(learnerAddress);
  const roomId = 'test-room';

  beforeEach(async () => {
    const id = env.WEBSOCKET_MANAGER.idFromName(roomId);
    webSocketManagerStub = env.WEBSOCKET_MANAGER.get(id);

    // Initialize DO with both users
    await webSocketManagerStub.fetch('http://localhost/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress,
        hashedLearnerAddress,
        userAddress: teacherAddress,
      }),
    });

    await webSocketManagerStub.fetch('http://localhost/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress,
        hashedLearnerAddress,
        userAddress: learnerAddress,
      }),
    });
  });

  it('should process peer join events and update DO state', async () => {
    // First create WebSocket connections to receive broadcasts
    const wsResponse = await webSocketManagerStub.fetch(`http://localhost/websocket/${roomId}`, {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    });
    const ws = wsResponse.webSocket!;

    // Initialize connection
    ws.send(JSON.stringify({
      type: 'initConnection',
      data: { role: 'teacher' }
    }));

    // Wait for connection confirmation
    await new Promise(resolve => {
      ws.addEventListener('message', event => {
        resolve(JSON.parse(event.data));
      });
    });

    // Create promise to capture join broadcast
    const broadcastPromise = new Promise(resolve => {
      ws.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        if (data.type === 'userJoined') resolve(data);
      });
    });

    // Send the webhook event
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

    const response = await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
      body: JSON.stringify(webhookEvent),
    });

    expect(response.status).toBe(200);

    // Verify the broadcast message
    const broadcast = await broadcastPromise;
    expect(broadcast).toMatchObject({
      type: 'userJoined',
      data: {
        user: expect.objectContaining({
          role: 'teacher',
          peerId: 'peer-id',
          joinedAt,
          joinedAtSig: expect.any(String)
        })
      }
    });

    // Verify DO storage was updated
    await runInDurableObject(webSocketManagerStub, async (instance: WebSocketManager) => {
      const teacherData = await instance.state.storage.get('user:teacher') as User;
      expect(teacherData).toMatchObject({
        role: 'teacher',
        peerId: 'peer-id',
        joinedAt,
        joinedAtSig: expect.any(String)
      });
    });
  });

  it('should handle both users joining and start session timer', async () => {
    const wsResponse = await webSocketManagerStub.fetch(`http://localhost/websocket/${roomId}`, {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    });
    const ws = wsResponse.webSocket!;

    // Create promise to capture bothJoined broadcast
    const bothJoinedPromise = new Promise(resolve => {
      ws.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        if (data.type === 'bothJoined') resolve(data);
      });
    });

    // Join teacher
    const teacherJoinedAt = Date.now();
    await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
      body: JSON.stringify({
        id: 'event-id-1',
        event: 'peer:joined',
        payload: {
          id: 'teacher-peer',
          sessionId: 'session-id',
          roomId,
          joinedAt: teacherJoinedAt,
          role: 'teacher'
        },
      }),
    });

    // Join learner
    const learnerJoinedAt = teacherJoinedAt + 1000;
    await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
      body: JSON.stringify({
        id: 'event-id-2',
        event: 'peer:joined',
        payload: {
          id: 'learner-peer',
          sessionId: 'session-id',
          roomId,
          joinedAt: learnerJoinedAt,
          role: 'learner'
        },
      }),
    });

    // Verify bothJoined message and session timer start
    const bothJoinedMessage = await bothJoinedPromise;
    expect(bothJoinedMessage).toMatchObject({
      type: 'bothJoined',
      data: {
        teacher: expect.objectContaining({
          peerId: 'teacher-peer',
          joinedAt: teacherJoinedAt
        }),
        learner: expect.objectContaining({
          peerId: 'learner-peer',
          joinedAt: learnerJoinedAt
        })
      }
    });

    // Verify session timer was started by checking for initiated message
    const initiatedPromise = new Promise(resolve => {
      ws.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        if (data.type === 'initiated') resolve(data);
      });
    });

    const initiatedMessage = await initiatedPromise;
    expect(initiatedMessage).toMatchObject({
      type: 'initiated',
      data: {
        message: expect.any(String),
        timestampMs: expect.any(String)
      }
    });
  });

  it('should track user durations and handle peer leave events', async () => {
    // First join a user
    const joinedAt = Date.now();
    await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
      body: JSON.stringify({
        event: 'peer:joined',
        payload: {
          id: 'peer-id',
          sessionId: 'session-id',
          roomId,
          joinedAt,
          role: 'teacher'
        }
      })
    });

    // Then handle leave event
    const leftAt = joinedAt + 5000; // 5 seconds later
    const duration = leftAt - joinedAt;

    await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
      body: JSON.stringify({
        event: 'peer:left',
        payload: {
          id: 'peer-id',
          sessionId: 'session-id',
          roomId,
          leftAt,
          duration
        }
      })
    });

    // Verify storage updates
    await runInDurableObject(webSocketManagerStub, async (instance: WebSocketManager) => {
      const teacherData = await instance.state.storage.get('user:teacher') as User;
      expect(teacherData).toMatchObject({
        leftAt,
        leftAtSig: expect.any(String),
        duration
      });
    });
  });
});

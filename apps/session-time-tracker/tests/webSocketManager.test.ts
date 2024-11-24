// tests/webSocketManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import { WebSocketManager } from '../src/websocketManager';
import type { WebhookData, User } from '../src/types';
import { keccak256 } from 'ethers';

describe('WebSocket Endpoint', () => {
  let webSocketManagerStub: DurableObjectStub;
  const teacherAddress = "0x1234567890123456789012345678901234567890";
  const learnerAddress = "0x9876543210987654321098765432109876543210";
  const hashedTeacherAddress = keccak256(teacherAddress);
  const hashedLearnerAddress = keccak256(learnerAddress);
  const roomId = 'test-room';

  beforeEach(async () => {
    const id = env.WEBSOCKET_MANAGER.idFromName(roomId);
    webSocketManagerStub = env.WEBSOCKET_MANAGER.get(id);

    // Initialize DO with real addresses
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
  });

  it('should process peer join event and update DO storage', async () => {
    // First establish WebSocket connection
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
      ws.addEventListener('message', event => {
        resolve(JSON.parse(event.data));
      });
    });

    // Send webhook
    const response = await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
      body: JSON.stringify(webhookEvent),
    });

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

    // Verify DO storage was updated
    await runInDurableObject(webSocketManagerStub, async (instance: WebSocketManager) => {
      const teacherData = await instance.state.storage.get('user:teacher') as User;
      expect(teacherData).toMatchObject({
        peerId: 'peer-id',
        joinedAt,
        joinedAtSig: expect.any(String)
      });
    });
  });

  it('should process peer leave event and handle cleanup', async () => {
    // First join the peer
    let joinedAt = Date.now();
    await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
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
    });

    // Then process leave event
    const leftAt = Date.now() + 1000; // 1 second later
    const duration = leftAt - joinedAt;

    const leaveResponse = await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
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
    });

    expect(leaveResponse.status).toBe(200);

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

  it('should check for fault conditions', async () => {
    // Setup: Join first user (teacher)
    const teacherJoinedAt = Date.now();
    await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
      body: JSON.stringify({
        event: 'peer:joined',
        payload: {
          id: 'teacher-peer',
          roomId,
          joinedAt: teacherJoinedAt,
          role: 'teacher'
        },
      }),
    });

    // Join learner more than 3 minutes later (should trigger fault)
    const learnerJoinedAt = teacherJoinedAt + (4 * 60 * 1000); // 4 minutes later

    // Create WebSocket to capture fault broadcast
    const wsResponse = await webSocketManagerStub.fetch(`http://localhost/websocket/${roomId}`, {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    });
    const ws = wsResponse.webSocket!;

    const faultPromise = new Promise(resolve => {
      ws.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        if (data.type === 'fault') {
          resolve(data);
        }
      });
    });

    // Trigger the fault by having learner join late
    await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
      body: JSON.stringify({
        event: 'peer:joined',
        payload: {
          id: 'learner-peer',
          roomId,
          joinedAt: learnerJoinedAt,
          role: 'learner'
        },
      }),
    });

    // Verify fault was recorded
    const faultMessage = await faultPromise;
    expect(faultMessage).toMatchObject({
      type: 'fault',
      data: {
        faultType: 'learnerFault_didnt_join',
        signature: expect.any(String)
      }
    });
  });
});

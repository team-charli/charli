///Users/zm/Projects/charli/apps/test-session-time-tracker/tests/websocketEndpoint.test.ts
import { describe, it, expect } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import { Env, WebhookData } from '../src/types.js';
import { WebSocketManager } from '../src/websocketManager.js';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from 'ethereum-cryptography/utils';
import app from '../src/index.js';
import { vi } from 'vitest';

const mockEnv: Env = {
  HUDDLE_API_KEY: 'test-api-key', // Use a mock value for tests
  WEBSOCKET_MANAGER: env.WEBSOCKET_MANAGER,
  CONNECTION_MANAGER: env.CONNECTION_MANAGER,
  SESSION_TIMER: env.SESSION_TIMER,
  PRIVATE_KEY_SESSION_TIME_SIGNER: 'test-private-key', // Use a mock value for tests
};


vi.mock("@huddle01/server-sdk/webhooks", () => ({
  WebhookReceiver: class {
    constructor() {}
    receive(data: string, signature: string) {
      // This simulates the actual WebhookReceiver's behavior
      if (signature === 'invalid-signature') {
        throw new Error('Invalid headers');
      }
      // Only verify signature, pass through the event data
      return JSON.parse(data);
    }
    createTypedWebhookData(event: string, payload: any) {
      return { data: payload };
    }
  }
}));

describe('POST /websocket', () => {
  const teacherAddress = '1234567890abcdef1234567890abcdef12345678';
  const learnerAddress = 'abcdef1234567890abcdef1234567890abcdef12';
  const roomId = 'test-room';
  it('should process peer:joined webhook event', async () => {
    // Initialize everything within a single runInDurableObject call
    const wsId = env.WEBSOCKET_MANAGER.idFromName(roomId);
    const websocketStub = env.WEBSOCKET_MANAGER.get(wsId);

    await runInDurableObject(websocketStub, async (instance: WebSocketManager) => {
      // Setup phase
      const hashedTeacherAddress = toHex(keccak256(hexToBytes(teacherAddress)));
      const hashedLearnerAddress = toHex(keccak256(hexToBytes(learnerAddress)));

      const initRequest = new globalThis.Request('http://localhost/init', {
        method: 'POST',
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress,
          hashedLearnerAddress,
          userAddress: teacherAddress,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      await instance.fetch(initRequest);

      // Test phase
      const webhookEvent: WebhookData = {
        id: 'event-id',
        event: 'peer:joined',
        payload: {
          id: 'peer-id',
          sessionId: 'session-id',
          roomId: 'test-room',
          joinedAt: Date.now(),
          metadata: 'metadata',
          role: 'teacher',
          browser: { name: 'Chrome', version: '90.0' },
          device: { model: 'Pixel', type: 'mobile', vendor: 'Google' },
        },
      };

      const response = await instance.fetch(new Request('http://localhost/handleWebhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookEvent),
      }));

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe('OK');

      // Process all related alarms before exiting the runInDurableObject context
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  it('should return error for invalid signature', async () => {
    const wsId = env.WEBSOCKET_MANAGER.idFromName(roomId);
    const websocketStub = env.WEBSOCKET_MANAGER.get(wsId);

    await runInDurableObject(websocketStub, async (instance: WebSocketManager) => {
      // Setup phase (same as before)
      const hashedTeacherAddress = toHex(keccak256(hexToBytes(teacherAddress)));
      const hashedLearnerAddress = toHex(keccak256(hexToBytes(learnerAddress)));

      await instance.fetch(new Request('http://localhost/init', {
        method: 'POST',
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress,
          hashedLearnerAddress,
          userAddress: teacherAddress,
        }),
        headers: { 'Content-Type': 'application/json' },
      }));

      // Test phase - this should now go to the Worker
      const webhookEvent: WebhookData = {
        id: 'event-id',
        event: 'peer:joined',
        payload: {
          id: 'peer-id',
          sessionId: 'session-id',
          roomId: 'test-room',
          joinedAt: Date.now(),
          metadata: 'metadata',
          role: 'teacher',
          browser: { name: 'Chrome', version: '90.0' },
          device: { model: 'Pixel', type: 'mobile', vendor: 'Google' },
        },
      };

      const response = await app.fetch(new Request('http://localhost/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'huddle01-signature': 'invalid-signature'
        },
        body: JSON.stringify(webhookEvent),
      }), mockEnv);

      expect(response.status).toBe(401);
      const data = await response.json() as { status: string; message: string };
      expect(data.status).toBe('error');
      expect(data.message).toBe('Invalid signature');

      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  it('should return error for unsupported event type', async () => {
    const wsId = env.WEBSOCKET_MANAGER.idFromName(roomId);
    const websocketStub = env.WEBSOCKET_MANAGER.get(wsId);

    await runInDurableObject(websocketStub, async (instance: WebSocketManager) => {
      // Setup phase
      const hashedTeacherAddress = toHex(keccak256(hexToBytes(teacherAddress)));
      const hashedLearnerAddress = toHex(keccak256(hexToBytes(learnerAddress)));

      await instance.fetch(new Request('http://localhost/init', {
        method: 'POST',
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress,
          hashedLearnerAddress,
          userAddress: teacherAddress,
        }),
        headers: { 'Content-Type': 'application/json' },
      }));

      // Test phase - actually using the Worker endpoint
      const webhookEvent = {
        id: 'event-id',
        event: 'unsupported:event',
        payload: {},
      } as unknown as WebhookData;

      const response = await app.fetch(new Request('http://localhost/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'huddle01-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent),
      }), mockEnv);

      expect(response.status).toBe(400);
      const data = await response.json() as { status: string; message: string };
      expect(data.status).toBe('error');
      expect(data.message).toBe('Unsupported event type');

      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
});


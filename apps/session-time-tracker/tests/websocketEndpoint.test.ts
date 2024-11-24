// tests/websocketEndpoint.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test'; // Adjust imports for vitest-pool-workers
import { WebhookData } from '../src/types.js';

describe('POST /websocket', () => {
  let websocketStub: DurableObjectStub;

  beforeEach(async () => {
    const id = env.WEBSOCKET_MANAGER.newUniqueId();
    websocketStub = env.WEBSOCKET_MANAGER.get(id);

    // Use the existing `/init` endpoint to set up initial state for the Durable Object
    await runInDurableObject(websocketStub, async (instance: any) => {
      const request = new globalThis.Request('http://localhost/init', {  // Use globalThis for Request
        method: 'POST',
        body: JSON.stringify({
          clientSideRoomId: 'test-room',
          hashedTeacherAddress: 'hashedTeacherAddress',
          hashedLearnerAddress: 'hashedLearnerAddress',
          userAddress: 'hashedTeacherAddress',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      await instance.fetch(request);
    });
  });

  it('should process peer:joined websocket event', async () => {
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

    const response = await (websocketStub as any).fetch('http://localhost/websocket', {  // Type assertion for TypeScript
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
      body: JSON.stringify(webhookEvent),
    });

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('Webhook processed successfully');
  });

  it('should return error for invalid signature', async () => {
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

    const response = await (websocketStub as any).fetch('http://localhost/websocket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'invalid-signature' },
      body: JSON.stringify(webhookEvent),
    });

    expect(response.status).toBe(401);
    const data = await response.json() as { status: string; message: string };

    expect(data.status).toBe('error');
    expect(data.message).toBe('Invalid signature');
  });

  it('should return error for unsupported event type', async () => {
    const webhookEvent = {
      id: 'event-id',
      event: 'unsupported:event',
      payload: {},
    } as unknown as WebhookData; // Cast to unknown first

    const response = await (websocketStub as any).fetch('http://localhost/websocket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'huddle01-signature': 'valid-signature' },
      body: JSON.stringify(webhookEvent),
    });

    expect(response.status).toBe(400);
    const data = await response.json() as { status: string; message: string };

    expect(data.status).toBe('error');
    expect(data.message).toBe('Unsupported event type');
  });
});

// tests/sessionTimer.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { SessionTimer } from '../src/sessionTimer';
import type { Message } from '../src/websocketManager';

vi.mock('ethers', () => ({
  Wallet: class MockWallet {
    signMessage = vi.fn().mockResolvedValue('test-signature');
    constructor(public privateKey: string) {}
  }
}));

describe('SessionTimer Durable Object', () => {
  let sessionTimerStub: DurableObjectStub;
  let webSocketManagerStub: DurableObjectStub;
  const roomId = 'test-room';

  beforeEach(async () => {
    const id = env.SESSION_TIMER.idFromName(roomId);
    sessionTimerStub = env.SESSION_TIMER.get(id);

    // Get WebSocket Manager stub for message verification
    const wsId = env.WEBSOCKET_MANAGER.idFromName(roomId);
    webSocketManagerStub = env.WEBSOCKET_MANAGER.get(wsId);

    // Create WebSocket connection to receive broadcasts
    const wsResponse = await webSocketManagerStub.fetch(`http://localhost/websocket/${roomId}`, {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    });
    const ws = wsResponse.webSocket!;

    // Initialize WebSocket connection
    ws.send(JSON.stringify({
      type: 'initConnection',
      data: { role: 'teacher' }
    }));
    // Wait for connection confirmation
    await new Promise(resolve => {
      ws.addEventListener('message', event => {
        const data = parseWSMessage(event.data);
        if (data.type === 'connectionConfirmed') resolve(data);
      });
    });
  });

    it('should start session timer and broadcast initiation message', async () => {
      // Create promise to capture broadcast
      const broadcastPromise = new Promise(resolve => {
        webSocketManagerStub.fetch(`http://localhost/websocket/${roomId}`).then(response => {
          const ws = response.webSocket!;
          ws.addEventListener('message', event => {
            const data = parseWSMessage(event.data);
            if (data.type === 'initiated') resolve(data);
          });
        });
      });

      const duration = 3600000; // 1 hour
      await sessionTimerStub.fetch('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration,
          hashedTeacherAddress: 'test-teacher-hash',
          hashedLearnerAddress: 'test-learner-hash',
        }),
      });

      // Verify initiation broadcast
      const initiationMessage = await broadcastPromise as Message;
      expect(initiationMessage).toMatchObject({
        type: 'initiated',
        data: {
          message: 'Timer initiated',
          timestampMs: expect.any(String),
          signature: 'test-signature'
        }
      });

      // Verify storage state
      await runInDurableObject(sessionTimerStub, async (instance: SessionTimer) => {
        const alarmType = await instance.state.storage.get('alarmType');
        const expirationTime = await instance.state.storage.get<number>('expirationTime');

        expect(alarmType).toBe('warning');
        expect(expirationTime).toBeGreaterThan(Date.now());
        expect(expirationTime).toBe(Date.now() + duration);
      });
    });

    it('should handle warning alarm and setup expiration', async () => {
      // Setup session timer
      const duration = 300000; // 5 minutes
      await sessionTimerStub.fetch('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration,
          hashedTeacherAddress: 'test-teacher-hash',
          hashedLearnerAddress: 'test-learner-hash',
        }),
      });

      // Create promise to capture warning broadcast
      const warningPromise = new Promise(resolve => {
        webSocketManagerStub.fetch(`http://localhost/websocket/${roomId}`).then(response => {
          const ws = response.webSocket!;
          ws.addEventListener('message', event => {
            const data = parseWSMessage(event.data);
            if (data.type === 'warning') resolve(data);
          });
        });
      });

      // Trigger warning alarm
      const ran = await runDurableObjectAlarm(sessionTimerStub);
      expect(ran).toBe(true);

      // Verify warning broadcast
      const warningMessage = await warningPromise as Message;
      expect(warningMessage).toMatchObject({
        type: 'warning',
        data: {
          message: '3-minute warning'
        }
      });

      // Verify state transition
      await runInDurableObject(sessionTimerStub, async (instance: SessionTimer) => {
        const alarmType = await instance.state.storage.get('alarmType');
        expect(alarmType).toBe('expired');
      });
    });

    it('should handle expiration alarm and cleanup', async () => {
      // Setup timer in expired state
      await runInDurableObject(sessionTimerStub, async (instance: SessionTimer) => {
        await instance.state.storage.put('alarmType', 'expired');
        await instance.state.storage.put('expirationTime', Date.now());
      });

      // Create promise to capture expiration broadcast
      const expirationPromise = new Promise(resolve => {
        webSocketManagerStub.fetch(`http://localhost/websocket/${roomId}`).then(response => {
          const ws = response.webSocket!;
          ws.addEventListener('message', event => {
            const data = parseWSMessage(event.data);
            if (data.type === 'expired') resolve(data);
          });
        });
      });

      // Trigger expiration alarm
      const ran = await runDurableObjectAlarm(sessionTimerStub);
      expect(ran).toBe(true);

      // Verify expiration broadcast
      const expirationMessage = await expirationPromise as Message;
      expect(expirationMessage).toMatchObject({
        type: 'expired',
        data: {
          message: 'Time expired',
          timestampMs: expect.any(String),
          signature: 'test-signature'
        }
      });

      // Verify cleanup
      await runInDurableObject(sessionTimerStub, async (instance: SessionTimer) => {
        const alarmType = await instance.state.storage.get('alarmType');
        const expirationTime = await instance.state.storage.get('expirationTime');

        expect(alarmType).toBeUndefined();
        expect(expirationTime).toBeUndefined();
      });

      // Verify no more alarms
      const noMoreAlarms = await runDurableObjectAlarm(sessionTimerStub);
      expect(noMoreAlarms).toBe(false);
    });
  function parseWSMessage(data: string | ArrayBuffer): any {
    if (data instanceof ArrayBuffer) {
      return JSON.parse(new TextDecoder().decode(data));
    }
    return JSON.parse(data);
  }
})

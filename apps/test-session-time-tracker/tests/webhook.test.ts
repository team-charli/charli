// test/webhook.test.ts
import { SELF, env, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";
import { SessionManager } from "../src";
import { User } from "../src/types";

describe("Webhook Handler", () => {
  let ws: WebSocket | undefined;
  let roomId: string;
  let teacherAddress: string;
  let learnerAddress: string;
  let teacherHash: string;
  let learnerHash: string;
  const mockApiKey = "test-api-key";

  // Generate fresh IDs before each test
  beforeEach(() => {
    const testId = crypto.randomUUID();
    roomId = `room-${testId}`;
    teacherAddress = `0x${testId.slice(0, 8)}`;
    learnerAddress = `0x${testId.slice(24, 32)}`;
    teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
    learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));
  });

  vi.mock('@huddle01/server-sdk/webhooks', () => ({
    WebhookReceiver: class {
      constructor() {}
      receive(body: string) {
        return typeof body === 'string' ? JSON.parse(body) : body;
      }
      createTypedWebhookData(event: string, payload: any) {
        return { event, data: payload[0].data };
      }
    }
  }));

  async function cleanup() {
    // 1. Close any open WebSocket connections
    if (ws) {
      ws.close();
      await new Promise(resolve => setTimeout(resolve, 100));
      ws = undefined;
    }

    // 2. Get stubs in dependency order
    const stubs = {
      sessionTimer: env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId)),
      connectionManager: env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId)),
      sessionManager: env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId)),
      messageRelay: env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId))
    };

    // 3. Clean in reverse dependency order
    for (const [name, stub] of Object.entries(stubs).reverse()) {
      try {
        console.log(`Cleaning up ${name}...`);

        // Run any pending alarms
        await runDurableObjectAlarm(stub);

        // Clear storage
        await runInDurableObject(stub, async (instance, state) => {
          await state.blockConcurrencyWhile(async () => {
            const keys = await state.storage.list();
            console.log(`${name} storage keys:`, keys);

            await state.storage.deleteAll();
            await state.storage.deleteAlarm();
          });
        });
      } catch (error) {
        console.error(`Error cleaning up ${name}:`, error);
        throw error;
      } finally {
        stub[Symbol.dispose]?.();
      }
    }
  }

  beforeEach(() => {
    vi.resetModules();
    cleanup();
  });
  afterEach(cleanup);

  it("should establish session and handle webhook events", async () => {
    const sessionManagerStub = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );

    try {
      // First establish WebSocket connection
      const wsResponse = await SELF.fetch(`http://test.local/connect/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      expect(wsResponse.status).toBe(101); // WebSocket upgrade successful
      ws = wsResponse.webSocket;
      expect(ws).toBeDefined();
      ws.accept(); // Accept the WebSocket connection from the client side

      // 1. First verify initial state by direct DO access
      await runInDurableObject(sessionManagerStub, async (instance, state) => {
        const teacherData = await state.storage.get('user:teacher');
        expect(teacherData).toBeUndefined();
      });

      // 2. Initialize session through main worker
      const initResponse = await SELF.fetch("http://test.local/init", {
        method: "POST",
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: 3600000
        })
      });
      expect(initResponse.status).toBe(200);

      // 3. Send webhook through main worker
      const webhookResponse = await SELF.fetch("http://test.local/webhook", {
        method: "POST",
        headers: {
          "huddle01-signature": mockApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event: 'peer:joined',
          payload: [{
            data: {
              id: 'peer-1',
              sessionId: 'test-session',
              roomId: roomId,
              joinedAt: Date.now(),
              metadata: JSON.stringify({
                hashedAddress: teacherHash,
                role: 'teacher'
              })
            }
          }]
        })
      });
      expect(webhookResponse.status).toBe(200);

      // 4. Verify final state
      await runInDurableObject(sessionManagerStub, async (instance, state) => {
        const teacherData = await state.storage.get('user:teacher') as User;
        console.log('Final teacher data:', teacherData);
        expect(teacherData.peerId).toBe('peer-1');
      });
    } finally {
      sessionManagerStub[Symbol.dispose]?.();
    }
  });
});

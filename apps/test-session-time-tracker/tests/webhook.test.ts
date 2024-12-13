// test/webhook.test.ts
import { SELF, env, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";
import { SessionManager } from "../src";
import { User } from "../src/types";
import { cloneElement } from "hono/jsx";

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
        // console.log(`Cleaning up ${name}...`);

        // Run any pending alarms
        await runDurableObjectAlarm(stub);

        // Clear storage
        await runInDurableObject(stub, async (instance, state) => {
          await state.blockConcurrencyWhile(async () => {
            const keys = await state.storage.list();
            // console.log(`${name} storage keys:`, keys);

            await state.storage.deleteAll();
            await state.storage.deleteAlarm();
          });
        });
      } catch (error) {
        // console.error(`Error cleaning up ${name}:`, error);
        throw error;
      } finally {
        stub[Symbol.dispose]?.();
      }
    }
  }

  beforeEach(async () => {
    // vi.resetModules();
    await cleanup();
  });
  afterEach(async () => {
    await cleanup();
  });

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
        const teacherData = await (state.storage.get('user:teacher')) as User;
        expect(teacherData).toBeUndefined();
      });

      // 2. Initialize session through main worker
      const initResponse = await SELF.fetch("http://test.local/init", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
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
        // console.log('Final teacher data:', teacherData);
        expect(teacherData.peerId).toBe('peer-1');
      });
    } finally {
      sessionManagerStub[Symbol.dispose]?.();
    }
  });
  it("should require WebSocket connection before init", async () => {
    try {
      // First attempt - without WebSocket - should fail
      const initResponse = await SELF.fetch("http://test.local/init", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: 3600000
        })
      });
      expect(initResponse.status).toBe(400);

      // Establish WebSocket connection
      const wsResponse = await SELF.fetch(`http://test.local/connect/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      expect(wsResponse.status).toBe(101);
      ws = wsResponse.webSocket;
      expect(ws).toBeDefined();
      ws.accept();

      // Test with WebSocket established
      const successResponse = await SELF.fetch("http://test.local/init", {
        headers: { 'Content-Type': 'application/json' },
        method: "POST",
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: 3600000
        })
      });
      expect(successResponse.status).toBe(200);
    } finally {
      if (ws) ws[Symbol.dispose]?.();
    }
  });

  it("should handle peer:left webhook event", async () => {
    const sessionManagerStub = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId));

    try {
      // Establish WebSocket
      const wsResponse = await SELF.fetch(`http://test.local/connect/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      expect(wsResponse.status).toBe(101);
      ws = wsResponse.webSocket;
      expect(ws).toBeDefined();
      ws.accept();

      const messages: any[] = [];
      ws.addEventListener('message', (event) => {
        messages.push(JSON.parse(event.data));
      });

      // Initialize session
      const initResponse = await SELF.fetch("http://test.local/init", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: 3600000
        })
      });
      expect(initResponse.status).toBe(200);

      const joinedAt = Date.now();
      const leftAt = joinedAt + 60000;

      // Send join webhook
      await SELF.fetch("http://test.local/webhook", {
        method: "POST",
        headers: {
          "huddle01-signature": mockApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: 'test-id',
          event: 'peer:joined',
          payload: [{
            data: {
              id: 'peer-1',
              sessionId: 'test-session',
              roomId: roomId,
              joinedAt,
              metadata: JSON.stringify({
                hashedAddress: teacherHash,
                role: 'teacher'
              })
            }
          }]
        })
      });

      // Verify join state
      await runInDurableObject(sessionManagerStub, async (instance, state) => {
        const teacherData = await (state.storage.get('user:teacher')) as User;
        expect(teacherData.peerId).toBe('peer-1');
      });

      // Send leave webhook
      await SELF.fetch("http://test.local/webhook", {
        method: "POST",
        headers: {
          "huddle01-signature": mockApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: 'test-id',
          event: 'peer:left',
          payload: [{
            data: {
              id: 'peer-1',
              sessionId: 'test-session',
              roomId: roomId,
              leftAt,
              duration: 60000
            }
          }]
        })
      });

      // Wait for and verify messages
      await new Promise(resolve => setTimeout(resolve, 100));
      // console.log("should handle peer:left webhook event: leftAt", leftAt)
      // console.log("messages", messages);

      const leftMessage = messages.find(m => m.type === 'userLeft');
      // console.log("should handle peer:left webhook event: leftAtMessage", leftMessage)

      expect(leftMessage).toBeDefined();
      expect(leftMessage.data.leftAt).toBe(leftAt);

    } finally {
      sessionManagerStub[Symbol.dispose]?.();
    }
  });

  // it("should handle meeting lifecycle webhooks", async () => {
  //   const sessionManagerStub = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId));

  //   try {
  //     // Establish WebSocket
  //     const wsResponse = await SELF.fetch(`http://test.local/connect/${roomId}`, {
  //       headers: {
  //         'Upgrade': 'websocket',
  //         'Connection': 'Upgrade'
  //       }
  //     });
  //     expect(wsResponse.status).toBe(101);
  //     ws = wsResponse.webSocket;
  //     expect(ws).toBeDefined();
  //     ws.accept();

  //     const messages: any[] = [];
  //     ws.addEventListener('message', (event) => {
  //       messages.push(JSON.parse(event.data));
  //     });

  //     // Initialize session
  //     await SELF.fetch("http://test.local/init", {
  //       method: "POST",
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         clientSideRoomId: roomId,
  //         hashedTeacherAddress: teacherHash,
  //         hashedLearnerAddress: learnerHash,
  //         userAddress: teacherAddress,
  //         sessionDuration: 3600000
  //       })
  //     });

  //     const startTime = Date.now();
  //     const endTime = startTime + 3600000;

  //     // Send meeting started webhook
  //     await SELF.fetch("http://test.local/webhook", {
  //       method: "POST",
  //       headers: {
  //         "huddle01-signature": mockApiKey,
  //         "Content-Type": "application/json"
  //       },
  //       body: JSON.stringify({
  //         id: 'test-id',
  //         event: 'meeting:started',
  //         payload: [{
  //           data: {
  //             roomId,
  //             sessionId: 'test-session',
  //             createdAt: startTime
  //           }
  //         }]
  //       })
  //     });

  //     // Send meeting ended webhook
  //     await SELF.fetch("http://test.local/webhook", {
  //       method: "POST",
  //       headers: {
  //         "huddle01-signature": mockApiKey,
  //         "Content-Type": "application/json"
  //       },
  //       body: JSON.stringify({
  //         id: 'test-id',
  //         event: 'meeting:ended',
  //         payload: [{
  //           data: {
  //             roomId,
  //             sessionId: 'test-session',
  //             createdAt: startTime,
  //             endedAt: endTime,
  //             duration: 3600000,
  //             participants: 2,
  //             maxParticipants: 2
  //           }
  //         }]
  //       })
  //     });

  //     // Verify meeting events
  //     await new Promise(resolve => setTimeout(resolve, 100));
  //     expect(messages.some(m => m.type === 'meetingStarted')).toBe(true);
  //     expect(messages.some(m => m.type === 'meetingEnded')).toBe(true);

  //   } finally {
  //     sessionManagerStub[Symbol.dispose]?.();
  //   }
  // });

  it("should handle sequential peer joins and bothJoined state", async () => {
    const sessionManagerStub = env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId));
    const connectionManagerStub = env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId));

    try {
      // Establish WebSocket
      const wsResponse = await SELF.fetch(`http://test.local/connect/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      expect(wsResponse.status).toBe(101);
      ws = wsResponse.webSocket;
      expect(ws).toBeDefined();
      ws.accept();

      const messages: any[] = [];
      ws.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        // console.log('Received WebSocket message:', data);
        messages.push(data);
      });

      // Initialize session
      await SELF.fetch("http://test.local/init", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: 3600000
        })
      });
      await SELF.fetch("http://test.local/init", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: learnerAddress,  // Learner's address
          sessionDuration: 3600000
        })
      });
      const startTime = Date.now();

      // Teacher joins
      await SELF.fetch("http://test.local/webhook", {
        method: "POST",
        headers: {
          "huddle01-signature": mockApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: 'test-id',
          event: 'peer:joined',
          payload: [{
            data: {
              id: 'peer-1',
              sessionId: 'test-session',
              roomId: roomId,
              joinedAt: startTime,
              metadata: JSON.stringify({
                hashedAddress: teacherHash,
                role: 'teacher'
              })
            }
          }]
        })
      });

      // Verify teacher state in both DOs
      await runInDurableObject(sessionManagerStub, async (instance, state) => {
        const teacherData = await state.storage.get('user:teacher') as User;
        // console.log('SessionManager teacher state:', teacherData);
        expect(teacherData.peerId).toBe('peer-1');
      });

      await runInDurableObject(connectionManagerStub, async (instance, state) => {
        const participants = await state.storage.get<Record<string, string>>('participants');
        const joinTimes = await state.storage.get<Record<string, number>>('joinTimes');
        // console.log('ConnectionManager state after teacher:', { participants, joinTimes });
        expect(participants?.['peer-1']).toBe('teacher');
        expect(joinTimes?.['teacher']).toBe(startTime);
      });

      // Learner joins
      await SELF.fetch("http://test.local/webhook", {
        method: "POST",
        headers: {
          "huddle01-signature": mockApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: 'test-id',
          event: 'peer:joined',
          payload: [{
            data: {
              id: 'peer-2',
              sessionId: 'test-session',
              roomId: roomId,
              joinedAt: startTime + 30000,
              metadata: JSON.stringify({
                hashedAddress: learnerHash,
                role: 'learner'
              })
            }
          }]
        })
      });

      // Helper function to wait for messages with polling
      const waitForMessages = async (predicate: (messages: any[]) => boolean, timeoutMs = 500) => {
        const startWait = Date.now();
        while (Date.now() - startWait < timeoutMs) {
          if (predicate(messages)) return true;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        // console.log('Current messages after timeout:', messages);
        return false;
      };

      // Verify final DO states
      await runInDurableObject(connectionManagerStub, async (instance, state) => {
        const participants = await state.storage.get<Record<string, string>>('participants');
        const joinTimes = await state.storage.get<Record<string, number>>('joinTimes');
        // console.log('ConnectionManager final state:', { participants, joinTimes });
        expect(participants?.['peer-1']).toBe('teacher');
        expect(participants?.['peer-2']).toBe('learner');
        expect(joinTimes?.['teacher']).toBe(startTime);
        expect(joinTimes?.['learner']).toBe(startTime + 30000);
      });

      // Verify all expected messages were received
      expect(
        await waitForMessages(msgs =>
          msgs.some(m => m.type === 'userJoined' && m.data.role === 'teacher') &&
            msgs.some(m => m.type === 'userJoined' && m.data.role === 'learner') &&
            msgs.some(m => m.type === 'bothJoined')
        )
      ).toBe(true);

    } finally {
      sessionManagerStub[Symbol.dispose]?.();
      connectionManagerStub[Symbol.dispose]?.();
    }
  });
});

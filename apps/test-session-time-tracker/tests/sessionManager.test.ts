import { env, runInDurableObject } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { SessionManager } from "../src/sessionManager";
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";
import type { User } from "../src/types";

describe("Session Manager", () => {
  const roomId = "test-room";
  const teacherAddress = "0x1234";
  const learnerAddress = "0x5678";
  const teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
  const learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));
  const sessionDuration = 3600000; // 1 hour in ms

  // Helper function to cleanup storage across all related DOs
  async function cleanup() {
    const stubs = [
      env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId)),
      env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId)),
      env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId)),
      env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId))
    ];

    await Promise.all(stubs.map(stub =>
      runInDurableObject(stub, async (instance, state) => {
        await state.blockConcurrencyWhile(async () => {
          await state.storage.deleteAll();
        });
      })
    ));
  }

  // Helper to create initialization request
  function createInitRequest(userAddress: string): Request {
    return new Request('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress,
        sessionDuration
      })
    });
  }

  beforeEach(async () => {
    await cleanup();
  });

  describe("Direct DO instantiation and initialization", () => {
    it("should properly instantiate with necessary properties", async () => {
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      await runInDurableObject(sessionManager, async (instance) => {
        expect(instance).toBeInstanceOf(SessionManager);
        expect(instance['roomId']).toBe(roomId);
      });
    });
  });

  describe("User address validation and state storage", () => {
    it("should validate teacher address and store state atomically", async () => {
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      await runInDurableObject(sessionManager, async (instance, state) => {
        await state.blockConcurrencyWhile(async () => {
          const request = createInitRequest(teacherAddress);
          const response = await instance.fetch(request);

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.role).toBe('teacher');
          expect(data.roomId).toBe(roomId);

          const storedUser = await state.storage.get('user:teacher') as User;
          expect(storedUser).toMatchObject({
            role: 'teacher',
            roomId,
            hashedTeacherAddress: teacherHash,
            hashedLearnerAddress: learnerHash,
            sessionDuration,
            peerId: null,
            joinedAt: null,
            leftAt: null
          });
        });
      });
    });

    it("should reject invalid user addresses", async () => {
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      await runInDurableObject(sessionManager, async (instance) => {
        const request = createInitRequest("0xInvalid");
        const response = await instance.fetch(request);
        expect(response.status).toBe(403);
      });
    });
  });

  describe("DO communication patterns", () => {
    it("should communicate with ConnectionManager on initialization", async () => {
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      await runInDurableObject(sessionManager, async (instance) => {
        const request = createInitRequest(teacherAddress);
        await instance.fetch(request);

        // Verify ConnectionManager received the update
        const connectionManager = env.CONNECTION_MANAGER.get(
          env.CONNECTION_MANAGER.idFromName(roomId)
        );

        await runInDurableObject(connectionManager, async (cm, cmState) => {
          const participants = await cmState.storage.get('participants');
          expect(participants).toBeDefined();
        });
      });
    });

    it("should forward webhook events to ConnectionManager", async () => {
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      await runInDurableObject(sessionManager, async (instance) => {
        // Initialize first
        await instance.fetch(createInitRequest(teacherAddress));

        // Send webhook event
        const webhookRequest = new Request('http://session-manager/webhook', {
          method: 'POST',
          body: JSON.stringify({
            event: {
              event: 'peer:joined',
              payload: {
                id: 'peer-1',
                roomId,
                sessionId: 'test-session',
                joinedAt: Date.now(),
                metadata: JSON.stringify({ role: 'teacher' })
              }
            }
          })
        });

        const response = await instance.fetch(webhookRequest);
        expect(response.status).toBe(200);

        // Verify ConnectionManager received the webhook
        const connectionManager = env.CONNECTION_MANAGER.get(
          env.CONNECTION_MANAGER.idFromName(roomId)
        );

        await runInDurableObject(connectionManager, async (cm, cmState) => {
          const teacherData = await cmState.storage.get('user:teacher');
          expect(teacherData).toBeDefined();
        });
      });
    });
    it("should communicate with MessageRelay", async () => {
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      await runInDurableObject(sessionManager, async (instance) => {
        await instance.fetch(createInitRequest(teacherAddress));

        const messageRelay = env.MESSAGE_RELAY.get(
          env.MESSAGE_RELAY.idFromName(roomId)
        );

        await runInDurableObject(messageRelay, async (mr, mrState) => {
          // Verify broadcast was attempted
          const broadcasts = await mrState.storage.get('broadcasts');
          expect(broadcasts).toBeDefined();
        });
      });
    });
  });

  describe("Session duration handling", () => {
    it("should initialize SessionTimer on first user join", async () => {
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      await runInDurableObject(sessionManager, async (instance) => {
        // Initialize and join first user
        await instance.fetch(createInitRequest(teacherAddress));

        const joinedAt = Date.now();
        const webhookRequest = new Request('http://session-manager/webhook', {
          method: 'POST',
          body: JSON.stringify({
            event: {
              event: 'peer:joined',
              payload: {
                id: 'peer-1',
                roomId,
                sessionId: 'test-session',
                joinedAt,
                metadata: JSON.stringify({ role: 'teacher' })
              }
            }
          })
        });

        await instance.fetch(webhookRequest);

        // Verify SessionTimer was initialized
        const sessionTimer = env.SESSION_TIMER.get(
          env.SESSION_TIMER.idFromName(roomId)
        );

        await runInDurableObject(sessionTimer, async (st, stState) => {
          const firstJoinRole = await stState.storage.get('firstJoinRole');
          expect(firstJoinRole).toBe('teacher');

          const alarmType = await stState.storage.get('alarmType');
          expect(alarmType).toBe('joinWindow');
        });
      });
    });

    it("should handle session duration correctly", async () => {
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      await runInDurableObject(sessionManager, async (instance, state) => {
        const customDuration = 7200000; // 2 hours
        const request = createInitRequest(teacherAddress);
        request.body = JSON.stringify({
          ...JSON.parse(request.body as string),
          sessionDuration: customDuration
        });

        await instance.fetch(request);

        const teacher = await state.storage.get('user:teacher') as User;
        expect(teacher.sessionDuration).toBe(customDuration);
      });
    });
  });
});

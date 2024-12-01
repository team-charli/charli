import { env, runInDurableObject } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { SessionManager } from "../src/sessionManager";
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";

describe("Session Manager", () => {
  const roomId = "test-room";
  const teacherAddress = "0x1234";
  const learnerAddress = "0x5678";
  const teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
  const learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));
  const sessionDuration = 3600000; // 1 hour

  it("should instantiate and initialize correctly", async () => {
    const sessionManager = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );

    // Test direct access to instance
    await runInDurableObject(sessionManager, async (instance: SessionManager) => {
      expect(instance.state).toBeDefined();
      expect(instance.app).toBeDefined();
    });
  });

  it("should validate teacher address and store state", async () => {
    const sessionManager = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );

    const response = await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress: teacherAddress,
        sessionDuration
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.role).toBe('teacher');
    expect(data.roomId).toBe(roomId);

    // Verify state storage
    await runInDurableObject(sessionManager, async (instance: SessionManager, state) => {
      const storedUser = await state.storage.get('user:teacher');
      expect(storedUser).toMatchObject({
        role: 'teacher',
        roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        sessionDuration
      });
    });
  });

  it("should reject invalid user addresses", async () => {
    const sessionManager = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );

    const response = await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress: "0xINVALID",
        sessionDuration
      })
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.message).toBe("User address doesn't match teacher or learner address");
  });

  it("should maintain state between requests", async () => {
    const sessionManager = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );

    // First request - teacher init
    await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress: teacherAddress,
        sessionDuration
      })
    });

    // Second request - learner init
    const response = await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress: learnerAddress,
        sessionDuration
      })
    });

    // Verify both states exist
    await runInDurableObject(sessionManager, async (instance: SessionManager, state) => {
      const teacher = await state.storage.get('user:teacher');
      const learner = await state.storage.get('user:learner');

      expect(teacher).toBeDefined();
      expect(learner).toBeDefined();
      expect(teacher.role).toBe('teacher');
      expect(learner.role).toBe('learner');
    });
  });

  it("should properly handle webhook events and update state", async () => {
    const sessionManager = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );

    // Initialize session first
    await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress: teacherAddress,
        sessionDuration
      })
    });

    // Send webhook event
    const joinedAt = Date.now();
    const response = await sessionManager.fetch('http://session-manager/webhook', {
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

    expect(response.status).toBe(200);

    // Verify state was updated
    await runInDurableObject(sessionManager, async (instance: SessionManager, state) => {
      const teacher = await state.storage.get('user:teacher');
      expect(teacher.peerId).toBe('peer-1');
      expect(teacher.joinedAt).toBe(joinedAt);
    });
  });

  it("should handle session duration correctly", async () => {
    const sessionManager = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );

    const customDuration = 7200000; // 2 hours
    const response = await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress: teacherAddress,
        sessionDuration: customDuration
      })
    });

    // Verify session duration was stored
    await runInDurableObject(sessionManager, async (instance: SessionManager, state) => {
      const teacher = await state.storage.get('user:teacher');
      expect(teacher.sessionDuration).toBe(customDuration);
    });
  });
});

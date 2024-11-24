// tests/initEndpoint.test.ts
import { describe, it, expect } from 'vitest';
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { WebSocketManager } from '../src/websocketManager';
import { keccak256 } from 'ethers';
import type { User } from '../src/websocketManager';

describe('POST /init', () => {
it('should initialize the WebSocketManager DO with teacher role', async () => {
  const teacherAddress = "0x1234567890123456789012345678901234567890";
  const learnerAddress = "0x9876543210987654321098765432109876543210";
  const hashedTeacherAddress = keccak256(teacherAddress);
  const hashedLearnerAddress = keccak256(learnerAddress);
  const roomId = 'test-room';

  const id = env.WEBSOCKET_MANAGER.idFromName(roomId);
  const stub = env.WEBSOCKET_MANAGER.get(id);

  const response = await SELF.fetch('http://localhost/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientSideRoomId: roomId,
      hashedTeacherAddress,
      hashedLearnerAddress,
      userAddress: teacherAddress,
    }),
  });

  expect(response.status).toBe(200);
  const data = await response.json() as { status: string; role: string; roomId: string };
  expect(data.status).toBe('OK');
  expect(data.role).toBe('teacher');
  expect(data.roomId).toBe(roomId);

  // Use the state parameter provided by runInDurableObject
  await runInDurableObject(stub, async (instance: WebSocketManager, state) => {
    const teacherData = await state.storage.get('user:teacher') as User | null;

    expect(teacherData).toBeDefined();
    expect(teacherData).toMatchObject({
      role: 'teacher',
      hashedTeacherAddress,
      hashedLearnerAddress,
      roomId,
      peerId: null,
      joinedAt: null
    });
  });
});

  it('should allow both teacher and learner to initialize', async () => {
    const teacherAddress = "0x1234567890123456789012345678901234567890";
    const learnerAddress = "0x9876543210987654321098765432109876543210";
    const hashedTeacherAddress = keccak256(teacherAddress);
    const hashedLearnerAddress = keccak256(learnerAddress);
    const roomId = 'test-room-2';

    const id = env.WEBSOCKET_MANAGER.idFromName(roomId);
    const stub = env.WEBSOCKET_MANAGER.get(id);

    // Initialize teacher
    await SELF.fetch('http://localhost/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress,
        hashedLearnerAddress,
        userAddress: teacherAddress,
      }),
    });

    // Initialize learner
    await SELF.fetch('http://localhost/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress,
        hashedLearnerAddress,
        userAddress: learnerAddress,
      }),
    });

    // Verify both users are properly initialized
  await runInDurableObject(stub, async (instance: WebSocketManager, state) => {
    const teacherData = await state.storage.get('user:teacher') as User | null;
    const learnerData = await state.storage.get('user:learner') as User | null;

    expect(teacherData).toBeDefined();
    expect(learnerData).toBeDefined();

    expect(teacherData).toMatchObject({
      role: 'teacher',
      hashedTeacherAddress,
      hashedLearnerAddress,
      roomId
    });

    expect(learnerData).toMatchObject({
      role: 'learner',
      hashedTeacherAddress,
      hashedLearnerAddress,
      roomId
    });
  });
  });

  it('should reject unauthorized users', async () => {
    const teacherAddress = "0x1234567890123456789012345678901234567890";
    const learnerAddress = "0x9876543210987654321098765432109876543210";
    const unauthorizedAddress = "0x5555555555555555555555555555555555555555";
    const hashedTeacherAddress = keccak256(teacherAddress);
    const hashedLearnerAddress = keccak256(learnerAddress);

    const response = await SELF.fetch('http://localhost/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSideRoomId: 'test-room',
        hashedTeacherAddress,
        hashedLearnerAddress,
        userAddress: unauthorizedAddress,
      }),
    });

    expect(response.status).toBe(403);
    const data = await response.json() as { status: string; message: string };
    expect(data.status).toBe('error');
    expect(data.message).toBe("User address doesn't match teacher or learner address");
  });
});


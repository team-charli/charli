///Users/zm/Projects/charli/apps/session-time-tracker/tests/connectionManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import { ConnectionManager } from '../src/connectionManager';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from 'ethereum-cryptography/utils';

interface ParticipantRoleResponse {
  role: 'teacher' | 'learner';
}
describe('ConnectionManager Durable Object', () => {
  let webSocketManagerStub: DurableObjectStub;
  let connectionManagerStub: DurableObjectStub;
  const teacherAddress = "0x1234567890123456789012345678901234567890";
  const learnerAddress = "0x9876543210987654321098765432109876543210";
  const hashedTeacherAddressBytes = keccak256(hexToBytes(teacherAddress));
  const hashedLearnerAddressBytes = keccak256(hexToBytes(learnerAddress));
  const hashedTeacherAddress = toHex(hashedTeacherAddressBytes);
  const hashedLearnerAddress = toHex(hashedLearnerAddressBytes);
  const roomId = 'test-room';

  beforeEach(async () => {
    // Initialize both DOs
    const wsId = env.WEBSOCKET_MANAGER.idFromName(roomId);
    const cmId = env.CONNECTION_MANAGER.idFromName(roomId);
    webSocketManagerStub = env.WEBSOCKET_MANAGER.get(wsId);
    connectionManagerStub = env.CONNECTION_MANAGER.get(cmId);

    // Initialize WebSocket Manager with users
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

  it('should track participant roles through full session lifecycle', async () => {
    // Simulate peer:joined events
    const teacherJoinedAt = Date.now();
    const teacherPeerId = 'teacher-peer-id';

    await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'peer:joined',
        payload: {
          id: teacherPeerId,
          roomId,
          joinedAt: teacherJoinedAt,
          role: 'teacher'
        }
      })
    });

    // Verify teacher role was stored
    let response = await connectionManagerStub.fetch(
      `http://connection-manager/getParticipantRole?peerId=${teacherPeerId}`,
      { method: 'GET' }
    );
    let data = await response.json() as ParticipantRoleResponse;
    expect(data.role).toBe('teacher');

    // Simulate learner joining
    const learnerJoinedAt = Date.now();
    const learnerPeerId = 'learner-peer-id';

    await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'peer:joined',
        payload: {
          id: learnerPeerId,
          roomId,
          joinedAt: learnerJoinedAt,
          role: 'learner'
        }
      })
    });

    // Verify both roles are stored
    response = await connectionManagerStub.fetch(
      `http://connection-manager/getParticipantRole?peerId=${learnerPeerId}`,
      { method: 'GET' }
    );
    expect(data.role).toBe('learner');

    // Verify DO storage directly
    await runInDurableObject(connectionManagerStub, async (instance: ConnectionManager) => {
      const participants = await instance.state.storage.get('participants');
      expect(participants).toEqual({
        [teacherPeerId]: 'teacher',
        [learnerPeerId]: 'learner'
      });
    });
  });

  it('should handle role updates and maintain consistency', async () => {
    const peerId = 'test-peer-id';

    // Set initial role
    await connectionManagerStub.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, role: 'teacher' }),
    });

    // Update role
    await connectionManagerStub.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, role: 'learner' }),
    });

    // Verify final state
    await runInDurableObject(connectionManagerStub, async (instance: ConnectionManager) => {
      const participants = await instance.state.storage.get('participants');
      expect(participants[peerId]).toBe('learner');
    });

    const response = await connectionManagerStub.fetch(
      `http://connection-manager/getParticipantRole?peerId=${peerId}`,
      { method: 'GET' }
    );
   let data = await response.json() as ParticipantRoleResponse;
    expect(data.role).toBe('learner');
  });

  it('should handle webhook events and update roles accordingly', async () => {
    // Send webhook for peer join
    await webSocketManagerStub.fetch('http://localhost/handleWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'peer:joined',
        payload: {
          id: 'webhook-peer-id',
          roomId,
          joinedAt: Date.now(),
          role: 'teacher'
        }
      })
    });

    // Verify role was propagated to ConnectionManager
    await runInDurableObject(connectionManagerStub, async (instance: ConnectionManager) => {
      const participants = await instance.state.storage.get('participants');
      expect(participants['webhook-peer-id']).toBe('teacher');
    });
  });

  it('should maintain isolation between different rooms', async () => {
    const room1Id = 'room-1';
    const room2Id = 'room-2';
    const cm1 = env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(room1Id));
    const cm2 = env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(room2Id));

    // Set roles in room 1
    await cm1.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId: 'peer1', role: 'teacher' }),
    });

    // Set roles in room 2
    await cm2.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId: 'peer2', role: 'learner' }),
    });

    // Verify isolation
    await runInDurableObject(cm1, async (instance: ConnectionManager) => {
      const participants = await instance.state.storage.get('participants');
      expect(participants).toEqual({ 'peer1': 'teacher' });
    });

    await runInDurableObject(cm2, async (instance: ConnectionManager) => {
      const participants = await instance.state.storage.get('participants');
      expect(participants).toEqual({ 'peer2': 'learner' });
    });
  });
});

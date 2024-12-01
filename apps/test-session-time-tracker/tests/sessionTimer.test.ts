import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { SessionTimer } from "../src/sessionTimer";

describe("Session Timer", () => {
  const roomId = "test-room";
  const firstJoinTime = Date.now();
  const duration = 3600000; // 1 hour
  let sessionTimer: DurableObjectStub;
  let messageRelay: DurableObjectStub;
  let ws: WebSocket;

  beforeEach(async () => {
    sessionTimer = env.SESSION_TIMER.get(
      env.SESSION_TIMER.idFromName(roomId)
    );

    // Set up MessageRelay to catch broadcasts
    messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );
    const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    ws = wsResponse.webSocket;
    ws.accept();
  });

  it("should initialize timer with correct phases", async () => {
    await sessionTimer.fetch('http://session-timer/', {
      method: 'POST',
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: 'teacher',
        hashedTeacherAddress: '0x123',
        hashedLearnerAddress: '0x456'
      })
    });

    await runInDurableObject(sessionTimer, async (instance: SessionTimer, state) => {
      expect(await state.storage.get('alarmType')).toBe('joinWindow');
      expect(await state.storage.get('firstJoinRole')).toBe('teacher');
      expect(await state.storage.get('warningTime')).toBe(firstJoinTime + duration - 180000);
      expect(await state.storage.get('expirationTime')).toBe(firstJoinTime + duration);
    });
  });

  it("should broadcast initialization message", async () => {
    let receivedMessage: any;
    ws.addEventListener('message', (event) => {
      receivedMessage = JSON.parse(event.data);
    });

    await sessionTimer.fetch('http://session-timer/', {
      method: 'POST',
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: 'teacher'
      })
    });

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(receivedMessage).toMatchObject({
      type: 'initiated',
      data: {
        message: 'Session timer started'
      }
    });
  });

  it("should handle join window alarm correctly when both users joined", async () => {
    // Set up initial state
    await sessionTimer.fetch('http://session-timer/', {
      method: 'POST',
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: 'teacher'
      })
    });

    // Mock ConnectionManager response
    const connectionManager = env.CONNECTION_MANAGER.get(
      env.CONNECTION_MANAGER.idFromName(roomId)
    );

    // Simulate both users joined
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId: 'peer1', role: 'teacher' })
    });
    await connectionManager.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId: 'peer2', role: 'learner' })
    });

    // Execute join window alarm
    const ran = await runDurableObjectAlarm(sessionTimer);
    expect(ran).toBe(true);

    // Verify state transition to warning phase
    await runInDurableObject(sessionTimer, async (instance: SessionTimer, state) => {
      expect(await state.storage.get('alarmType')).toBe('warning');
    });
  });

  it("should handle join window alarm correctly when second user missing", async () => {
    let receivedMessage: any;
    ws.addEventListener('message', (event) => {
      receivedMessage = JSON.parse(event.data);
    });

    // Set up initial state
    await sessionTimer.fetch('http://session-timer/', {
      method: 'POST',
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: 'teacher'
      })
    });

    // Execute join window alarm
    await runDurableObjectAlarm(sessionTimer);

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify cleanup occurred
    await runInDurableObject(sessionTimer, async (instance: SessionTimer, state) => {
      expect(await state.storage.get('alarmType')).toBeUndefined();
      expect(await state.storage.get('warningTime')).toBeUndefined();
      expect(await state.storage.get('expirationTime')).toBeUndefined();
      expect(await state.storage.get('firstJoinRole')).toBeUndefined();
    });
  });

  it("should broadcast warning message at warning phase", async () => {
    let messages: any[] = [];
    ws.addEventListener('message', (event) => {
      messages.push(JSON.parse(event.data));
    });

    // Set up state in warning phase
    await sessionTimer.fetch('http://session-timer/', {
      method: 'POST',
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: 'teacher'
      })
    });

    await runInDurableObject(sessionTimer, async (instance: SessionTimer, state) => {
      await state.storage.put('alarmType', 'warning');
    });

    // Execute warning alarm
    await runDurableObjectAlarm(sessionTimer);

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(messages.some(m =>
      m.type === 'warning' &&
      m.data.message === '3-minute warning'
    )).toBe(true);

    // Verify transition to expired phase
    await runInDurableObject(sessionTimer, async (instance: SessionTimer, state) => {
      expect(await state.storage.get('alarmType')).toBe('expired');
    });
  });

  it("should handle session expiration correctly", async () => {
    let receivedMessage: any;
    ws.addEventListener('message', (event) => {
      receivedMessage = JSON.parse(event.data);
    });

    // Set up state in expired phase
    await sessionTimer.fetch('http://session-timer/', {
      method: 'POST',
      body: JSON.stringify({
        duration,
        firstJoinTime,
        firstJoinRole: 'teacher'
      })
    });

    await runInDurableObject(sessionTimer, async (instance: SessionTimer, state) => {
      await state.storage.put('alarmType', 'expired');
    });

    // Execute expiration alarm
    await runDurableObjectAlarm(sessionTimer);

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(receivedMessage).toMatchObject({
      type: 'expired',
      data: {
        message: 'Session expired'
      }
    });

    // Verify cleanup
    await runInDurableObject(sessionTimer, async (instance: SessionTimer, state) => {
      expect(await state.storage.get('alarmType')).toBeUndefined();
      expect(await state.storage.get('warningTime')).toBeUndefined();
      expect(await state.storage.get('expirationTime')).toBeUndefined();
      expect(await state.storage.get('firstJoinRole')).toBeUndefined();
    });
  });
});

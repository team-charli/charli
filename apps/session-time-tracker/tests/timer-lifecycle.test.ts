// test/timer-lifecycle.test.ts
import { describe, it, expect, beforeEach, afterEach} from 'vitest';
import { env, SELF, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { hexToBytes, toHex } from "ethereum-cryptography/utils";
import { keccak256 } from "ethereum-cryptography/keccak";

/**
 * Timer Lifecycle Tests
 *
 * This suite tests the full lifecycle transitions of the session timer:
 * - Join window transitions to session duration (warning phase) when both users join
 * - Join window triggers fault when second user is missing
 * - Session duration sets a correct warning alarm
 * - Warning transitions to expiration
 * - Expiration cleans up state fully
 */

const encoder = new TextEncoder();
const apiKey = env.TEST_HUDDLE_API_KEY || "test-api-key";

// Helper to generate HMAC signatures based on WebhookReceiver logic
async function asyncGenerateHmac(alg: string, message: string, secretKey: string) {
  const keyData = encoder.encode(secretKey);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: alg }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Buffer.from(signature).toString("hex");
}

async function generateSignature(data: any, apiKey: string) {
  if (!data.id) {
    data.id = crypto.randomUUID();
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const hashPayload = `${data.id}.${timestamp}.${JSON.stringify(data)}`;
  const hmac = await asyncGenerateHmac('SHA-256', hashPayload, apiKey);
  return `t=${timestamp},sha256=${hmac}`;
}

// Helper to send webhook events with correct signature and top-level id
async function sendWebhook(event: string, payloadData: any) {
  const data = { id: crypto.randomUUID(), event, payload: [{ data: payloadData }] };
  const signatureHeader = await generateSignature(data, apiKey);
  const resp = await SELF.fetch("https://example.com/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "huddle01-signature": signatureHeader
    },
    body: JSON.stringify(data)
  });
  expect(resp.ok).toBe(true);
}

describe("Timer Lifecycle Tests", () => {
  let roomId: string;
  let teacherAddress: string;
  let learnerAddress: string;
  let teacherHash: string;
  let learnerHash: string;
  const duration = 3600000; // 1 hour
  let ws: WebSocket | undefined;

  async function cleanup() {
    if (ws) {
      ws.close();
      ws = undefined;
    }

    const stubs = {
      sessionTimer: env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId)),
      connectionManager: env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId)),
      sessionManager: env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId)),
      messageRelay: env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId))
    };

    for (const stub of Object.values(stubs).reverse()) {
      try {
        await runDurableObjectAlarm(stub);
        await runInDurableObject(stub, async (_, state) => {
          await state.blockConcurrencyWhile(async () => {
            await state.storage.deleteAll();
            await state.storage.deleteAlarm();
          });
        });
      } catch (e) {
        // ignore
      } finally {
        stub[Symbol.dispose]?.();
      }
    }
  }

  beforeEach(() => {
    const testId = crypto.randomUUID();
    roomId = `room-${testId}`;
    teacherAddress = `0x${testId.slice(0, 8)}`;
    learnerAddress = `0x${testId.slice(24, 32)}`;
    teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
    learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));
  });

  beforeEach(cleanup);
  afterEach(cleanup);

  async function establishWebSocket() {
    const resp = await SELF.fetch(`https://example.com/connect/${roomId}`, {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    });
    expect(resp.status).toBe(101);
    ws = resp.webSocket!;
    ws.accept();
    const messages: any[] = [];
    ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data as string);
      messages.push(msg);
    });
    return messages;
  }

  async function initSession(userAddress: string) {
    const initResp = await SELF.fetch("https://example.com/init", {
      method: "POST",
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress,
        sessionDuration: duration
      })
    });
    expect(initResp.ok).toBe(true);
  }

  it("Join window transitions to session duration timer when both users join", async () => {
    await establishWebSocket();
    await initSession(teacherAddress);
    await initSession(learnerAddress);

    // Teacher joins first
    await sendWebhook('peer:joined', {
      id:'t-peer',
      roomId,
      joinedAt: Date.now(),
      metadata: JSON.stringify({hashedAddress: teacherHash, role:'teacher', sessionId: roomId})
    });

    // Verify initial alarmType is joinWindow
    const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
    let alarmType = await runInDurableObject(sessionTimerStub, async(_,state) => state.storage.get('alarmType'));
    expect(alarmType).toBe('joinWindow');

    // Now learner joins
    await sendWebhook('peer:joined', {
      id:'l-peer',
      roomId,
      joinedAt: Date.now()+1000,
      metadata: JSON.stringify({hashedAddress: learnerHash, role:'learner', sessionId: roomId})
    });

    // After both join, cancelNoJoinCheck sets alarmType='warning' immediately, no alarm fired yet.
    // Wait a brief moment to ensure storage is updated.
    await new Promise(r=>setTimeout(r,50));

    // Check alarmType now, before calling runDurableObjectAlarm().
    // It should show 'warning' because both joined and cancelNoJoinCheck ran.
    alarmType = await runInDurableObject(sessionTimerStub, async(_,state)=>state.storage.get('alarmType'));
    expect(alarmType).toBe('warning');

    // Now we runDurableObjectAlarm to simulate the warning alarm firing.
    // Once we run this, the warning alarm will trigger and move alarmType to 'expired'.
    await runDurableObjectAlarm(sessionTimerStub);

    // After the warning alarm fires, alarmType should be 'expired'.
    alarmType = await runInDurableObject(sessionTimerStub, async(_,state)=>state.storage.get('alarmType'));
    expect(alarmType).toBe('expired');
  });

  it("Join window triggers fault if second user missing", async () => {
    const messages = await establishWebSocket();
    await initSession(teacherAddress);
    await initSession(learnerAddress);

    // Only teacher joins
    await sendWebhook('peer:joined', {
      id:'t-peer',
      roomId,
      joinedAt: Date.now(),
      metadata: JSON.stringify({hashedAddress: teacherHash, role:'teacher', sessionId: roomId})
    });

    // Trigger joinWindow alarm
    const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
    await runDurableObjectAlarm(sessionTimerStub);
    await new Promise(r=>setTimeout(r,200));

    //console.log("messages", messages);
    const finalizedMsg = messages.find(m=>m.type==='finalized');
    expect(finalizedMsg).toBeDefined();
    expect(finalizedMsg.data.status).toBe('fault');
    expect(finalizedMsg.data.faultType).toContain('_never_joined');
  });

  it("Version1: Session timer correctly handles warning and expiration sequence", async () => {
    const messages = await establishWebSocket();
    await initSession(teacherAddress);
    await initSession(learnerAddress);

    const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));

    // Initial join - this sets up join window alarm
    await sendWebhook('peer:joined', {
      id: 't-peer',
      roomId,
      joinedAt: Date.now(),
      metadata: JSON.stringify({ hashedAddress: teacherHash, role: 'teacher', sessionId: roomId })
    });

    // Verify initial alarm state
    let alarmType = await runInDurableObject(sessionTimerStub, async (_, state) => {
      const type = await state.storage.get('alarmType');
      const scheduledTime = await state.storage.getAlarm();
      return { type, scheduledTime };
    });
    expect(alarmType.type).toBe('joinWindow');

    // Second user joins - this should trigger cancelNoJoinCheck
    await sendWebhook('peer:joined', {
      id: 'l-peer',
      roomId,
      joinedAt: Date.now(),
      metadata: JSON.stringify({ hashedAddress: learnerHash, role: 'learner', sessionId: roomId })
    });
    await new Promise(r => setTimeout(r, 50));

    // Verify warning alarm is scheduled
    alarmType = await runInDurableObject(sessionTimerStub, async (_, state) => {
      const type = await state.storage.get('alarmType');
      const warningTime = await state.storage.get('warningTime');
      const scheduledAlarm = await state.storage.getAlarm();
      return { type, warningTime, scheduledAlarm };
    });
    expect(alarmType.type).toBe('warning');
    expect(alarmType.scheduledAlarm).toBe(alarmType.warningTime);

    // Execute warning alarm
    await runDurableObjectAlarm(sessionTimerStub);
    await new Promise(r => setTimeout(r, 50));

    // Verify warning message was broadcast
    const warningMsg = messages.find(m => m.type === 'warning');
    expect(warningMsg).toBeDefined();
    expect(warningMsg.data.message).toBe('3-minute warning');

    // Verify expiration alarm is scheduled
    alarmType = await runInDurableObject(sessionTimerStub, async (_, state) => {
      const type = await state.storage.get('alarmType');
      const expirationTime = await state.storage.get('expirationTime');
      const scheduledAlarm = await state.storage.getAlarm();
      return { type, expirationTime, scheduledAlarm };
    });
    expect(alarmType.type).toBe('expired');
    //console.log({"alarmType.scheduledAlarm": alarmType.scheduledAlarm, "alarmType.expirationTime": alarmType.expirationTime })
    expect(alarmType.scheduledAlarm).toBe(alarmType.expirationTime);
  });

//  it.only("Version2 Correct Types: Session timer correctly handles warning and expiration sequence", async () => {
//    const messages = await establishWebSocket();
//    await initSession(teacherAddress);
//    await initSession(learnerAddress);
//
//    const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
//
//    // Initial join - this sets up join window alarm
//    await sendWebhook('peer:joined', {
//      id: 't-peer',
//      roomId,
//      joinedAt: Date.now(),
//      metadata: JSON.stringify({ hashedAddress: teacherHash, role: 'teacher', sessionId: roomId })
//    });
//
//    // Verify initial alarm state
//    let alarmType = await runInDurableObject(sessionTimerStub, async (_, state) => {
//      const type = await state.storage.get<'joinWindow' | 'warning' | 'expired'>('alarmType');
//      const scheduledTime = await state.storage.getAlarm();
//      return { type, scheduledTime };
//    });
//
//    expect(alarmType.type).toBe('joinWindow');
//
//    // Second user joins - this should trigger cancelNoJoinCheck
//    await sendWebhook('peer:joined', {
//      id: 'l-peer',
//      roomId,
//      joinedAt: Date.now(),
//      metadata: JSON.stringify({ hashedAddress: learnerHash, role: 'learner', sessionId: roomId })
//    });
//    await new Promise(r => setTimeout(r, 50));
//
//    // Verify warning alarm is scheduled
//    alarmType = await runInDurableObject(sessionTimerStub, async (_, state) => {
//      const type = await state.storage.get<'joinWindow' | 'warning' | 'expired'>('alarmType');
//      const warningTime = await state.storage.get<number>('warningTime');
//      const scheduledAlarm = await state.storage.getAlarm() as number; // returns number | null
//      expect(scheduledAlarm).toBe(warningTime);
//
//      return { type,  scheduledTime: scheduledAlarm };
//    });
//    expect(alarmType.type).toBe('warning');
//
//    // Execute warning alarm
//    await runDurableObjectAlarm(sessionTimerStub);
//    await new Promise(r => setTimeout(r, 50));
//
//    // Verify warning message was broadcast
//    const warningMsg = messages.find(m => m.type === 'warning');
//    expect(warningMsg).toBeDefined();
//    expect(warningMsg.data.message).toBe('3-minute warning');
//
//    // Verify expiration alarm is scheduled
//    alarmType = await runInDurableObject(sessionTimerStub, async (_, state) => {
//      const type = await state.storage.get<'joinWindow' | 'warning' | 'expired'>('alarmType');
//      const warningTime = await state.storage.get<number>('warningTime');
//      const scheduledAlarm = await state.storage.getAlarm() as number; // returns number | null
//      const tolerance = 60000;
//      expect(scheduledAlarm).toBeLessThanOrEqual(expirationTime);
//
//      return { type,  scheduledTime: scheduledAlarm };
//    });
//    expect(alarmType.type).toBe('expired');
//  });
//
  it("Expiration timer cleans up state", async () => {
    const messages = await establishWebSocket();
    await initSession(teacherAddress);
    await initSession(learnerAddress);

    // Both users join
    await sendWebhook('peer:joined', {
      id:'t-peer',
      roomId,
      joinedAt:Date.now(),
      metadata:JSON.stringify({hashedAddress:teacherHash, role:'teacher'})
    });
    await sendWebhook('peer:joined', {
      id:'l-peer',
      roomId,
      joinedAt:Date.now()+1000,
      metadata:JSON.stringify({hashedAddress:learnerHash, role:'learner'})
    });

    const sessionTimerStub = env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId));
    // joinWindow → warning
    await runDurableObjectAlarm(sessionTimerStub);
    // warning → expired
    await runDurableObjectAlarm(sessionTimerStub);
    // expired → finalizeSession (non-fault)
    await runDurableObjectAlarm(sessionTimerStub);

    await new Promise(r=>setTimeout(r,200));
    //console.log("messages", messages);
    const finalizedMsg = messages.find(m=>m.type==='finalized');
    expect(finalizedMsg).toBeDefined();
    expect(finalizedMsg.data.status).toBe('success');

    // Check sessionTimer storage cleanup
    const entries = await runInDurableObject(sessionTimerStub, async(_,state)=> (await state.storage.list()));
    //console.log("entries", entries);
    expect(entries.size).toBe(0);
  });
});

//sessionTimer.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { DOEnv, Env } from './env';

export class SessionTimer extends DurableObject<DOEnv> {
  private app = new Hono();
  private roomId: string;
  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: DOEnv) {
    super(state, env);
    this.state = state;

    /**
 * Storage Schema
 * {
 *   'firstJoinRole': 'teacher' | 'learner',
 *   'alarmType': 'joinWindow' | 'warning' | 'expired',
 *   'warningTime': number,
 *   'expirationTime': number
 *   'roomId': string;
 * }
 */

    // Initialize timer endpoint
    this.app.post('/', async (c) => {
      const data = await c.req.json<RequestPayload>();
      const { duration, firstJoinTime, firstJoinRole, roomId } = data;
      this.roomId = roomId;
      await this.state.storage.put('roomId', roomId)
      const joinWindowTime = firstJoinTime + (3 * 60 * 1000);
      const warningTime = firstJoinTime + duration - (3 * 60 * 1000);
      const expirationTime = firstJoinTime + duration;

      await this.state.storage.put('firstJoinRole', firstJoinRole);
      await this.state.storage.put('alarmType', 'joinWindow');
      await this.state.storage.put('warningTime', warningTime);
      await this.state.storage.put('expirationTime', expirationTime);

      await this.state.storage.setAlarm(joinWindowTime);

      await this.broadcast({
        type: 'initiated',
        data: {
          message: 'Session timer started',
          timestampMs: String(Date.now())
        }
      });

      return c.text('OK');
    });

    // Cancel no-join check endpoint
    this.app.post('/cancelNoJoinCheck', async (c) => {
      const alarmType = await this.state.storage.get<string>('alarmType');
      if (alarmType === 'joinWindow') {
        const warningTime = await this.state.storage.get<number>('warningTime');
        const expirationTime = await this.state.storage.get<number>('expirationTime');

        if (warningTime) {
          await this.state.storage.put('alarmType', 'warning');
          await this.state.storage.setAlarm(warningTime);
        } else if (expirationTime) {
          // No warning phase, jump straight to expiration
          await this.state.storage.put('alarmType', 'expired');
          await this.state.storage.setAlarm(expirationTime);
        } else {
          throw new Error('No warning or expiration time set; cannot cancel no-join check properly.');
        }
      }
      return c.text('OK ---- both users joined ----- "no-join alarm" removed');
    });

    // 1) A new route so SessionManager can schedule the final cleanup alarm
    this.app.post('/scheduleFinalCleanup', async (c) => {
      await this.state.storage.deleteAlarm();

      // Possibly read how many seconds you want from request JSON,
      // or just pick a hard-coded short delay:
      const finalCleanupDelay = 10000; // 5 seconds

      const now = Date.now();
      const cleanupTime = now + finalCleanupDelay;

      await this.state.storage.put('alarmType', 'finalCleanup');
      await this.state.storage.put('finalCleanupTime', cleanupTime);

      await this.state.storage.setAlarm(cleanupTime);

      return c.text(`Final cleanup alarm set for ${new Date(cleanupTime).toLocaleString()}`);
    });
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request, this.env);
  }

  async alarm() {
    // Check if we already finished final cleanup
    const cleanupDone = await this.state.storage.get<boolean>('cleanupDone');
    if (cleanupDone) {
      console.log('Already did final cleanup; ignoring re-entrance.');
      return;
    }

    // Read the current alarmType
    const alarmType = await this.state.storage.get<'joinWindow' | 'warning' | 'expired' | 'finalCleanup'>('alarmType');

    // If this alarm is finalCleanup, skip fetching roomId (it may be gone already).
    if (alarmType === 'finalCleanup') {
      console.log('[SessionTimer:alarm] finalCleanup triggered. Cleaning up all DOs...');

      // Mark that we've performed cleanup so subsequent calls skip everything
      await this.state.storage.put('cleanupDone', true);

      // 1. Call /cleanup on ConnectionManager
      const connectionManagerId = this.env.CONNECTION_MANAGER.idFromName(this.roomId);
      await this.env.CONNECTION_MANAGER.get(connectionManagerId).fetch(
        'http://connection-manager/cleanupConnectionManager',
        { method: 'POST' }
      );

      // 2. Call /cleanupSessionManager
      const sessionManagerId = this.env.SESSION_MANAGER.idFromName(this.roomId);
      await this.env.SESSION_MANAGER.get(sessionManagerId).fetch(
        'http://session-manager/cleanupSessionManager',
        { method: 'POST' }
      );

      // 3. Finally, cleanup this SessionTimer itself
      await this.cleanup();
      console.log('[finalizeSession] finalize complete => all DOs cleaned.',
        new Date().toLocaleString('en-US', { timeZone: 'America/Cancun' })
      );
      return;
    }

    // Otherwise (joinWindow, warning, or expired), we do need to ensure roomId is set in memory
    if (!this.roomId) {
      this.roomId = await this.state.storage.get<string>('roomId');
      if (!this.roomId) {
        throw new Error('Stored roomId is missing in SessionTimer DO storage');
      }
    }

    console.log(
      '[SessionTimer:alarm] Fired => alarmType:', alarmType,
      'time:', new Date().toLocaleString('en-US', { timeZone: 'America/Cancun' }),
      'roomId=', this.roomId
    );

    if (alarmType === 'joinWindow') {
      const connectionManagerId = this.env.CONNECTION_MANAGER.idFromName(this.roomId);
      const connectionManager = this.env.CONNECTION_MANAGER.get(connectionManagerId);
      const response = await connectionManager.fetch('http://connection-manager/checkBothJoined');
      const { bothJoined } = await response.json() as { bothJoined: boolean };

      if (bothJoined) {
        const warningTime = await this.state.storage.get<number>('warningTime');
        if (warningTime) {
          await this.state.storage.put('alarmType', 'warning');
          await this.state.storage.setAlarm(warningTime);
        } else {
          const expirationTime = await this.state.storage.get<number>('expirationTime');
          await this.state.storage.put('alarmType', 'expired');
          await this.state.storage.setAlarm(expirationTime);
        }
        return;
      }

      // Fault: second user never joined
      const firstJoinRole = await this.state.storage.get<'teacher' | 'learner'>('firstJoinRole');
      const faultedRole = firstJoinRole === 'teacher' ? 'learner' : 'teacher';

      await connectionManager.fetch('http://connection-manager/timerFault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faultType: 'noJoin',
          data: { role: faultedRole }
        })
      });
    }
    else if (alarmType === 'warning') {
      await this.broadcast({
        type: 'warning',
        data: {
          message: '3-minute warning',
          timestampMs: String(Date.now())
        }
      });

      const expirationTime = await this.state.storage.get<number>('expirationTime');
      await this.state.storage.put('alarmType', 'expired');
      await this.state.storage.setAlarm(expirationTime);
    }
    else if (alarmType === 'expired') {
      const sessionManagerId = this.env.SESSION_MANAGER.idFromName(this.roomId);
      const sessionManager = this.env.SESSION_MANAGER.get(sessionManagerId);

      // Non-fault scenario: normal session end
      await sessionManager.fetch('http://session-manager/finalizeSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'non_fault' })
      });
    }
  }

  private async cleanup() {
    const allKeys = await this.state.storage.list();
    for (const key of allKeys.keys()) {
      if (key !== "cleanupDone") {
        await this.state.storage.delete(key);
      }
    }
    console.log('[SessionTimer:cleanup] delete storage keys except "cleanupDone"', new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}));
  }

  private async broadcast(message: Message) {
    const messageRelay = this.env.MESSAGE_RELAY.get(
      this.env.MESSAGE_RELAY.idFromName(this.roomId)
    );

    await messageRelay.fetch('http://message-relay/broadcast/' + this.roomId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

  }
}

interface RequestPayload {
  duration: number;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  firstJoinTime: number;
  firstJoinRole: 'teacher' | 'learner';
  roomId: string;
}

interface Message {
  type: 'initiated' | 'warning' | 'expired' | 'fault';
  data: {
    message: string;
    timestampMs?: string;
    faultType?: 'secondUser_never_joined';
    role?: 'teacher' | 'learner';
    timestamp?: number;
  };
}


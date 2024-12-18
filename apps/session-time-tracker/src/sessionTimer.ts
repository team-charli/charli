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
        // Since both have joined, we no longer need the no-join logic.
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
      } else {
        // If we are not in joinWindow phase, no change needed
        //console.log('cancelNoJoinCheck: alarmType not joinWindow, no action taken.');
      }

      return c.text('OK');
    });
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request, this.env);
  }

  async alarm() {
    //console.log("SessionTimer.alarm() called", { roomId: this.roomId, storedRoomId: await this.state.storage.get('roomId') });
    const alarmType = await this.state.storage.get<'joinWindow' | 'warning' | 'expired'>('alarmType');

    if (alarmType === 'joinWindow') {
      // Double-check if both joined now
      if (!this.roomId) {
        this.roomId = await this.state.storage.get('roomId')
      }
      const connectionManagerId = this.env.CONNECTION_MANAGER.idFromName(this.roomId);
      const connectionManager = this.env.CONNECTION_MANAGER.get(connectionManagerId);
      const response = await connectionManager.fetch('http://connection-manager/checkBothJoined');
      const { bothJoined } = await response.json() as { bothJoined: boolean };

      if (bothJoined) {
        // Both users are present, so no no-join fault. Move to warning/expired.
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

      // Not both joined, trigger no-join fault
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

      await this.cleanup();
      await connectionManager.fetch('http://connection-manager/cleanupConnectionManager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    } else if (alarmType === 'warning') {
      // Warning phase
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

    } else if (alarmType === 'expired') {
      // Session fully elapsed, finalize as non_fault
      if (!this.roomId) {
        console.trace();
        throw new Error('this.roomId === undefined')
      }
      const sessionManager = this.env.SESSION_MANAGER.get(
        this.env.SESSION_MANAGER.idFromName(this.roomId)
      );

      await sessionManager.fetch('http://session-manager/finalizeSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'non_fault' })
      });

      await this.cleanup();
      const connectionManagerId = this.env.CONNECTION_MANAGER.idFromName(this.roomId);
      const connectionManager = this.env.CONNECTION_MANAGER.get(connectionManagerId);

      await connectionManager.fetch('http://connection-manager/cleanupConnectionManager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

    }
  }

  private async cleanup() {
      await this.state.storage.deleteAll();
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


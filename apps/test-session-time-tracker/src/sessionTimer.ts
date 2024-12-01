//sessionTimer.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './types';

type AppEnv = {
  Bindings: Env
  Variables: {
    state: DurableObjectState
  }
}

export class SessionTimer extends DurableObject<Env> {
  private app = new Hono<AppEnv>();
  private roomId: string;
  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.roomId = state.id.toString();

    // Initialize timer
    this.app.post('/', async (c) => {
      const data = await c.req.json<RequestPayload>();
      const { duration, firstJoinTime, firstJoinRole } = data;

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
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request, this.env);
  }

  async alarm() {
    const alarmType = await this.state.storage.get<'joinWindow' | 'warning' | 'expired'>('alarmType');

    if (alarmType === 'joinWindow') {
      // Check with ConnectionManager about second user
      const connectionManagerId = this.env.CONNECTION_MANAGER.idFromName(this.roomId);
      const connectionManager = this.env.CONNECTION_MANAGER.get(connectionManagerId);

      const response = await connectionManager.fetch('http://connection-manager/checkBothJoined');
      const { bothJoined } = await response.json();

      if (!bothJoined) {
        const firstJoinRole = await this.state.storage.get<'teacher' | 'learner'>('firstJoinRole');
        const faultedRole = firstJoinRole === 'teacher' ? 'learner' : 'teacher';

        // Notify ConnectionManager of the fault
        await connectionManager.fetch('http://connection-manager/timerFault', {
          method: 'POST',
          body: JSON.stringify({
            faultType: 'noJoin',
            data: { role: faultedRole }
          })
        });

        await this.cleanup();
        return;
      }

      const warningTime = await this.state.storage.get<number>('warningTime');
      await this.state.storage.put('alarmType', 'warning');
      await this.state.storage.setAlarm(warningTime);

    } else if (alarmType === 'warning') {
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
      await this.broadcast({
        type: 'expired',
        data: {
          message: 'Session expired',
          timestampMs: String(Date.now())
        }
      });

      await this.cleanup();
    }
  }

  private async cleanup() {
    await this.state.storage.delete('alarmType');
    await this.state.storage.delete('warningTime');
    await this.state.storage.delete('expirationTime');
    await this.state.storage.delete('firstJoinRole');
  }

  // Similar changes in SessionTimer:
  private async broadcast(message: Message) {
    const messageRelay = this.env.MESSAGE_RELAY.get(
      this.env.MESSAGE_RELAY.idFromName(this.roomId)
    );

    await messageRelay.fetch('http://message-relay/broadcast/' + this.roomId, {
      method: 'POST',
      body: JSON.stringify(message),
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
interface RequestPayload {
  duration: number;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  firstJoinTime: number;
  firstJoinRole: 'teacher' | 'learner';
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

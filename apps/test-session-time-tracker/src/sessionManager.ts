// sessionManager.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { WebhookData, User, ClientData } from './types';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";
import { WebhookEvents } from '@huddle01/server-sdk/webhooks';
import { DOEnv, Env } from './env';

export class SessionManager extends DurableObject<DOEnv> {
  private app = new Hono<Env>();
  private roomId: string;
  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: DOEnv) {
    super(state, env);
    this.state = state;
    this.env = env;
    this.roomId = state.id.toString();

    this.app.post('/init', async (c) => {
      const clientData = await c.req.json<ClientData>();
      const { userAddress, hashedTeacherAddress, hashedLearnerAddress, sessionDuration } = clientData;

      // Validate user and assign role
      const userAddressHashBytes = keccak256(hexToBytes(userAddress));
      const userAddressHash = toHex(userAddressHashBytes);

      let role: 'teacher' | 'learner';
      if (userAddressHash === hashedTeacherAddress) {
        role = 'teacher';
      } else if (userAddressHash === hashedLearnerAddress) {
        role = 'learner';
      } else {
        return c.json({
          status: 'error',
          message: "User address doesn't match teacher or learner address"
        }, 403);
      }

      // Store initial user data
      const user: User = {
        role,
        roomId: this.roomId,
        hashedTeacherAddress,
        hashedLearnerAddress,
        peerId: null,
        joinedAt: null,
        leftAt: null,
        duration: null,
        sessionDuration,
        joinedAtSig: null,
        leftAtSig: null,
      };

      // Only store locally - remove ConnectionManager call
      await this.state.storage.put(`user:${role}`, user);

      return c.json({
        status: 'OK',
        role,
        roomId: this.roomId
      });
    });

    // Handle webhooks
    this.app.post('/webhook', async (c) => {
      const event = await c.req.json<WebhookData>();

      // Forward to ConnectionManager
      const connectionManager = c.env.CONNECTION_MANAGER.get(
        c.env.CONNECTION_MANAGER.idFromName(this.roomId)
      );

      await connectionManager.fetch('http://connection-manager/handleWebhook', {
        method: 'POST',
        body: JSON.stringify({ event })
      });

      // If this is a join event and first user, start timer
      if (event.event === 'peer:joined') {
        const { joinedAt } = (event.payload as WebhookEvents['peer:joined'][0]);  // Add type assertion
        const users = await this.getJoinedUsers();

        if (Object.keys(users).length === 1) {
          await this.startSessionTimer(c, joinedAt, Object.values(users)[0].role);
        }
      }

      return c.text('OK');
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request, this.env);
  }

  private async getJoinedUsers() {
    const teacher = await this.state.storage.get('user:teacher') as User;
    const learner = await this.state.storage.get('user:learner') as User;
    const users: Record<string, User> = {};

    if (teacher?.joinedAt) users['teacher'] = teacher;
    if (learner?.joinedAt) users['learner'] = learner;

    return users;
  }

  private async startSessionTimer(c: any, firstJoinTime: number, firstJoinRole: 'teacher' | 'learner') {

    const sessionTimer = c.env.SESSION_TIMER.get(
      c.env.SESSION_TIMER.idFromName(this.roomId)
    );

    await sessionTimer.fetch('http://session-timer/', {
      method: 'POST',
      body: JSON.stringify({
        duration: 3600000, // 1 hour
        firstJoinTime,
        firstJoinRole
      })
    });
  }
}

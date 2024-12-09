// sessionManager.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { WebhookData, User, ClientData } from './types';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";
import { WebhookEvents, WebhookReceiver } from '@huddle01/server-sdk/webhooks';
import { DOEnv, Env } from './env';

export class SessionManager extends DurableObject<DOEnv> {
  private app = new Hono<Env>();
  private roomId: string;
  /**
   * Storage Schema:
   * {
   *   // Full user data for teacher and learner
   *   'user:teacher': User,
   *   'user:learner': User
   * }
   */
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

      await this.state.storage.put(`user:${role}`, user);

      return c.json({
        status: 'OK',
        role,
        roomId: this.roomId
      });
    });

    this.app.post('/webhook', async (c) => {
      const webhookData = await c.req.text();
      console.log('SessionManager received webhook:', webhookData);

      try {
        const event = JSON.parse(webhookData);
        console.log('Parsed webhook event:', event);

        if (event.event === 'peer:joined') {
          const peerData = event.payload[0].data;
          const metadata = JSON.parse(peerData.metadata || '{}');
          console.log('Peer metadata:', metadata);

          // Get stored user data for validation
          const teacherData = await this.state.storage.get('user:teacher') as User;
          const learnerData = await this.state.storage.get('user:learner') as User;

          // Validate and determine role
          let validatedRole: 'teacher' | 'learner' | null = null;
          if (metadata.hashedAddress === teacherData?.hashedTeacherAddress) {
            validatedRole = 'teacher';
          } else if (metadata.hashedAddress === learnerData?.hashedLearnerAddress) {
            validatedRole = 'learner';
          }

          if (!validatedRole) {
            console.log('Invalid peer - metadata did not match any user');
            return c.json({ error: 'Invalid peer' }, 400);
          }

          // Update our own storage first
          const userData = validatedRole === 'teacher' ? teacherData : learnerData;
          userData.peerId = peerData.id;
          userData.joinedAt = peerData.joinedAt;

          console.log(`Updating ${validatedRole} data:`, userData);
          await this.state.storage.put(`user:${validatedRole}`, userData);

          // Forward validated data to ConnectionManager
          const connectionManager = c.env.CONNECTION_MANAGER.get(
            c.env.CONNECTION_MANAGER.idFromName(this.roomId)
          );

          await connectionManager.fetch('http://connection-manager/handlePeer', {
            method: 'POST',
            body: JSON.stringify({
              peerId: peerData.id,
              role: validatedRole,
              joinedAt: peerData.joinedAt
            })
          });

          // Check if we should start timer
          const users = await this.getJoinedUsers();
          if (Object.keys(users).length === 1) {
            await this.startSessionTimer(c, peerData.joinedAt, validatedRole);
          }
        }

        return c.text('OK');
      } catch (error) {
        console.error('SessionManager webhook error:', error);
        return c.json({ error: 'Error processing webhook' }, 400);
      }
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

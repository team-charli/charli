// sessionManager.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { User, ClientData } from './types';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";
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
       export interface User {
        role: 'teacher' | 'learner' | null;
        peerId: string | null;
        roomId: string | null;
        joinedAt: number | null;
        leftAt: number | null;
        joinedAtSig: string | null;
        leftAtSig: string | null;
        faultTime?: number;
        faultTimeSig?: string;
        duration: number | null;
        hashedTeacherAddress: string;
        hashedLearnerAddress: string;
        sessionDuration: number;
      }

   */

  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: DOEnv) {
    super(state, env);
    this.state = state;
    this.env = env;

    this.app.post('/init', async (c) => {
      const clientData = await c.req.json<ClientData>();
      console.log('clientData sessionManager', {clientData})
      const { userAddress, hashedTeacherAddress, hashedLearnerAddress, sessionDuration, clientSideRoomId} = clientData;
      this.roomId = clientSideRoomId;
      // Validate user and assign role
      const userAddressHashBytes = keccak256(hexToBytes(userAddress));
      const userAddressHash = toHex(userAddressHashBytes);
      console.log('/init hashes:', { userAddressHash, hashedTeacherAddress, hashedLearnerAddress });

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
        roomId: clientSideRoomId
      });
    });

    this.app.post('/webhook', async (c) => {
      const webhookData = await c.req.text();
      console.log('SessionManager received webhook:', webhookData);

      try {
        const event = JSON.parse(webhookData);
        // console.log('Parsed webhook event:', event);

        if (event.event === 'peer:joined') {
          const peerData = event.payload[0].data;
          const metadata = JSON.parse(peerData.metadata || '{}');
          console.log('Peer metadata:', metadata);

          // Get stored user data for validation
          const teacherData = await this.state.storage.get('user:teacher') as User;
          const learnerData = await this.state.storage.get('user:learner') as User;

          // Validate and determine role
          console.log('Validation data:', {
            incomingHash: metadata.hashedAddress,
            storedTeacherHash: teacherData?.hashedTeacherAddress,
            storedLearnerHash: learnerData?.hashedLearnerAddress,
            teacherData,
            learnerData
          });
          const validatedRole = this.validateRole(metadata, teacherData, learnerData);
          const userData = validatedRole === 'teacher' ? teacherData : learnerData;
          userData.peerId = peerData.id;
          userData.joinedAt = peerData.joinedAt;

          console.log(`Updating ${validatedRole} data:`, userData);
          await this.state.storage.put(`user:${validatedRole}`, userData);

          // Forward validated data to ConnectionManager
          try {
            // Forward validated data to ConnectionManager
            const connectionManager = c.env.CONNECTION_MANAGER.get(
              c.env.CONNECTION_MANAGER.idFromName(this.roomId)
            );
            console.log("sessionManager call to http://connection-manager/handlePeer", {peerId: peerData.id, role: validatedRole, joinedAt: peerData.joinedAt, roomId: this.roomId})

            const response = await connectionManager.fetch('http://connection-manager/handlePeer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                peerId: peerData.id,
                role: validatedRole,
                joinedAt: peerData.joinedAt,
                roomId: this.roomId
              })
            });

            if (!response.ok) {
              console.error('ConnectionManager request failed:', await response.text());
            }
          } catch (error) {
            console.error('Error forwarding to ConnectionManager:', error);
          }

          // Check if we should start timer
          const users = await this.getJoinedUsers();
          if (Object.keys(users).length === 1) {
            await this.startSessionTimer(c, peerData.joinedAt, validatedRole);
          }
        } else if (event.event === 'peer:left') {
          const peerData = event.payload[0].data;
          const teacherData = await this.state.storage.get('user:teacher') as User;
          const learnerData = await this.state.storage.get('user:learner') as User;
          let role: 'teacher' | 'learner';

          if (teacherData?.peerId === peerData.id) {
            role = 'teacher';
            teacherData.leftAt = peerData.leftAt;
            teacherData.duration = peerData.leftAt - (teacherData.joinedAt || 0);

            await this.state.storage.put('user:teacher', teacherData);
          } else if (learnerData?.peerId === peerData.id) {
            role = 'learner';
            learnerData.leftAt = peerData.leftAt;
            learnerData.duration = peerData.leftAt - (learnerData.joinedAt || 0);

            await this.state.storage.put('user:learner', learnerData);
          } else {
            // console.log('No matching user found for peer:', peerData.id);
            return c.json({ error: 'Unknown peer' }, 400);
          }


          // Forward to ConnectionManager
          const connectionManager = c.env.CONNECTION_MANAGER.get(
            c.env.CONNECTION_MANAGER.idFromName(this.roomId)
          );

          await connectionManager.fetch('http://connection-manager/handlePeerLeft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              peerId: peerData.id,
              leftAt: peerData.leftAt,
              role
            })
          });
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
  private validateRole = (metadata, teacherData, learnerData): ('teacher' | 'learner' | null) => {

    let validatedRole
    if (metadata.hashedAddress === teacherData?.hashedTeacherAddress) {
      validatedRole = 'teacher';
    } else if (metadata.hashedAddress === learnerData?.hashedLearnerAddress) {
      validatedRole = 'learner';
    }

    if (!validatedRole) {
      console.log('Invalid peer - metadata did not match any user');
      throw new Error('Invalid peer - metadata did not match any user');
    }
    return validatedRole;
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        duration: 3600000, // 1 hour
        firstJoinTime,
        firstJoinRole
      })
    });
  }
}

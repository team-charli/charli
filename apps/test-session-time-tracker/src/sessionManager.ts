// sessionManager.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { User, ClientData, PinataResponse, UserFinalRecord } from './types';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";
import { DOEnv, Env } from './env';

export class SessionManager extends DurableObject<DOEnv> {
  private app = new Hono<Env>();
  private roomId!: string;
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
      // console.log('clientData sessionManager', {clientData})
      const { userAddress, hashedTeacherAddress, hashedLearnerAddress, sessionDuration, clientSideRoomId} = clientData;
      this.roomId = clientSideRoomId;
      // Validate user and assign role
      const userAddressHashBytes = keccak256(hexToBytes(userAddress));
      const userAddressHash = toHex(userAddressHashBytes);
      // console.log('/init hashes:', { userAddressHash, hashedTeacherAddress, hashedLearnerAddress });

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
      // console.log('SessionManager received webhook:', webhookData);

      try {
        const event = JSON.parse(webhookData);
        // console.log('Parsed webhook event:', event);

        if (event.event === 'peer:joined') {
          const peerData = event.payload[0].data;
          const metadataStr = peerData.metadata || '{}';
          let metadataObj: Record<string, unknown>;
          try {
            metadataObj = JSON.parse(metadataStr);
          } catch {
            metadataObj = {};
          }

          // Get stored user data for validation
          let teacherData = await this.state.storage.get('user:teacher') as User;
          let learnerData = await this.state.storage.get('user:learner') as User;

          // Validate and determine role
          // console.log('Validation data:', {
          //   incomingHash: metadata.hashedAddress,
          //   storedTeacherHash: teacherData?.hashedTeacherAddress,
          //   storedLearnerHash: learnerData?.hashedLearnerAddress,
          //   teacherData,
          //   learnerData
          // });
          const validatedRole = this.validateRole(metadataObj, teacherData, learnerData);
          // console.log(`SessionManager: Received ${event.event} event for roomId=${metadata.roomId}, peerId=${peerData.id}`);
          // console.log(`SessionManager: Validate Role => metadata.hashedAddress=${metadata.hashedAddress}, teacherHash=${teacherData?.hashedTeacherAddress}, learnerHash=${learnerData?.hashedLearnerAddress}`);
          // console.log(`SessionManager: Assigned role=${validatedRole} to peerId=${peerData.id}`);

          const userData = validatedRole === 'teacher' ? teacherData : learnerData;
          userData.peerId = peerData.id;
          userData.joinedAt = peerData.joinedAt;


          // console.log(`Updating ${validatedRole} data:`, userData);
          await this.state.storage.put(`user:${validatedRole}`, userData);
          teacherData = await this.state.storage.get('user:teacher') as User;

          // console.log("teacherData", teacherData)
          learnerData = await this.state.storage.get('user:learner') as User;
          // console.log("learnerData", learnerData);

          // Forward validated data to ConnectionManager
          try {
            // Forward validated data to ConnectionManager
            const connectionManager = c.env.CONNECTION_MANAGER.get(
              c.env.CONNECTION_MANAGER.idFromName(this.roomId)
            );
            // console.log("sessionManager call to http://connection-manager/handlePeer", {peerId: peerData.id, role: validatedRole, joinedAt: peerData.joinedAt, roomId: this.roomId})

            const response = await connectionManager.fetch('http://connection-manager/handlePeer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                peerId: peerData.id,
                role: validatedRole,
                joinedAt: peerData.joinedAt,
                roomId: this.roomId,
                teacherData,
                learnerData
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
          let teacherData = await this.state.storage.get('user:teacher') as User;
          let learnerData = await this.state.storage.get('user:learner') as User;
          let role: 'teacher' | 'learner';

          const metadataStr = peerData.metadata || '{}';
          let metadataObj: Record<string, unknown>;
          try {
            metadataObj = JSON.parse(metadataStr);
          } catch {
            metadataObj = {};
          }
          const validatedRole = this.validateRole(metadataObj, teacherData, learnerData);

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

          teacherData = await this.state.storage.get('user:teacher') as User;

          learnerData = await this.state.storage.get('user:learner') as User;

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
              role: validatedRole,
              teacherData,
              learnerData
            })
          });
        }

        return c.text('OK');
      } catch (error) {
        console.error('SessionManager webhook error:', error);
        return c.json({ error: 'Error processing webhook' }, 400);
      }
    });

    this.app.post('/finalizeSession', async (c) => {
      // scenario='fault' or 'non_fault'
      const { scenario, faultType, faultedRole } = await c.req.json<{
        scenario: 'fault' | 'non_fault',
        faultType?: string,
        faultedRole?: 'teacher' | 'learner'
      }>();

      // Retrieve original user data
      const teacherData = await this.state.storage.get<User>('user:teacher');
      const learnerData = await this.state.storage.get<User>('user:learner');

      // Construct final records
      let teacherDataComplete: UserFinalRecord;
      let learnerDataComplete: UserFinalRecord;

      if (scenario === 'non_fault') {
        teacherDataComplete = {
          ...teacherData,
          sessionSuccess: true,
          faultType: null,
          sessionComplete: true
        };
        learnerDataComplete = {
          ...learnerData,
          sessionSuccess: true,
          faultType: null,
          sessionComplete: true
        };
      } else {
        // Fault scenario
        // faultType and faultedRole must be provided
        const finalFaultType = faultType || 'unknown_fault';
        // In a fault scenario, both user records reflect the session ended in fault,
        // but you may choose to differentiate the user who caused the fault by their role.
        teacherDataComplete = {
          ...teacherData,
          sessionSuccess: false,
          faultType: finalFaultType,
          sessionComplete: true
        };
        learnerDataComplete = {
          ...learnerData,
          sessionSuccess: false,
          faultType: finalFaultType,
          sessionComplete: true
        };
      }

      const pinataPayload = {
        teacherData: teacherDataComplete,
        learnerData: learnerDataComplete,
        scenario,
        timestamp: Date.now()
      };

      // Post final data to IPFS via Pinata
      const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': c.env.PINATA_API_KEY,
          'pinata_secret_api_key': c.env.PINATA_SECRET_API_KEY
        },
        body: JSON.stringify({ pinataContent: pinataPayload })
      });

      let ipfsHash = null;
      if (pinataRes.ok) {
        const result = (await pinataRes.json()) as PinataResponse;
        ipfsHash = result.IpfsHash;
      }

      // Broadcast finalization to clients
      const messageRelay = c.env.MESSAGE_RELAY.get(
        c.env.MESSAGE_RELAY.idFromName(this.roomId)
      );

      const broadcastData: any = {
        status: scenario === 'non_fault' ? 'success' : 'fault',
        ipfsHash,
        timestamp: Date.now()
      };

      if (scenario === 'fault' && faultType && faultedRole) {
        broadcastData.faultType = faultType;
        broadcastData.faultedRole = faultedRole;
      }

      await messageRelay.fetch(`http://message-relay/broadcast/${this.roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'finalized',
          data: broadcastData
        })
      });

      // Cleanup SessionManager
      await this.state.storage.deleteAll();

      // Instruct other DOs to cleanup
      const sessionTimer = c.env.SESSION_TIMER.get(c.env.SESSION_TIMER.idFromName(this.roomId));
      await sessionTimer.fetch('http://session-timer/cleanup', { method: 'POST' });

      const connectionManager = c.env.CONNECTION_MANAGER.get(
        c.env.CONNECTION_MANAGER.idFromName(this.roomId)
      );
      await connectionManager.fetch('http://connection-manager/cleanup', { method: 'POST' });

      return c.json({ status: 'finalized' });
    });

  }

  async fetch(request: Request) {
    return this.app.fetch(request, this.env);
  }

  private validateRole = (metadata:  Record<string, unknown>, teacherData: User, learnerData: User): ('teacher' | 'learner' | null) => {

    let validatedRole: 'teacher' | 'learner'
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
        firstJoinRole,
        roomId: this.roomId
      })
    });
  }
}

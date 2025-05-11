// sessionManager.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { User, ClientData, UserFinalRecord, AddressDecryptData } from './types';
import { DOEnv, Env } from './env';
import { ethers } from 'ethers';
import { PinataSDK } from 'pinata';
import { createClient } from '@supabase/supabase-js'


export class SessionManager extends DurableObject<DOEnv> {
  private app = new Hono<Env>();
  private roomId!: string;
  // Create a single supabase client for interacting with your database

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
      finalized: boolean
   */

  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: DOEnv) {
    super(state, env);
    this.state = state;
    this.env = env;
    const supabaseClient = createClient("https://onhlhmondvxwwiwnruvo.supabase.co", this.env.SUPABASE_SERVICE_ROLE_KEY)


    // ---------------------------
    // POST /init
    // ---------------------------
    this.app.post('/init', async (c) => {
      const wasAlreadyFinalized = await this.state.storage.get('finalized');
      if (wasAlreadyFinalized) {
        return c.json({ error: "Session is already finalized" }, 400);
      }

      console.log('[SessionManager:init] Entered /init route', new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}));

      const clientData = await c.req.json<ClientData>();

      // 0) Check all clientData
      for (const field in clientData) {
        if (!clientData[field as keyof ClientData]) {
          return c.json({ error: `Missing required property: ${field}` }, 400);
        }
      }
      const {
        userAddress,
        hashedTeacherAddress,
        hashedLearnerAddress,
        sessionDuration,
        clientSideRoomId,
        teacherAddressCiphertext,
        teacherAddressEncryptHash,
        learnerAddressCiphertext,
        learnerAddressEncryptHash,
        controllerAddress,
        secureSessionId,
        requestedSessionDurationLearnerSig,
        requestedSessionDurationTeacherSig,
        sessionDurationData
      } = clientData;


      // 1) Update addressDecryptData if present
      if (teacherAddressCiphertext || learnerAddressCiphertext) {
        const addressDecryptData = await this.state.storage.get<Record<string, string>>('addressDecryptData') || {};
        Object.assign(addressDecryptData, {
          teacherAddressCiphertext,
          teacherAddressEncryptHash,
          learnerAddressCiphertext,
          learnerAddressEncryptHash,
        });
        await this.state.storage.put('addressDecryptData', addressDecryptData);
      }

      // 2) Track roomId & controllerAddress
      const storedControllerAddress = await this.state.storage.get<string>('controllerAddress');
      if (storedControllerAddress && storedControllerAddress !== controllerAddress) {
        return c.json({
          error: 'Mismatching controllerAddress',
          storedControllerAddress,
          receivedControllerAddress: controllerAddress
        }, 400);
      }
      await this.state.storage.put('controllerAddress', controllerAddress);

      await this.state.storage.put('roomId', clientSideRoomId);

      // 3) Validate user & assign role
      if (!userAddress) {
        return c.json({ status: 'error', message: 'No userAddress provided' }, 400);
      }
      const userAddressHash = ethers.keccak256(userAddress);
      const isTeacher = (userAddressHash === hashedTeacherAddress);
      const isLearner = (userAddressHash === hashedLearnerAddress);
      const role = isTeacher ? 'teacher' : isLearner ? 'learner' : null;

      if (!role) {
        return c.json({
          status: 'error',
          message: 'User address does not match teacher or learner (raw hash mismatch)'
        }, 403);
      }

      // 4) Check mandatory fields
      if (!secureSessionId || !sessionDuration || !sessionDurationData) {
        return c.json({ error: 'Missing required data' }, 400);
      }

      // 5) Verify sessionDurationData integrity
      const reDerivedHash = ethers.keccak256(
        ethers.concat([
          ethers.toUtf8Bytes(secureSessionId),
          ethers.toBeHex(sessionDuration)
        ])
      );

      if (reDerivedHash !== sessionDurationData) {
        console.error({
          reDerivedHash,
          sessionDurationData,
          secureSessionId,
          sessionDuration
        });
        return c.json({ error: 'sessionDurationData mismatch – potential tampering' }, 403);
      }

      // 6) Store sessionDuration
      const sessionDurationMs = sessionDuration * 60_000;
      await this.state.storage.put('sessionDuration', sessionDurationMs);

      // Decide which signature we’re verifying
      const signature = (role === 'teacher')
        ? requestedSessionDurationTeacherSig
        : requestedSessionDurationLearnerSig;

      if (!signature) {
        return c.json({ error: `Missing ${role} signature` }, 400);
      }

      // 7) Verify the signature
      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(sessionDurationData),
        signature
      );
      const hashedRecoveredAddressChecksummed = ethers.keccak256(recoveredAddress);
      const hashedRecoveredAddressLowercase = ethers.keccak256(recoveredAddress.toLowerCase());
      const expectedHashed = (role === 'teacher')
        ? hashedTeacherAddress
        : hashedLearnerAddress;

      if (
        hashedRecoveredAddressChecksummed !== expectedHashed &&
          hashedRecoveredAddressLowercase !== expectedHashed
      ) {
        console.error({
          hashedRecoveredAddressChecksummed,
          hashedRecoveredAddressLowercase,
          expectedHashed,
          recoveredAddress
        });
        return c.json({ error: `${role} signature mismatch` }, 403);
      }

      // 8) All checks passed → store the user object for future “peer:joined” validation
      const newUser: User = {
        role,
        peerId: null,
        roomId: clientSideRoomId,
        hashedTeacherAddress,
        hashedLearnerAddress,
        joinedAt: null,
        leftAt: null,
        duration: null,
        sessionDuration
      };
      await this.state.storage.put(`user:${role}`, newUser);

      // 9) Return success
      return c.json({ status: 'ok', stored: `user:${role}` }, 200);
    });

    this.app.post('/webhook', async (c) => {
      const wasAlreadyFinalized = await this.state.storage.get('finalized');
      if (wasAlreadyFinalized) {
        return new Response('Session is finalized. Ignoring.', { status: 200 });
      }
      this.roomId = await this.state.storage.get('roomId') as string;
      const webhookData = await c.req.text();

      try {
        const event = JSON.parse(webhookData);
        console.log("webhook event", event);

        if (event.event === 'peer:joined') {
          console.log('[SessionManager:webhook] Handling peer:joined => peerId:', event.data.id, new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}));

          const peerData = event.data;
          if (peerData.role === 'bot') {
            console.log(`[SessionManager] Ignoring bot peer: ${peerData.id}`);
            return c.text('Ignoring bot peer', 200);
          }
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
          const validatedRole = this.validateRole(metadataObj, teacherData, learnerData);

          const userData = validatedRole === 'teacher' ? teacherData : learnerData;
          userData.peerId = peerData.id;
          userData.joinedAt = peerData.joinedAt;

          await this.state.storage.put(`user:${validatedRole}`, userData);
          teacherData = await this.state.storage.get('user:teacher') as User;

          learnerData = await this.state.storage.get('user:learner') as User;

          // Forward validated data to ConnectionManager
          try {
            const connectionManager = c.env.CONNECTION_MANAGER.get(
              c.env.CONNECTION_MANAGER.idFromName(this.roomId)
            );

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
            const sessionDuration = await this.state.storage.get<number>('sessionDuration');
            await this.startSessionTimer(c, peerData.joinedAt, validatedRole, sessionDuration);
          }

          if (Object.keys(users).length === 2) {
            // Both users have joined

            const sessionTimer = c.env.SESSION_TIMER.get(
              c.env.SESSION_TIMER.idFromName(this.roomId)
            );
            await sessionTimer.fetch('http://session-timer/cancelNoJoinCheck', {
              method: 'POST'
            });
          }
        } else if (event.event === 'peer:left') {
          console.log('[SessionManager:webhook] Handling peer:left => peerId:', event.data.id, new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}));
          const peerData = event.data;
          let teacherData = await this.state.storage.get('user:teacher') as User;
          let learnerData = await this.state.storage.get('user:learner') as User;

          const metadataStr = peerData.metadata || '{}';
          let metadataObj: Record<string, unknown>;
          try {
            metadataObj = JSON.parse(metadataStr);
          } catch {
            metadataObj = {};
          }
          const validatedRole = this.validateRole(metadataObj, teacherData, learnerData);

          if (teacherData?.peerId === peerData.id) {
            teacherData.leftAt = peerData.leftAt;
            teacherData.duration = peerData.leftAt - (teacherData.joinedAt || 0);

            await this.state.storage.put('user:teacher', teacherData);
          } else if (learnerData?.peerId === peerData.id) {
            learnerData.leftAt = peerData.leftAt;
            learnerData.duration = peerData.leftAt - (learnerData.joinedAt || 0);

            await this.state.storage.put('user:learner', learnerData);
          } else {
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
              learnerData,
              roomId: this.roomId
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
      await this.stopRecordingFallback()
      // references to other DOs
      const messageRelay = c.env.MESSAGE_RELAY.get(
        c.env.MESSAGE_RELAY.idFromName(this.roomId)
      );

      const sessionTimer = c.env.SESSION_TIMER.get(
        c.env.SESSION_TIMER.idFromName(this.roomId)
      );

      // We'll store a pinned error record CID here if we hit an error
      let failCID: string | null = null;

      try {
        // 1. Gather scenario/fault from request
        const body = await c.req.json<{
          scenario: 'fault' | 'non_fault',
          faultType?: string,
          faultedRole?: 'teacher' | 'learner'
        }>();
        console.log('[SessionManager:finalizeSession] Entered => body:', body, new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}));
        const { scenario, faultType, faultedRole } = body;

        // If this DO instance doesn't have roomId loaded, fetch from storage
        if (!this.roomId) {
          this.roomId = (await this.state.storage.get('roomId')) as string;
        }

        // 2. Load teacher + learner data from storage
        const defaultUser: User = {
          role: null,
          peerId: null,
          roomId: null,
          joinedAt: null,
          leftAt: null,
          duration: null,
          hashedTeacherAddress: '',
          hashedLearnerAddress: '',
          sessionDuration: 0
        };
        function safeMergeUser(partialUser: Partial<User>): User {
          return { ...defaultUser, ...partialUser };
        }

        const rawTeacher = (await this.state.storage.get<User>('user:teacher')) || {};
        const rawLearner = (await this.state.storage.get<User>('user:learner')) || {};

        const teacherData = safeMergeUser(rawTeacher);
        const learnerData = safeMergeUser(rawLearner);

        // 3. Construct final scenario-based records
        let teacherDataComplete: UserFinalRecord;
        let learnerDataComplete: UserFinalRecord;

        if (scenario === 'non_fault') {
          teacherDataComplete = {
            ...teacherData,
            sessionSuccess: true,
            faultType: null,
            sessionComplete: true,
            isFault: null
          };
          learnerDataComplete = {
            ...learnerData,
            sessionSuccess: true,
            faultType: null,
            sessionComplete: true,
            isFault: null
          };
        } else {
          // fault scenario
          teacherDataComplete = {
            ...teacherData,
            sessionSuccess: false,
            faultType: faultType,
            sessionComplete: true,
            isFault: faultedRole === 'teacher'
          };
          learnerDataComplete = {
            ...learnerData,
            sessionSuccess: false,
            faultType: faultType,
            sessionComplete: true,
            isFault: faultedRole === 'learner'
          };
        }

        // This is the object we want to finalize
        const sessionData = {
          teacherData: teacherDataComplete,
          learnerData: learnerDataComplete,
          scenario,
          timestamp: Date.now(),
          roomId: this.roomId
        };

        // 4. Get address decryption data + controller from storage
        const addressDecryptData = await this.state.storage.get<AddressDecryptData>('addressDecryptData');
        if (!addressDecryptData) {
          console.error('Missing addressDecryptData on finalizeSession');
          return c.json({ error: 'addressDecryptData missing' }, 500);
        }
        const controllerAddress = await this.state.storage.get('controllerAddress');
        if (!controllerAddress) {
          console.error('Missing controllerAddress on finalizeSession');
          return c.json({ error: 'controllerAddress missing' }, 500);
        }

        // 5. Sign sessionData so the Lit Action can verify authenticity
        const { sessionDataSignature, finalizeEdgeAddress } =
          await this.signWithDOPrivateKey(JSON.stringify(sessionData));

        // 6. Call the Edge Function (execute-finalize-action) with the raw data + signature
        let edgeResponse: Response;
        try {
          edgeResponse = await fetch(
            'https://onhlhmondvxwwiwnruvo.supabase.co/functions/v1/execute-finalize-action',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionData,
                sessionDataSignature,
                teacherAddressCiphertext: addressDecryptData.teacherAddressCiphertext,
                teacherAddressEncryptHash: addressDecryptData.teacherAddressEncryptHash,
                learnerAddressCiphertext: addressDecryptData.learnerAddressCiphertext,
                learnerAddressEncryptHash: addressDecryptData.learnerAddressEncryptHash,
                controllerAddress,
                finalizeEdgeAddress
              })
            }
          );
        } catch (err) {
          console.error('[finalizeSession] Edge function unreachable:', err);

          // If we can't even reach the Edge function, pin an error record
          const errorRecord = {
            sessionData,
            error: `Edge function unreachable: ${String(err)}`,
            pinnedAt: Date.now()
          };
          failCID = await this.pinToPinata(JSON.stringify(errorRecord));

          const {error, data} = await supabaseClient.from('sessions')
            .update({'session_resolved': true, 'finalized_ipfs_cid': failCID})
            .eq('huddle_room_id', this.roomId)
            .select('*');

          if (error) {
            console.error(error, new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}))
          } else {
            console.log("data", data, new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}))
          }

          // Also broadcast the error
          await messageRelay.fetch(`http://message-relay/broadcast/${this.roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'finalized',
              data: {
                status: 'error',
                reason: 'Edge function unreachable',
                ipfsHash: failCID
              }
            })
          });
          await sessionTimer.fetch('http://session-timer/scheduleFinalCleanup', {
            method: 'POST',
            // optionally include a JSON body with a custom delay
          });
          return c.json({ error: 'Edge function unreachable', failCID }, 500);
        }

        if (!edgeResponse.ok) {
          // The Lit Action or Edge Function returned a runtime error
          const errorDetails = await edgeResponse.json().catch(() => null);
          console.error('[finalizeSession] Lit Action exec failed =>', errorDetails);

          // Pin an error record
          const errorRecord = {
            sessionData,
            error: errorDetails,
            pinnedAt: Date.now()
          };
          failCID = await this.pinToPinata(JSON.stringify(errorRecord));

          const {error, data} = await supabaseClient.from('sessions')
            .update({'session_resolved': true, 'finalized_ipfs_cid': failCID})
            .eq('huddle_room_id', this.roomId)
            .select('*');

          if (error) {
            console.error(error, new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}))
          } else {
            console.log("data", data, new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}))
          }

          // Broadcast the error
          await messageRelay.fetch(`http://message-relay/broadcast/${this.roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'finalized',
              data: {
                status: 'error',
                reason: 'Lit Action failed',
                ipfsHash: failCID
              }
            })
          });
          await sessionTimer.fetch('http://session-timer/scheduleFinalCleanup', {
            method: 'POST',
            // optionally include a JSON body with a custom delay
          });
          return c.json({ error: 'Lit Action failed', failCID }, 500);
        }

        // 7. Parse success from Edge
        const litActionResult: { transactionHash?: string; [key: string]: any } =
          await edgeResponse.json();
        console.log('[finalizeSession] litActionResult =>', litActionResult, new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}));

        if (!litActionResult.transactionHash) {
          // Possibly an unexpected result
          console.error('[finalizeSession] No transactionHash returned =>', litActionResult);
          const incompleteRecord = {
            sessionData,
            pinnedAt: Date.now(),
            reason: 'No txHash in litActionResult'
          };
          failCID = await this.pinToPinata(JSON.stringify(incompleteRecord));
          const {error, data} = await supabaseClient.from('sessions')
            .update({'session_resolved': true, 'finalized_ipfs_cid': failCID})
            .eq('huddle_room_id', this.roomId)
            .select('*');


          if (error) {
            console.error(error)
          } else {
            console.log("data", data)
          }

          // Broadcast
          await messageRelay.fetch(`http://message-relay/broadcast/${this.roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'finalized',
              data: {
                status: 'error',
                reason: 'No txHash from Lit Action',
                ipfsHash: failCID
              }
            })
          });

          await sessionTimer.fetch('http://session-timer/scheduleFinalCleanup', {
            method: 'POST',
            // optionally include a JSON body with a custom delay
          });
          return c.json({ error: 'Missing txHash', failCID }, 500);
        }

        // 8. Pin final "receipt" (session data + the txHash)
        const finalReceipt = {
          ...sessionData,
          transactionHash: litActionResult.transactionHash,
          pinnedAt: Date.now()
        };
        const finalCID = await this.pinToPinata(JSON.stringify(finalReceipt));
        console.log('[finalizeSession] pinned final receipt to IPFS =>', finalCID, new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}));

        // 9. update sessions table
        const {error, data} = await supabaseClient.from('sessions')
          .update({'session_resolved': true, 'finalized_ipfs_cid': finalCID})
          .eq('huddle_room_id', this.roomId)
          .select('*');


        if (error) {
          console.error(error)
        } else {
          console.log("data", data)
        }

        // 10. Broadcast finalization
        const broadcastData: any = {
          status: scenario === 'non_fault' ? 'success' : 'fault',
          transactionHash: litActionResult.transactionHash,
          ipfsHash: finalCID,
          timestamp: Date.now()
        };

        if (scenario === 'fault' && faultType && faultedRole) {
          broadcastData.faultType = faultType;
          broadcastData.faultedRole = faultedRole;
        }

        await messageRelay.fetch(`http://message-relay/broadcast/${this.roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'finalized', data: broadcastData })
        });
        await sessionTimer.fetch('http://session-timer/scheduleFinalCleanup', {
          method: 'POST',
          // optionally include a JSON body with a custom delay
        });
        // Return success
        return c.json({ status: 'finalized', ipfsHash: finalCID });
      } catch (e) {
        console.error('[finalizeSession] Caught error =>', e);

        // If something else fails entirely, e.g. we can't even pin or parse:
        await messageRelay.fetch(`http://message-relay/broadcast/${this.roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'finalized',
            data: `error: ${String(e)}`
          })
        });

        return c.json({ error: String(e) }, 500);
      } finally {
        await this.state.storage.put('finalized', true);
        console.log('[SessionManager:finalizeSession] Mark finalized in storage ', new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}));
      }
    });

    this.app.post('/cleanupSessionManager', async (c) => {
      const allEntries = await this.state.storage.list();
      for (const key of allEntries.keys()) {
        if (key === 'finalized') continue;
        await this.state.storage.delete(key);
      }
      return c.text('Cleanup done (preserved "finalized")');
    })
  }

  async fetch(request: Request) {
    const isFinal = await this.state.storage.get<boolean>('finalized');
    if (isFinal) {
      return new Response('Already finalized', { status: 200 });
    }
    return this.app.fetch(request, this.env);
  }

  private validateRole = (metadata:  Record<string, unknown>, teacherData: User, learnerData: User): ('teacher' | 'learner' | null) => {

    let validatedRole: 'teacher' | 'learner'
    if (metadata?.hashedAddress === teacherData?.hashedTeacherAddress) {
      validatedRole = 'teacher';
    } else if (metadata?.hashedAddress === learnerData?.hashedLearnerAddress) {
      validatedRole = 'learner';
    } else {
      console.error("metadata", {metadataHashedAddress: metadata?.hashedAddress, storedTeacherHash: teacherData?.hashedTeacherAddress, storedLearnerHash: learnerData?.hashedLearnerAddress});
    }

    if (!validatedRole) {
      console.trace();
      throw new Error('Invalid peer - metadata did not match any user');
    }
    return validatedRole;
  }

  private async signWithDOPrivateKey(data: string | Uint8Array) {
    const privateKey = this.env.PRIVATE_KEY_FINALIZE_EDGE;
    const provider = new ethers.JsonRpcProvider(this.env.PROVIDER_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const signature = await wallet.signMessage(data);

    return {sessionDataSignature: signature, finalizeEdgeAddress: wallet.address}
  }

  private async pinToPinata(jsonData: string): Promise<string> {
    const pinata = new PinataSDK({
      pinataJwt: this.env.PINATA_JWT,
      pinataGateway: "chocolate-deliberate-squirrel-286.mypinata.cloud",
    });

    const uploadResponse = await pinata.upload.public.json(
      JSON.parse(jsonData),
      { metadata: { name: `session-${new Date().toISOString()}` } }
    );

    if (!uploadResponse.cid) {
      throw new Error('Pinata did not return an IpfsHash');
    }

    console.log('[pinToPinata] Pin success => CID:', uploadResponse.cid, new Date().toLocaleString('en-US', {timeZone: 'America/Cancun'}));
    return uploadResponse.cid;
  }

  private async getJoinedUsers() {
    const teacher = await this.state.storage.get('user:teacher') as User;
    const learner = await this.state.storage.get('user:learner') as User;
    const users: Record<string, User> = {};

    if (teacher?.joinedAt) users['teacher'] = teacher;
    if (learner?.joinedAt) users['learner'] = learner;

    return users;
  }

  private async startSessionTimer(c: any, firstJoinTime: number, firstJoinRole: 'teacher' | 'learner', sessionDuration: number) {
    if (!this.roomId) this.roomId = await this.state.storage.get('roomId') as string;

    const sessionTimer = c.env.SESSION_TIMER.get(
      c.env.SESSION_TIMER.idFromName(this.roomId)
    );

    await sessionTimer.fetch('http://session-timer/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        duration: sessionDuration,
        firstJoinTime,
        firstJoinRole,
        roomId: this.roomId
      })
    });
  }
  private async stopRecordingFallback() {
    if (!this.roomId) {
      this.roomId = await this.state.storage.get<string>('roomId');
    }
    if (!this.roomId) {
      console.warn('[stopRecordingFallback] No roomId in storage – skipping stopHuddleRecording');
      return;
    }

    try {
      const response = await fetch('https://onhlhmondvxwwiwnruvo.supabase.co/functions/v1/huddleRecording', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,

        },
        body: JSON.stringify({
          roomId: this.roomId,
          action: 'stopHuddleRecording',
        }),
      });

      if (!response.ok) {
        console.error(`[stopRecordingFallback] Supabase function returned error:`, await response.text());
      } else {
        console.log('[stopRecordingFallback] stopHuddleRecording succeeded or was already stopped');
      }
    } catch (err) {
      console.error('[stopRecordingFallback] fetch() failed:', err);
    }
  }

}

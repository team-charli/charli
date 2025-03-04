// sessionManager.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { User, ClientData, PinataResponse, UserFinalRecord, EdgeFunctionResponse, AddressDecryptData } from './types';
import { DOEnv, Env } from './env';
import {ethers} from 'ethers';
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


    // ---------------------------
    // POST /init
    // ---------------------------
    this.app.post('/init', async (c) => {
      const clientData = await c.req.json<ClientData>();

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
      //    EXACT match to the client’s raw approach:
      if (!userAddress) {
        return c.json({ status: 'error', message: 'No userAddress provided' }, 400);
      }
      const userAddressHash = ethers.keccak256(userAddress);  // no getAddress(), no toLowerCase()
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
          ethers.toBeHex(sessionDuration) // EXACT client encoding, NO changes
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

      // Store sessionDuration
      await this.state.storage.put('sessionDuration', sessionDuration);

      // Decide which signature we’re verifying
      const signature = (role === 'teacher')
        ? requestedSessionDurationTeacherSig
        : requestedSessionDurationLearnerSig;

      if (!signature) {
        return c.json({ error: `Missing ${role} signature` }, 400);
      }

      // 6) Verify the signature
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
      return c.json({ status: 'ok' }, 200);
    });

    this.app.post('/webhook', async (c) => {
      this.roomId = await this.state.storage.get('roomId') as string;
      const webhookData = await c.req.text();
      //console.log('SessionManager received webhook:', webhookData);

      try {
        const event = JSON.parse(webhookData);
        // console.log('Parsed webhook event:', event);

        if (event.event === 'peer:joined') {
          const peerData = event.payload;
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
          //console.log('Validation data:', { incomingHash: metadataObj.hashedAddress, storedTeacherHash: teacherData?.hashedTeacherAddress, storedLearnerHash: learnerData?.hashedLearnerAddress, teacherData, learnerData });
          const validatedRole = this.validateRole(metadataObj, teacherData, learnerData);

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
            //console.log("this.roomId", {"this.roomId": this.roomId, where: "before connectionManager stub"} );
            const connectionManager = c.env.CONNECTION_MANAGER.get(
              c.env.CONNECTION_MANAGER.idFromName(this.roomId)
            );
            // console.log("sessionManager call to http://connection-manager/handlePeer", {peerId: peerData.id, role: validatedRole, joinedAt: peerData.joinedAt, "this.roomId": this.roomId})

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
            //console.log("this.roomId", {"this.roomId": this.roomId, where: "sessionManager stub {both users joined}"} );

            const sessionTimer = c.env.SESSION_TIMER.get(
              c.env.SESSION_TIMER.idFromName(this.roomId)
            );
            await sessionTimer.fetch('http://session-timer/cancelNoJoinCheck', {
              method: 'POST'
            });
          }
        } else if (event.event === 'peer:left') {
          const peerData = event.payload;
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
      // scenario='fault' or 'non_fault'
      const { scenario, faultType, faultedRole} = await c.req.json<{
        scenario: 'fault' | 'non_fault',
        faultType?: string,
        faultedRole?: 'teacher' | 'learner',
      }>();
      if (!this.roomId) this.roomId = await this.state.storage.get("roomId") as string;

      //console.log(`SessionManager: finalizeSession called with scenario=${scenario}, faultType=${faultType}, faultedRole=${faultedRole}, this.roomId=${this.roomId}`);

      // Retrieve original user data
      // A minimal "safe" default for all required User fields
      const defaultUser: User = {
        role: null,
        peerId: null,
        roomId: null,
        joinedAt: null,
        leftAt: null,
        duration: null,
        hashedTeacherAddress: "",
        hashedLearnerAddress: "",
        sessionDuration: 0,
      };

      // A helper function to return a full `User` from partial data
      function safeMergeUser(partialUser: Partial<User>): User {
        return { ...defaultUser, ...partialUser };
      }

      // Then in finalizeSession:
      const rawTeacher = await this.state.storage.get<User>('user:teacher') || {};
      const rawLearner = await this.state.storage.get<User>('user:learner') || {};

      // Merge partial data with defaults
      const teacherData = safeMergeUser(rawTeacher);
      const learnerData = safeMergeUser(rawLearner);

      // Construct final records
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
        //console.log("sessionmanager: teacherdatacomplete:", teacherdatacomplete);
        //console.log("sessionmanager: learnerdatacomplete:", learnerdatacomplete);

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
          sessionComplete: true,
          isFault: faultedRole === 'teacher' ? true : false
        };
        learnerDataComplete = {
          ...learnerData,
          sessionSuccess: false,
          faultType: finalFaultType,
          sessionComplete: true,
          isFault: faultedRole === 'learner' ? true : false
        };
      }

      const pinataPayload = {
        teacherData: teacherDataComplete,
        learnerData: learnerDataComplete,
        scenario,
        timestamp: Date.now(),
        roomId: this.roomId
      };

      // Post final data to IPFS via Pinata
      const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': c.env.PINATA_API_KEY,
          'pinata_secret_api_key': c.env.PINATA_SECRET_API_KEY
        },
        body: JSON.stringify({
          pinataContent: pinataPayload,
          pinataOptions: {
            cidVersion: 1
          }
        })
      });
      let ipfsHash = null;
      if (pinataRes.ok) {
        const result = (await pinataRes.json()) as PinataResponse;
        ipfsHash = result.IpfsHash;
        console.log("ipfsHash", ipfsHash);
      }

      const addressDecryptData: AddressDecryptData = await this.state.storage.get('addressDecryptData') ;
      const controllerAddress = this.state.storage.get('controllerAddress')
      // call Lit Action through function
      //console.log("c.env.EXECUTE_FINALIZE_ACTION_URL", c.env.EXECUTE_FINALIZE_ACTION_URL);
      const edgeResponse = await fetch('https://onhlhmondvxwwiwnruvo.supabase.co/functions/v1/execute-finalize-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pinataPayload,
          sessionDataIpfsHash: ipfsHash,
          teacherAddressCiphertext: addressDecryptData.teacherAddressCiphertext,
          teacherAddressEncryptHash: addressDecryptData.teacherAddressEncryptHash,
          learnerAddressCiphertext: addressDecryptData.learnerAddressCiphertext,
          learnerAddressEncryptHash: addressDecryptData.teacherAddressEncryptHash,
          controllerAddress
        })
      });

      const litActionResult: EdgeFunctionResponse= await edgeResponse.json();

      console.log("litActionResult", litActionResult);
      // Handle the response
      if (litActionResult.error) {
        console.error('Lit Action execution failed:', litActionResult.error);
        // Implement retry logic or error handling
      }
      // Broadcast finalization to clients
      const messageRelay = c.env.MESSAGE_RELAY.get(
        c.env.MESSAGE_RELAY.idFromName(this.roomId)
      );

      const broadcastData: any = {
        status: scenario === 'non_fault' ? 'success' : 'fault',
        ipfsHash,
        litActionResult,
        timestamp: Date.now()
      };

      if (scenario === 'fault' && faultType && faultedRole) {
        broadcastData.faultType = faultType;
        broadcastData.faultedRole = faultedRole;
      }
      //console.log("SessionManager: Call MESSAGE-RELAY/broadcast finalized data:", {broadcastData});
      //console.log("SessionManager: Call MESSAGE-RELAY/broadcast this.roomId: ", this.roomId )

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

      await this.state.storage.delete('roomId')
      return c.json({ status: 'finalized' });
    });

  }

  async fetch(request: Request) {
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
    //console.log("SessionManager: validateRole called");
    //console.log("SessionManager: metadata=", metadata);
    //console.log("SessionManager: teacherData=", teacherData);
    //console.log("SessionManager: learnerData=", learnerData);

    if (!validatedRole) {
      console.trace();
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

  private async startSessionTimer(c: any, firstJoinTime: number, firstJoinRole: 'teacher' | 'learner', sessionDuration: number) {
    if (!this.roomId) this.roomId = await this.state.storage.get('roomId') as string;
    //console.log("startSessionTimer called by: ", firstJoinRole)

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
}

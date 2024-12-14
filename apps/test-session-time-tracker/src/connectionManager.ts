// connectionManager.ts
import { Hono } from 'hono';
import { WebhookEvents, WebhookData, User, Message } from './types';
import { DurableObject } from 'cloudflare:workers';
import { DOEnv, Env } from './env';
import {ethers} from 'ethers';

export class ConnectionManager extends DurableObject<DOEnv> {
  private readonly MAX_DISCONNECTIONS = 3;
  private roomId: string;
  private app = new Hono<Env>();
  /**
   * Storage Schema:
   * {
   *   // Maps peer IDs to their validated roles (currently connected peers)
   *   'participants': Record<string, 'teacher' | 'learner'>,
   *
   *   // Tracks disconnect counts for fault detection
   *   'teacher_disconnectCount': number,
   *   'learner_disconnectCount': number,
   *
   *   // Join timestamps for sequencing checks
   *   'joinTimes': Record<'teacher' | 'learner', number>,
   *
   *   // For each disconnected peer, an alarm record stored as:
   *   `alarm:${peerId}`: { alarmTime: number, role: 'teacher' | 'learner' }
   *   //
   * }
   */

  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: DOEnv) {
    super(state, env);
    this.state = state;

    this.app.post('/handlePeer', async (c) => {
      const { peerId, role, joinedAt, roomId, teacherData, learnerData } = await c.req.json();
      this.roomId = roomId;

      // console.log({
      //   component: "ConnectionManager",
      //   method: "handlePeer",
      //   roomId: this.roomId,
      //   action: "receivedPeerJoinedData",
      //   peerId,
      //   role,
      //   joinedAt
      // });

      const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
      if (participants[peerId]) {
        console.error({
          component: "ConnectionManager",
          method: "handlePeer",
          action: "error",
          roomId: this.roomId,
          message: `Peer ${peerId} already has an assigned role ${participants[peerId]}`
        });
        throw new Error(`Peer ${peerId} already has an assigned role`);
      }

      participants[peerId] = role;
      await this.state.storage.put('participants', participants);
      // console.log({
      //   component: "ConnectionManager",
      //   method: "handlePeer",
      //   roomId: this.roomId,
      //   action: "participantsUpdated",
      //   participants
      // });

      // Store join timestamp for fault detection
      const joinTimes = (await this.state.storage.get<Record<string, number>>('joinTimes')) || {};
      joinTimes[role] = joinedAt;
      await this.state.storage.put('joinTimes', joinTimes);
      // console.log({
      //   component: "ConnectionManager",
      //   method: "handlePeer",
      //   roomId: this.roomId,
      //   action: "joinTimesUpdated",
      //   joinTimes
      // });

      if (await this.areBothJoined()) {
        // console.log({
        //   component: "ConnectionManager",
        //   method: "handlePeer",
        //   roomId: this.roomId,
        //   action: "bothJoinedDetected"
        // });
        await this.broadcastBothJoined();
      }

      // Broadcast userJoined message
      // console.log({
      //   component: "ConnectionManager",
      //   method: "handlePeer",
      //   roomId: this.roomId,
      //   action: "broadcastUserJoined",
      //   role,
      //   joinedAt
      // });
      const messageRelay = this.env.MESSAGE_RELAY.get(this.env.MESSAGE_RELAY.idFromName(this.roomId));
      await messageRelay.fetch('http://message-relay/broadcast/' + this.roomId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'userJoined',
          data: {
            role,
            joinedAt
          }
        })
      });

      // Handle existing fault logic
      await this.handleReconnectionEvent(peerId);
      await this.checkJoinSequence(teacherData, learnerData);

      return c.text('OK');
    });

    this.app.post('/handlePeerLeft', async (c) => {
      const { peerId, leftAt, role } = await c.req.json();
      // console.log({
      //   component: "ConnectionManager",
      //   method: "handlePeerLeft",
      //   roomId: this.roomId,
      //   action: "peerLeftEventReceived",
      //   peerId,
      //   role,
      //   leftAt
      // });

      if (!role) {
        console.warn({
          component: "ConnectionManager",
          method: "handlePeerLeft",
          roomId: this.roomId,
          message: "Unknown peer role in peerLeft event",
          peerId
        });
        return c.text('Unknown peer', 400);
      }

      // Get participants map
      const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
      delete participants[peerId];
      await this.state.storage.put('participants', participants);

      // console.log({
      //   component: "ConnectionManager",
      //   method: "handlePeerLeft",
      //   roomId: this.roomId,
      //   action: "participantsUpdatedAfterLeave",
      //   participants
      // });

      // Broadcast userLeft message
      // console.log({
      //   component: "ConnectionManager",
      //   method: "handlePeerLeft",
      //   roomId: this.roomId,
      //   action: "broadcastUserLeft",
      //   peerId,
      //   leftAt
      // });
      const messageRelay = this.env.MESSAGE_RELAY.get(
        this.env.MESSAGE_RELAY.idFromName(this.roomId)
      );

      await messageRelay.fetch('http://message-relay/broadcast/' + this.roomId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'userLeft',
          data: {
            leftAt
          }
        })
      });

      // Handle disconnection tracking
      await this.handleDisconnectionEvent(peerId, role, leftAt);
      return c.text('OK');
    });

    this.app.get('/checkBothJoined', async (c) => {
      const bothJoined = await this.areBothJoined();
      // console.log({
      //   component: "ConnectionManager",
      //   method: "checkBothJoined",
      //   roomId: this.roomId,
      //   bothJoined
      // });
      return c.json({ bothJoined });
    });

    this.app.post('/timerFault', async (c) => {
      const { faultType, data } = await c.req.json<{ faultType: 'noJoin'; data: any }>();
      // console.log({
      //   component: "ConnectionManager",
      //   method: "timerFault",
      //   roomId: this.roomId,
      //   action: "receivedTimerFault",
      //   faultType,
      //   data
      // });
      await this.handleSessionTimerFault(faultType, data);
      return c.text('OK');
    });
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request, this.env);
  }

  private async incrementDisconnectCount(role: 'teacher' | 'learner'): Promise<number> {
    const key = `${role}_disconnectCount`;
    const current = (await this.state.storage.get<number>(key)) || 0;
    const count = current + 1;
    await this.state.storage.put(key, count);
    // console.log({
    //   component: "ConnectionManager",
    //   method: "incrementDisconnectCount",
    //   roomId: this.roomId,
    //   role,
    //   newCount: count
    // });
    return count;
  }

  private async getParticipantRole(peerId: string): Promise<'teacher' | 'learner' | null> {
    const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
    const role = participants[peerId] as 'teacher' | 'learner' || null;
    // console.log({
    //   component: "ConnectionManager",
    //   method: "getParticipantRole",
    //   roomId: this.roomId,
    //   peerId,
    //   role
    // });
    return role;
  }

  async handleWebhookEvent(event: WebhookData) {
    // console.log({
    //   component: "ConnectionManager",
    //   method: "handleWebhookEvent",
    //   roomId: this.roomId,
    //   event: event.event,
    //   payload: event.payload
    // });

    if (event.event === 'peer:joined') {
      const { id: peerId, role, metadata, teacherData, learnerData} = event.payload[0].data;
      // console.log({
      //   component: "ConnectionManager",
      //   method: "handleWebhookEvent",
      //   roomId: this.roomId,
      //   action: "peerJoinedFromWebhook",
      //   peerId,
      //   role,
      //   metadata
      // });

      let parsedMetadata: any;
      if (metadata) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (e) {
          console.error({
            component: "ConnectionManager",
            method: "handleWebhookEvent",
            action: "invalidMetadata",
            peerId,
            error: e.message
          });
          throw new Error(`Invalid metadata format for peer ${peerId}`);
        }
      }

      const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
      if (participants[peerId]) {
        console.error({
          component: "ConnectionManager",
          method: "handleWebhookEvent",
          action: "error",
          message: `Peer ${peerId} already has an assigned role`,
          roomId: this.roomId,
          peerId,
          roleAssigned: participants[peerId]
        });
        throw new Error(`Peer ${peerId} already has an assigned role`);
      }
      participants[peerId] = role;
      await this.state.storage.put('participants', participants);
      // console.log({
      //   component: "ConnectionManager",
      //   method: "handleWebhookEvent",
      //   roomId: this.roomId,
      //   action: "participantsUpdatedViaWebhook",
      //   participants
      // });

      await this.checkJoinSequence(teacherData, learnerData);
      await this.handleReconnectionEvent(peerId);

    } else if (event.event === 'peer:left') {
      const { id: peerId, leftAt, role, teacherData, learnerData } = event.payload['peer:left'][0];
      // console.log({
      //   component: "ConnectionManager",
      //   method: "handleWebhookEvent",
      //   roomId: this.roomId,
      //   action: "peerLeftFromWebhook",
      //   peerId,
      //   leftAt,
      //   role
      // });

      await this.checkJoinSequence(teacherData, learnerData);
      await this.handleDisconnectionEvent(peerId, role, leftAt);
    }
  }

  private async handleReconnectionEvent(peerId: string) {
    const alarmData = await this.state.storage.get<{alarmTime: number, role: 'teacher'|'learner'}>(`alarm:${peerId}`);
    if (alarmData) {
      // console.log({
      //   component: "ConnectionManager",
      //   method: "handleReconnectionEvent",
      //   roomId: this.roomId,
      //   action: "clearingAlarm",
      //   peerId,
      //   alarmData
      // });
      await this.state.storage.delete(`alarm:${peerId}`);
      await this.state.storage.deleteAlarm();
    } else {
      // console.log({
      //   component: "ConnectionManager",
      //   method: "handleReconnectionEvent",
      //   roomId: this.roomId,
      //   action: "noAlarmFound",
      //   peerId
      // });
    }
  }

  private async areBothJoined(): Promise<boolean> {
    const joinTimes = await this.state.storage.get<Record<string, number>>('joinTimes');
    const bothJoined = !!(joinTimes?.['teacher'] && joinTimes?.['learner']);
    // console.log({
    //   component: "ConnectionManager",
    //   method: "areBothJoined",
    //   roomId: this.roomId,
    //   joinTimes,
    //   bothJoined
    // });
    return bothJoined;
  }

  private async broadcastBothJoined(): Promise<void> {
    // console.log({
    //   component: "ConnectionManager",
    //   method: "broadcastBothJoined",
    //   roomId: this.roomId,
    //   action: "broadcasting"
    // });
    const messageRelay = this.env.MESSAGE_RELAY.get(this.env.MESSAGE_RELAY.idFromName(this.roomId));
    await messageRelay.fetch('http://message-relay/broadcast/' + this.roomId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'bothJoined', data: { timestamp: Date.now() } })
    });
  }

  // Fault Case #1: Late join detection
  private async checkJoinSequence(teacherData: User, learnerData: User) {
    // console.log({
    //   component: "ConnectionManager",
    //   method: "checkJoinSequence",
    //   roomId: this.roomId,
    //   teacherData,
    //   learnerData
    // });

    if ((teacherData?.joinedAt || learnerData?.joinedAt) &&
      !(teacherData?.joinedAt && learnerData?.joinedAt)) {
      const firstJoinTime = teacherData?.joinedAt || learnerData?.joinedAt;
      const timeSinceFirstJoin = Date.now() - firstJoinTime;

      // console.log({
      //   component: "ConnectionManager",
      //   method: "checkJoinSequence",
      //   roomId: this.roomId,
      //   firstJoinTime,
      //   timeSinceFirstJoin,
      //   threshold: 180000
      // });

      if (timeSinceFirstJoin > 180000) { // 3 minutes
        const faultedRole = teacherData ? 'learner' : 'teacher';
        // console.log({
        //   component: "ConnectionManager",
        //   method: "checkJoinSequence",
        //   roomId: this.roomId,
        //   action: "lateJoinFaultDetected",
        //   faultedRole
        // });
        const sessionManager = this.env.SESSION_MANAGER.get(
          this.env.SESSION_MANAGER.idFromName(this.roomId)
        );

        await sessionManager.fetch('http://session-manager/finalizeSession', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario: 'fault',
            faultType: `${faultedRole}_late_join`,
            faultedRole
          })
        });
      await this.state.storage.deleteAlarm();
      await this.state.storage.deleteAll();
      }
    }
  }

  // Fault Cases #3 and #4: Disconnection handling
  private async handleDisconnectionEvent(peerId: string, role: 'teacher' | 'learner', leftAt: number) {
    // console.log({
    //   component: "ConnectionManager",
    //   method: "handleDisconnectionEvent",
    //   roomId: this.roomId,
    //   peerId,
    //   role,
    //   leftAt
    // });

    // Fault Case #4: Track disconnect count
    const disconnectCount = await this.incrementDisconnectCount(role);
    // console.log({
    //   component: "ConnectionManager",
    //   method: "handleDisconnectionEvent",
    //   roomId: this.roomId,
    //   action: "disconnectCountUpdated",
    //   role,
    //   disconnectCount
    // });

    if (disconnectCount > this.MAX_DISCONNECTIONS) {
      // console.log({
      //   component: "ConnectionManager",
      //   method: "handleDisconnectionEvent",
      //   roomId: this.roomId,
      //   action: "excessiveDisconnectionsDetected",
      //   role
      // });
      const faultedRole = role;
      const sessionManager = this.env.SESSION_MANAGER.get(
        this.env.SESSION_MANAGER.idFromName(this.roomId)
      );

      await sessionManager.fetch('http://session-manager/finalizeSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: 'fault',
          faultType: `${faultedRole}_excessive_disconnects`,
          faultedRole
        })
      });
      await this.state.storage.deleteAlarm();
      await this.state.storage.deleteAll();

      return;
    }

    // Fault Case #3: Set reconnection window alarm
    const alarmTime = leftAt + 180000; // 3 minutes
    // console.log({
    //   component: "ConnectionManager",
    //   method: "handleDisconnectionEvent",
    //   roomId: this.roomId,
    //   action: "settingReconnectionAlarm",
    //   peerId,
    //   alarmTime: new Date(alarmTime).toISOString()
    // });
    await this.state.storage.put(`alarm:${peerId}`, { alarmTime, role });
    await this.state.storage.setAlarm(alarmTime);
  }

  async handleSessionTimerFault(faultType: 'noJoin' | 'sessionExpired', data: any) {
    // console.log({
    //   component: "ConnectionManager",
    //   method: "handleSessionTimerFault",
    //   roomId: this.roomId,
    //   faultType,
    //   data
    // });
    if (faultType === 'noJoin') {
      // Fault Case #2: Second user never joined
      const faultedRole = data.role;
      const sessionManager = this.env.SESSION_MANAGER.get(
        this.env.SESSION_MANAGER.idFromName(this.roomId)
      );

      await sessionManager.fetch('http://session-manager/finalizeSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: 'fault',
          faultType: `${faultedRole}_never_joined`,
          faultedRole
        })
      });
      await this.state.storage.deleteAlarm();
      await this.state.storage.deleteAll();
    }
  }

  async alarm() {
    // console.log({
    //   component: "ConnectionManager",
    //   method: "alarm",
    //   roomId: this.roomId,
    //   action: "alarmTriggered"
    // });

    const currentTime = Date.now();
    const alarmEntries = await this.state.storage.list<{ alarmTime: number; role: 'teacher' | 'learner' }>({
      prefix: 'alarm:'
    });
    // console.log({
    //   component: "ConnectionManager",
    //   method: "alarm",
    //   roomId: this.roomId,
    //   alarmEntries: Object.fromEntries(alarmEntries)
    // });

    for (const [name, alarmData] of alarmEntries) {
      const peerId = name.slice('alarm:'.length);

      if (alarmData && currentTime >= alarmData.alarmTime) {
        // console.log({
        //   component: "ConnectionManager",
        //   method: "alarm",
        //   roomId: this.roomId,
        //   action: "overdueAlarm",
        //   peerId,
        //   alarmData
        // });
        const faultedRole = alarmData.role;
        const sessionManager = this.env.SESSION_MANAGER.get(
          this.env.SESSION_MANAGER.idFromName(this.roomId)
        );

        await sessionManager.fetch('http://session-manager/finalizeSession', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario: 'fault',
            faultType: `${faultedRole}_failed_to_reconnect`,
            faultedRole
          })
        });

      await this.state.storage.deleteAlarm();
      await this.state.storage.deleteAll();
      }
    }
  }
}

/*
 'learnerFault_didnt_join'      // Fault Case #1
 'teacherFault_didnt_join'      // Fault Case #1
 'secondUser_never_joined'      // Fault Case #2
 'learnerFault_connection_timeout'  // Fault Case #3
 'teacherFault_connection_timeout'  // Fault Case #3
 'learnerFault_excessive_disconnects'  // Fault Case #4
 'teacherFault_excessive_disconnects'; // Fault Case #4
*/

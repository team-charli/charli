// connectionManager.ts
import { Hono } from 'hono';
import { WebhookEvents, WebhookData, User, Message } from './types';
import { DurableObject } from 'cloudflare:workers';
import { DOEnv, Env } from './env';

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
   *
   *   // roomId: string;
   * }
   */

  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: DOEnv) {
    super(state, env);
    this.state = state;

    this.app.post('/handlePeer', async (c) => {
      const { peerId, role, joinedAt, roomId, teacherData, learnerData } = await c.req.json();
      this.roomId = roomId;

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

      // Store join timestamp for fault detection
      const joinTimes = (await this.state.storage.get<Record<string, number>>('joinTimes')) || {};
      joinTimes[role] = joinedAt;
      await this.state.storage.put('joinTimes', joinTimes);

      if (await this.areBothJoined()) {
        await this.broadcastBothJoined();
      }

      // Broadcast userJoined message
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
      return c.text('OK');
    });

    this.app.post('/handlePeerLeft', async (c) => {
      const { peerId, leftAt, role } = await c.req.json();
      console.log('[ConnectionManager:handlePeerLeft] peerId=', peerId, 'role=', role, 'leftAt=', leftAt);

      if (!role) { console.warn({ component: "ConnectionManager", method: "handlePeerLeft", roomId: this.roomId, message: "Unknown peer role in peerLeft event", peerId });
        return c.text('Unknown peer', 400);
      }

      // Get participants map
      const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
      delete participants[peerId];
      await this.state.storage.put('participants', participants);


      // Broadcast userLeft message
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
      return c.json({ bothJoined });
    });

    this.app.post('/timerFault', async (c) => {
      const { faultType, data } = await c.req.json<{ faultType: 'noJoin'; data: any }>();
      await this.handleSessionTimerFault(faultType, data);
      return c.text('OK');
    });

    this.app.post('/cleanupConnectionManager', async (c) => {
      const allEntries = await this.state.storage.list();
      for (const key of allEntries.keys()) {
        if (key === 'finalized') continue;
        await this.state.storage.delete(key);
      }
      return c.text('Cleanup done (preserved "finalized")');
    });
  }

  async fetch(request: Request): Promise<Response> {
    const isFinalized = await this.state.storage.get<boolean>('finalized');
    if (isFinalized) {
      return new Response("ConnectionManager is finalized. No further requests accepted.", {
        status: 200
      });
    }
    return this.app.fetch(request, this.env);
  }

  private async incrementDisconnectCount(role: 'teacher' | 'learner'): Promise<number> {
    const key = `${role}_disconnectCount`;
    const current = (await this.state.storage.get<number>(key)) || 0;
    const count = current + 1;
    await this.state.storage.put(key, count);
    return count;
  }

  //private async getParticipantRole(peerId: string): Promise<'teacher' | 'learner' | null> {
  //  const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
  //  const role = participants[peerId] as 'teacher' | 'learner' || null;
  //  return role;
  //}

  async handleWebhookEvent(event: WebhookData) {

    if (event.event === 'peer:joined') {
      const { id: peerId, role, metadata, teacherData, learnerData} = event.payload[0].data;

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

      await this.handleReconnectionEvent(peerId);

    } else if (event.event === 'peer:left') {
      const { id: peerId, leftAt, role, teacherData, learnerData } = event.payload['peer:left'][0];

      await this.handleDisconnectionEvent(peerId, role, leftAt);
    }
  }

  private async handleReconnectionEvent(peerId: string) {
    const alarmData = await this.state.storage.get<{alarmTime: number, role: 'teacher'|'learner'}>(`alarm:${peerId}`);
    if (alarmData) {
      await this.state.storage.delete(`alarm:${peerId}`);
      await this.state.storage.deleteAlarm();
    } else {
    }
  }

  private async areBothJoined(): Promise<boolean> {
    const joinTimes = await this.state.storage.get<Record<string, number>>('joinTimes');
    const bothJoined = !!(joinTimes?.['teacher'] && joinTimes?.['learner']);
    return bothJoined;
  }

  private async broadcastBothJoined(): Promise<void> {
    const messageRelay = this.env.MESSAGE_RELAY.get(this.env.MESSAGE_RELAY.idFromName(this.roomId));
    await messageRelay.fetch('http://message-relay/broadcast/' + this.roomId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'bothJoined', data: { timestamp: Date.now() } })
    });
  }


  // Fault Cases #3 and #4: Disconnection handling
  private async handleDisconnectionEvent(peerId: string, role: 'teacher' | 'learner', leftAt: number) {
    if (!this.roomId) this.roomId = await this.state.storage.get('roomId')

    // Fault Case #4: Track disconnect count
    const disconnectCount = await this.incrementDisconnectCount(role);

    if (disconnectCount > this.MAX_DISCONNECTIONS) {
      const faultedRole = role;

      const sessionManager = this.env.SESSION_MANAGER.get(this.env.SESSION_MANAGER.idFromName(this.roomId));

      await this.state.storage.put('finalized', true);

      await sessionManager.fetch('http://session-manager/finalizeSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: 'fault',
          faultType: `${faultedRole}_excessive_disconnects`,
          faultedRole,
          roomId: this.roomId,
        })
      });

      return;
    }

    // Fault Case #3: Set reconnection window alarm
    const alarmTime = leftAt + 180000; // 3 minutes
    //console.log("ConnectionManager: Setting reconnection alarm for peerId=", peerId, "at time=", alarmTime, new Date(alarmTime).toISOString());

    await this.state.storage.put(`alarm:${peerId}`, { alarmTime, role });
    await this.state.storage.setAlarm(alarmTime);
  }

  async handleSessionTimerFault(faultType: 'noJoin' | 'sessionExpired', data: any) {
    //console.log("ConnectionManager: handleSessionTimerFault called", { roomId: this.roomId, faultType, data });

    if (faultType === 'noJoin') {
      // Fault Case #2: Second user never joined
      const faultedRole = data.role;
      const sessionManager = this.env.SESSION_MANAGER.get(
        this.env.SESSION_MANAGER.idFromName(this.roomId)
      );

      //const allData = await this.state.storage.list();
      //console.log("ConnectionManager: Storage dump before finalizeSession:", Object.fromEntries(allData));

      await this.state.storage.put('finalized', true);

      await sessionManager.fetch('http://session-manager/finalizeSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: 'fault',
          faultType: `${faultedRole}_never_joined`,
          faultedRole,
          roomId: this.roomId
        })
      });
    }
  }

  async alarm() {

    const currentTime = Date.now();
    const alarmEntries = await this.state.storage.list<{ alarmTime: number; role: 'teacher' | 'learner' }>({
      prefix: 'alarm:'
    });
    //console.log("ConnectionManager: alarm triggered at", currentTime, "for roomId=", this.roomId);
    //console.log("ConnectionManager: alarmEntries:", Object.fromEntries(alarmEntries));

    for (const [name, alarmData] of alarmEntries) {
      if (alarmData && currentTime >= alarmData.alarmTime) {

        const faultedRole = alarmData.role;
        const sessionManager = this.env.SESSION_MANAGER.get(
          this.env.SESSION_MANAGER.idFromName(this.roomId)
        );

        await this.state.storage.put('finalized', true);

        await sessionManager.fetch('http://session-manager/finalizeSession', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario: 'fault',
            faultType: `${faultedRole}_failed_to_reconnect`,
            faultedRole,
            roomId: this.roomId
          })
        });
      }
    }
  }
}

/*
 'learner_didnt_join'      // Fault Case #1
 'teacher_didnt_join'      // Fault Case #1
 'learnerFault_connection_timeout'  // Fault Case #2
 'teacherFault_connection_timeout'  // Fault Case #2
 'learnerFault_excessive_disconnects'  // Fault Case #3
 'teacherFault_excessive_disconnects'; // Fault Case #3
*/

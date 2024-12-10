// connectionManager.ts
import { Hono } from 'hono';
import { WebhookEvents, WebhookData, User, Message } from './types';
import { DurableObject } from 'cloudflare:workers';
import { DOEnv, Env } from './env';

export class ConnectionManager extends DurableObject<DOEnv> {
  private disconnectionAlarms: Map<string, number> = new Map();
  private readonly MAX_DISCONNECTIONS = 3;
  private roomId: string;
  private app = new Hono<Env>();
  /**
   * Storage Schema:
   * {
   *   // Maps peer IDs to their validated roles
   *   'participants': Record<string, 'teacher' | 'learner'>,
   *
   *   // Tracks disconnect counts for fault detection
   *   'teacher_disconnectCount': number,
   *   'learner_disconnectCount': number,
   *
   *   // Join timestamps for sequencing checks
   *   'joinTimes': Record<'teacher' | 'learner', number>
   * }
   */

  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: DOEnv) {
    super(state, env);
    this.state = state;

    // New peer joined endpoint - replaces peer:joined webhook handling
    this.app.post('/handlePeer', async (c) => {

      const { peerId, role, joinedAt, roomId } = await c.req.json();
      this.roomId = roomId;
      console.log('ConnectionManager received handlePeer:', {peerId,role, joinedAt, roomId} );
      const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
      if (participants[peerId]) throw new Error(`Peer ${peerId} already has an assigned role`);
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
      const messageRelay = this.env.MESSAGE_RELAY.get( this.env.MESSAGE_RELAY.idFromName(this.roomId));

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
      await this.checkJoinSequence();
    });

    // New peer left endpoint
    this.app.post('/handlePeerLeft', async (c) => {
      const { peerId, leftAt, role} = await c.req.json();
      console.log('handlePeerLeft request:', { peerId, leftAt, role });

      if (!role) return c.text('Unknown peer', 400);

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
      await this.handleDisconnectionEvent(peerId, leftAt);
      return c.text('OK');
    });

    // Keep existing timer integration endpoints
    this.app.get('/checkBothJoined', async (c) => {
      const bothJoined = await this.areBothJoined();
      return c.json({ bothJoined });
    });

    // Keep existing timer fault handling
    this.app.post('/timerFault', async (c) => {
      const { faultType, data } = await c.req.json<{ faultType: 'noJoin'; data: any }>();
      await this.handleSessionTimerFault(faultType, data);
      return c.text('OK');
    });
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request, this.env);
  }
  // FAULT CASES:
  // 1. Second user doesn't join within 3 minutes of first user
  // 2. Second user never joins (new case)
  // 3. User disconnects and doesn't reconnect within 3 minutes
  // 4. User disconnects more than 3 times


  private async incrementDisconnectCount(role: 'teacher' | 'learner'): Promise<number> {
    const key = `${role}_disconnectCount`;
    const count = ((await this.state.storage.get<number>(key)) || 0) + 1;
    await this.state.storage.put(key, count);
    return count;
  }

  private async getParticipantRole(peerId: string): Promise<'teacher' | 'learner' | null> {
    const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
    return participants[peerId] as 'teacher' | 'learner' || null;
  }

  async handleWebhookEvent(event: WebhookData) {
    if (event.event === 'peer:joined') {
      const { id: peerId, joinedAt, role, metadata } = event.payload[0].data;  // Note the [0].data access

      let parsedMetadata: any;
      if (metadata) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (e) {
          throw new Error(`Invalid metadata format for peer ${peerId}`);
        }
      }

      // Store verified peer-role mapping
      const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
      if (participants[peerId]) {
        throw new Error(`Peer ${peerId} already has an assigned role`);
      }
      participants[peerId] = role;
      await this.state.storage.put('participants', participants);

      await this.checkJoinSequence();
      await this.handleReconnectionEvent(peerId);

    } else if (event.event === 'peer:left') {
      const { id: peerId, leftAt } = event.payload as WebhookEvents['peer:left'][0];
      await this.handleDisconnectionEvent(peerId, leftAt);
    }
  }

  private async handleReconnectionEvent(peerId: string) {
    const alarmId = `${peerId}_reconnect`;
    if (this.disconnectionAlarms.has(alarmId)) {
      await this.state.storage.deleteAlarm();
      this.disconnectionAlarms.delete(alarmId);
    }
  }

  private async areBothJoined(): Promise<boolean> {
    const joinTimes = await this.state.storage.get<Record<string, number>>('joinTimes');
    return !!(joinTimes?.['teacher'] && joinTimes?.['learner']);
  }

  private async broadcastBothJoined(): Promise<void> {
    const messageRelay = this.env.MESSAGE_RELAY.get( this.env.MESSAGE_RELAY.idFromName(this.roomId));
    await messageRelay.fetch('http://message-relay/broadcast/' + this.roomId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'bothJoined', data: { timestamp: Date.now() } })
    });
  }

  // Fault Case #1: Late join detection
  private async checkJoinSequence() {
    const teacherData = await this.state.storage.get('user:teacher') as User;
    const learnerData = await this.state.storage.get('user:learner') as User;

    if ((teacherData?.joinedAt || learnerData?.joinedAt) &&
      !(teacherData?.joinedAt && learnerData?.joinedAt)) {
      const firstJoinTime = teacherData?.joinedAt || learnerData?.joinedAt;
      const timeSinceFirstJoin = Date.now() - firstJoinTime;

      if (timeSinceFirstJoin > 180000) { // 3 minutes
        const faultedRole = teacherData ? 'learner' : 'teacher';
        await this.broadcastFault(
          `${faultedRole}Fault_didnt_join`,
          faultedRole,
          `${faultedRole} failed to join within 3 minutes`
        );
      }
    }
  }

  // Fault Cases #3 and #4: Disconnection handling
  private async handleDisconnectionEvent(peerId: string, leftAt: number) {
    const role = await this.getParticipantRole(peerId);

    // Fault Case #4: Track disconnect count
    const disconnectCount = await this.incrementDisconnectCount(role);
    if (disconnectCount > this.MAX_DISCONNECTIONS) {
      await this.broadcastFault(
        `${role}Fault_excessive_disconnects` as FaultType,
        role,
        `${role} exceeded maximum disconnections`
      );
      return;
    }

    // Fault Case #3: Set reconnection window alarm
    const alarmTime = leftAt + 180000; // 3 minutes
    await this.state.storage.setAlarm(alarmTime);
    this.disconnectionAlarms.set(`${peerId}_reconnect`, alarmTime);
  }


  // Handle SessionTimer notifications for Fault Cases #2
  async handleSessionTimerFault(faultType: 'noJoin' | 'sessionExpired', data: any) {
    if (faultType === 'noJoin') {
      // Fault Case #2: Second user never joined
      await this.broadcastFault(
        'secondUser_never_joined',
        data.role,
        'Second user never joined the session'
      );
    }
  }

  async alarm() {
    // Handle Fault Case #3: Reconnection timeout
    const currentTime = Date.now();
    for (const [alarmId, alarmTime] of this.disconnectionAlarms) {
      if (currentTime >= alarmTime) {
        const [peerId] = alarmId.split('_');
        const role = await this.getParticipantRole(peerId);
        await this.broadcastFault(
          `${role}Fault_connection_timeout` as FaultType,
          role,
          `${role} failed to reconnect within 3 minutes`
        );
      }
    }
  }

  private async broadcastFault(faultType: FaultType, role: 'teacher' | 'learner', message: string) {
    const faultMessage: Message = {
      type: 'fault',
      data: {
        faultType,
        timestamp: Date.now(),
        message,
      }
    };

    // Get MessageRelay DO instance for this room
    const messageRelay = this.env.MESSAGE_RELAY.get(
      this.env.MESSAGE_RELAY.idFromName(this.roomId)
    );

    await messageRelay.fetch('http://message-relay/broadcast/' + this.roomId, {
      method: 'POST',
      body: JSON.stringify(faultMessage),
      headers: { 'Content-Type': 'application/json' }
    });
  }
}



type FaultType =
| 'learnerFault_didnt_join'      // Fault Case #1
| 'teacherFault_didnt_join'      // Fault Case #1
| 'secondUser_never_joined'      // Fault Case #2
| 'learnerFault_connection_timeout'  // Fault Case #3
| 'teacherFault_connection_timeout'  // Fault Case #3
| 'learnerFault_excessive_disconnects'  // Fault Case #4
| 'teacherFault_excessive_disconnects'  // Fault Case #4

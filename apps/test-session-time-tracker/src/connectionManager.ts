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
    this.roomId = state.id.toString();

    // New peer joined endpoint - replaces peer:joined webhook handling
    this.app.post('/handlePeer', async (c) => {
      const { peerId, role, joinedAt } = await c.req.json();

      // Store minimal connection data
      const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
      if (participants[peerId]) {
        throw new Error(`Peer ${peerId} already has an assigned role`);
      }
      participants[peerId] = role;
      await this.state.storage.put('participants', participants);

      // Store join timestamp for fault detection
      const joinTimes = (await this.state.storage.get<Record<string, number>>('joinTimes')) || {};
      joinTimes[role] = joinedAt;
      await this.state.storage.put('joinTimes', joinTimes);

      // Handle existing fault logic
      await this.handleReconnectionEvent(peerId);
      await this.checkJoinSequence();
    });

    // New peer left endpoint - replaces peer:left webhook handling
    this.app.post('/handlePeerLeft', async (c) => {
      const { peerId, role, leftAt } = await c.req.json();
      await this.handleDisconnectionEvent(peerId, leftAt);
    });

    // Keep existing timer integration endpoints
    this.app.get('/checkBothJoined', async (c) => {
      const joinTimes = await this.state.storage.get<Record<string, number>>('joinTimes');
      return c.json({
        bothJoined: !!(joinTimes?.['teacher'] && joinTimes?.['learner'])
      });
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


  private async storeUserState(user: Partial<User>) {
    const existingUser = await this.state.storage.get(`user:${user.role}`) as User;
    await this.state.storage.put(`user:${user.role}`, {
      ...existingUser,
      ...user
    });
  }

  private async incrementDisconnectCount(role: 'teacher' | 'learner'): Promise<number> {
    const key = `${role}_disconnectCount`;
    const count = ((await this.state.storage.get<number>(key)) || 0) + 1;
    await this.state.storage.put(key, count);
    return count;
  }

  private async updateUserState(peerId: string, leftAt: number) {
    const role = await this.getParticipantRole(peerId);
    if (role) {
      await this.storeUserState({
        role,
        leftAt
      });
    }
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

      // Validate and verify peer
      const verifiedRole = await this.validateAndVerifyPeer( peerId, parsedMetadata.role, parsedMetadata.hashedAddress);

      // Store verified peer-role mapping
      const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
      if (participants[peerId]) {
        throw new Error(`Peer ${peerId} already has an assigned role`);
      }
      participants[peerId] = verifiedRole;
      await this.state.storage.put('participants', participants);

      // Update user state
      await this.storeUserState({
        role: verifiedRole,
        peerId,
        joinedAt,
      });

      await this.checkJoinSequence();
      await this.handleReconnectionEvent(peerId);

    } else if (event.event === 'peer:left') {
      const { id: peerId, leftAt } = event.payload as WebhookEvents['peer:left'][0];
      await this.handleDisconnectionEvent(peerId, leftAt);
      await this.updateUserState(peerId, leftAt);
    }
  }

  private async validateAndVerifyPeer(
    peerId: string,
    role: string,
    hashedAddress: string
  ): Promise<'teacher' | 'learner'> {
    // Get stored user data
    const teacherData = await this.state.storage.get('user:teacher') as User;
    const learnerData = await this.state.storage.get('user:learner') as User;

    // Verify role matches stored hash
    if (role === 'teacher' && hashedAddress === teacherData?.hashedTeacherAddress) {
      return 'teacher';
    } else if (role === 'learner' && hashedAddress === learnerData?.hashedLearnerAddress) {
      return 'learner';
    }

    throw new Error(`Role verification failed for peer ${peerId}`);
  }

  private async handleReconnectionEvent(peerId: string) {
    const alarmId = `${peerId}_reconnect`;
    if (this.disconnectionAlarms.has(alarmId)) {
      await this.state.storage.deleteAlarm();
      this.disconnectionAlarms.delete(alarmId);
    }
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

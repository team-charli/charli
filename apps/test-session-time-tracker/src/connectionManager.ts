// connectionManager.ts
import { Hono } from 'hono';
import { WebhookEvents, WebhookData } from './types';
import { DurableObject } from 'cloudflare:workers';
import { DOEnv, Env } from './env';

export class ConnectionManager extends DurableObject<DOEnv> {
  private disconnectionAlarms: Map<string, number> = new Map();
  private readonly MAX_DISCONNECTIONS = 3;
  private roomId: string;
  private app = new Hono<Env>();
  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: DOEnv) {
    super(state, env);
    this.state = state;
    this.roomId = state.id.toString();

    this.app.post('/handleWebhook', async (c) => {
      const { event } = await c.req.json<{ event: WebhookData }>();
      await this.handleWebhookEvent(event);
      return c.text('OK');
    });


    // Check if both users have joined (for SessionTimer)
    this.app.get('/checkBothJoined', async (c) => {
      const teacherData = await this.state.storage.get('user:teacher') as User;
      const learnerData = await this.state.storage.get('user:learner') as User;
      return c.json({
        bothJoined: !!(teacherData?.joinedAt && learnerData?.joinedAt)
      });
    });

    // Handle timer faults
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


  private async storeParticipantRole(peerId: string, role: 'teacher' | 'learner') {
    const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
    participants[peerId] = role;
    await this.state.storage.put('participants', participants);
  }

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
      const { id: peerId, joinedAt, metadata } = event.payload as WebhookEvents['peer:joined'][0];

      // Validate and verify metadata
      const verifiedPeer = await this.validateAndVerifyPeerMetadata(peerId, metadata);

      // Store verified peer-role mapping once
      const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
      if (participants[peerId]) {
        throw new Error(`Peer ${peerId} already has an assigned role`);
      }
      participants[peerId] = verifiedPeer.role;
      await this.state.storage.put('participants', participants);

      // Update user state with peerId and joinedAt
      await this.storeUserState({
        role: verifiedPeer.role,
        peerId,
        joinedAt,
      });

      // Proceed with existing fault detection logic
      await this.checkJoinSequence();
      await this.handleReconnectionEvent(peerId);

    } else if (event.event === 'peer:left') {
      // Existing peer:left logic remains unchanged
      const { id: peerId, leftAt } = event.payload as WebhookEvents['peer:left'][0];
      await this.handleDisconnectionEvent(peerId, leftAt);
      await this.updateUserState(peerId, leftAt);
    }
  }

  private async validateAndVerifyPeerMetadata(
    peerId: string,
    metadata: string | undefined
  ): Promise<{ role: 'teacher' | 'learner', peerId: string, hashedAddress: string }> {
    // Validate metadata exists
    if (!metadata) {
      throw new Error('Missing metadata in peer:joined webhook');
    }

    // Parse metadata
    let parsedMetadata: { role: 'teacher' | 'learner', hashedAddress: string };
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (e) {
      throw new Error('Failed to parse metadata in peer:joined webhook');
    }

    // Validate required fields
    if (!parsedMetadata.role || !parsedMetadata.hashedAddress) {
      throw new Error('Metadata missing required fields: role and hashedAddress');
    }

    // Verify role matches stored hash
    const teacherData = await this.state.storage.get('user:teacher') as User;
    const learnerData = await this.state.storage.get('user:learner') as User;

    let verifiedRole: 'teacher' | 'learner' | null = null;
    if (parsedMetadata.role === 'teacher' &&
      parsedMetadata.hashedAddress === teacherData?.hashedTeacherAddress) {
      verifiedRole = 'teacher';
    } else if (parsedMetadata.role === 'learner' &&
      parsedMetadata.hashedAddress === learnerData?.hashedLearnerAddress) {
      verifiedRole = 'learner';
    } else {
      throw new Error(`Role verification failed for peer ${peerId}`);
    }

    return {
      role: verifiedRole,
      peerId,
      hashedAddress: parsedMetadata.hashedAddress
    };
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
        role
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

interface User {
  role: 'teacher' | 'learner';
  peerId?: string;
  joinedAt?: number;
  leftAt?: number;
}

interface Message {
  type: 'fault';
  data: {
    faultType: FaultType;
    timestamp: number;
    message: string;
    role: 'teacher' | 'learner';
  };
}


type FaultType =
| 'learnerFault_didnt_join'      // Fault Case #1
| 'teacherFault_didnt_join'      // Fault Case #1
| 'secondUser_never_joined'      // Fault Case #2
| 'learnerFault_connection_timeout'  // Fault Case #3
| 'teacherFault_connection_timeout'  // Fault Case #3
| 'learnerFault_excessive_disconnects'  // Fault Case #4
| 'teacherFault_excessive_disconnects'  // Fault Case #4

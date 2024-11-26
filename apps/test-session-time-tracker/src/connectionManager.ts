// connectionManager.ts

import { Hono } from 'hono';
import { WebhookEvents, WebhookData, Env } from './types';
import { DurableObject } from 'cloudflare:workers';

type AppEnv = {
  Bindings: Env
  Variables: {
    state: DurableObjectState
    role?: 'teacher' | 'learner'
    alarm?: number
  }
}

export class ConnectionManager extends DurableObject<Env> {
  private disconnectionAlarms: Map<string, number> = new Map();
  private readonly MAX_DISCONNECTIONS = 3;
  private roomId: string;
  private app = new Hono<AppEnv>();
  protected state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.roomId = state.id.toString();
    // Handle webhook events
    this.app.post('/handleWebhook', async (c) => {
      const { event } = await c.req.json<{ event: WebhookData }>();
      await this.handleAllFaultTypes(event);
      return c.text('OK');
    });

    // Handle participant role updates
    this.app.post('/updateParticipantRole', async (c) => {
      const { peerId, role } = await c.req.json<{ peerId: string; role: 'teacher' | 'learner' }>();
      await this.storeParticipantRole(peerId, role);
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

  async handleAllFaultTypes(event: WebhookData) {
    if (event.event === 'peer:joined') {
      const { id: peerId, joinedAt } = event.payload as WebhookEvents['peer:joined'][0];
      const role = await this.getParticipantRole(peerId);

      await this.storeUserState({
        role,
        peerId,
        joinedAt,
      });

      // Handles Fault Case #1: Late join detection
      await this.checkJoinSequence();

      // Handles part of Fault Case #3: Reconnection tracking
      await this.handleReconnectionEvent(peerId);

    } else if (event.event === 'peer:left') {
      const { id: peerId, leftAt } = event.payload as WebhookEvents['peer:left'][0];

      // Handles Fault Cases #3 and #4: Disconnection tracking
      await this.handleDisconnectionEvent(peerId, leftAt);

      await this.updateUserState(peerId, leftAt);
    }
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

    await this.env.WORKER.fetch(`http://worker/broadcast/${this.roomId}`, {
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

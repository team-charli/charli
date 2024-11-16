// connectionManager.ts

import { DurableObjectState } from '@cloudflare/workers-types';
import { WebhookEvents, WebhookData } from './types';

export class ConnectionManager {
  private disconnectionAlarms: Map<string, number> = new Map();
  private readonly MAX_DISCONNECTIONS = 3; // Maximum allowed disconnections

  constructor(public state: DurableObjectState, public env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/handleWebhook' && request.method === 'POST') {
      const { event } = (await request.json()) as { event: WebhookData };
      await this.handleWebhook(event);
      return new Response('OK');
    } else if (url.pathname === '/updateParticipantRole' && request.method === 'POST') {
      const { peerId, role } = (await request.json()) as { peerId: string; role: 'teacher' | 'learner' };
      await this.storeParticipantRole(peerId, role);
      return new Response('OK');
    } else {
      return new Response('Not found', { status: 404 });
    }
  }

  private async storeParticipantRole(peerId: string, role: 'teacher' | 'learner') {
    const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
    participants[peerId] = role;
    await this.state.storage.put('participants', participants);
  }

  private async handleWebhook(event: WebhookData) {
    if (event.event === 'peer:joined') {
      const { id: peerId, roomId } = event.payload as WebhookEvents['peer:joined'][0];
      await this.handleReconnectionEvent(peerId, roomId);
    } else if (event.event === 'peer:left') {
      const { id: peerId, roomId, leftAt } = event.payload as WebhookEvents['peer:left'][0];
      await this.handleDisconnectionEvent(peerId, roomId, leftAt);
    }
  }

  private async handleDisconnectionEvent(peerId: string, roomId: string, leftAt: number) {
    console.log(`[CM-DISCONNECT] User disconnected: ${peerId}, Room ID: ${roomId}`);

    const participantRole = await this.getParticipantRole(peerId);
    if (!participantRole) {
      console.error(`Participant role not found for peerId: ${peerId}`);
      return;
    }

    // Increment disconnection count
    const disconnectCountKey = `${roomId}_${participantRole}_disconnectCount`;
    const disconnectCount = ((await this.state.storage.get<number>(disconnectCountKey)) || 0) + 1;
    await this.state.storage.put(disconnectCountKey, disconnectCount);

    console.log(`[CM-DISCONNECT] ${participantRole} has disconnected ${disconnectCount} time(s).`);

    // Check if disconnection count exceeds the maximum allowed
    if (disconnectCount > this.MAX_DISCONNECTIONS) {
      console.log(`[CM-DISCONNECT] ${participantRole} exceeded maximum disconnections.`);
      await this.handleExcessiveDisconnections(roomId, participantRole);
      return; // Do not set a disconnection alarm
    }

    const disconnectTime = leftAt;
    await this.state.storage.put(`${roomId}_${participantRole}DisconnectTime`, disconnectTime);

    // Set disconnection alarm
    const alarmId = `${roomId}_${participantRole}`;
    const alarmTime = disconnectTime + 3 * 60 * 1000; // 3 minutes
    await this.state.storage.setAlarm(alarmTime);
    this.disconnectionAlarms.set(alarmId, alarmTime);
    console.log(`[CM-DISCONNECT] Setting alarm for ${participantRole} at ${new Date(alarmTime).toISOString()}`);
  }

  private async handleReconnectionEvent(peerId: string, roomId: string) {
    console.log(`[CM-RECONNECT] User reconnected: ${peerId}, Room ID: ${roomId}`);

    const participantRole = await this.getParticipantRole(peerId);
    if (!participantRole) {
      console.error(`Participant role not found for peerId: ${peerId}`);
      return;
    }

    const alarmId = `${roomId}_${participantRole}`;
    if (this.disconnectionAlarms.has(alarmId)) {
      await this.state.storage.deleteAlarm();
      this.disconnectionAlarms.delete(alarmId);
      console.log(`[CM-RECONNECT] Cancelled alarm for ${participantRole}`);
    }
  }

  async alarm() {
    // Retrieve the alarm ID from storage
    const alarms = await this.state.storage.list<number>({ prefix: '' });
    for (const [alarmId, alarmTime] of alarms.entries()) {
      const [roomId, participantRole] = alarmId.split('_');
      const currentTime = Date.now();

      if (currentTime >= alarmTime) {
        await this.handleDisconnectionTimeout(roomId, participantRole as 'teacher' | 'learner');
        // Remove the alarm
        await this.state.storage.delete(alarmId);
        this.disconnectionAlarms.delete(alarmId);
      }
    }
  }

  private async handleDisconnectionTimeout(roomId: string, participantRole: 'teacher' | 'learner') {
    const faultType: FaultType = participantRole === 'teacher'
      ? 'teacherFault_connection_timeout'
      : 'learnerFault_connection_timeout';

    const faultTime = Date.now();
    const faultMessage = `User ${participantRole} did not reconnect within the allowed time.`;

    const message: Message = {
      type: 'fault',
      data: {
        faultType,
        timestamp: faultTime,
        message: faultMessage,
      },
    };

    // Forward the fault message to WebSocketManager for broadcasting
    await this.forwardMessageToWebSocketManager(roomId, message);

    console.log(`[CM-ALARM] Disconnection timeout handled for ${participantRole}, Room ID: ${roomId}`);
  }

  private async handleExcessiveDisconnections(roomId: string, participantRole: 'teacher' | 'learner') {
    const faultType: FaultType = participantRole === 'teacher'
      ? 'teacherFault_excessive_disconnects'
      : 'learnerFault_excessive_disconnects';

    const faultTime = Date.now();
    const faultMessage = `User ${participantRole} exceeded the maximum number of disconnections.`;

    const message: Message = {
      type: 'fault',
      data: {
        faultType,
        timestamp: faultTime,
        message: faultMessage,
      },
    };

    // Forward the fault message to WebSocketManager for broadcasting
    await this.forwardMessageToWebSocketManager(roomId, message);

    console.log(`[CM-FAULT] Excessive disconnections handled for ${participantRole}, Room ID: ${roomId}`);
  }

  private async forwardMessageToWebSocketManager(roomId: string, message: Message) {
    const webSocketManagerId = this.env.WEBSOCKET_MANAGER.idFromName(roomId);
    const webSocketManagerStub = this.env.WEBSOCKET_MANAGER.get(webSocketManagerId);

    await webSocketManagerStub.fetch('http://websocket-manager/connectionEvent', {
      method: 'POST',
      body: JSON.stringify(message),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getParticipantRole(peerId: string): Promise<'teacher' | 'learner' | null> {
    // Retrieve participant role based on peerId
    const participants = (await this.state.storage.get<Record<string, string>>('participants')) || {};
    return participants[peerId] as 'teacher' | 'learner' || null;
  }
}

interface Env {
  WEBSOCKET_MANAGER: DurableObjectNamespace;
  PRIVATE_KEY_SESSION_TIME_SIGNER: string;
}

type FaultType =
  | 'learnerFault_connection_timeout'
  | 'teacherFault_connection_timeout'
  | 'learnerFault_excessive_disconnects'
  | 'teacherFault_excessive_disconnects';

interface Message {
  type: 'fault';
  data: {
    faultType: FaultType;
    timestamp: number;
    message: string;
  };
}

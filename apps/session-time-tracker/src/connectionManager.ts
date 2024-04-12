import ethers from 'ethers';

export class ConnectionManager {
  private connectedClients: Map<string, WebSocket> = new Map();
  private disconnectionAlarms: Map<string, string> = new Map();

  constructor(public state: DurableObjectState, public env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const sessionId = request.headers.get('Session-ID');
    if (!sessionId) {
      return new Response('Session ID missing in request headers', { status: 400 });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();
      this.state.acceptWebSocket(server);
      server.addEventListener('message', event => this.handleMessage(server, event));
      server.addEventListener('close', () => {
        const participantRole = this.getParticipantRole(server);
        if (participantRole) {
          this.handleDisconnect(participantRole, sessionId);
        }
      });
      return new Response(null, { status: 101, webSocket: client });
    } else if (request.method === 'POST' && request.url === 'http://connection-manager/signature') {
      const { participantRole, signature, sessionId } = await request.json() as any;
      await this.handleSignature(participantRole, signature, sessionId);
      return new Response('OK');
    }

    return new Response('Not found', { status: 404 });
  }

  async alarm(alarmId: string) {
    const [sessionId, participantRole] = alarmId.split('_');
    const counterpartyRole = participantRole === 'teacher' ? 'learner' : 'teacher';

    const counterpartyConnected = this.connectedClients.has(`${sessionId}_${counterpartyRole}`);
    if (counterpartyConnected) {
      const message = `User ${participantRole} dropped connection and did not reconnect within 3 minutes.`;
      const signature = await this.signMessage(message);
      await this.broadcastMessage({ type: 'disconnectionTimeout', message }, { participantRole, signature }, sessionId);
    } else {
      const teacherDisconnectTime = await this.state.storage.get(`${sessionId}_teacherDisconnectTime`);
      const learnerDisconnectTime = await this.state.storage.get(`${sessionId}_learnerDisconnectTime`);
      const message = `Both users disconnected. Teacher disconnect time: ${new Date(teacherDisconnectTime as number).toISOString()}, Learner disconnect time: ${new Date(learnerDisconnectTime as number).toISOString()}`;
      const signature = await this.signMessage(message);
      // Send signed message to the database
      // ...
    }

    await this.state.storage.delete(`${sessionId}_${participantRole}DisconnectTime`);
    await this.state.storage.delete(`${sessionId}_${participantRole}DisconnectCount`);
    this.disconnectionAlarms.delete(alarmId);
  }

  private async handleSignature(participantRole: string, signature: string, sessionId: string) {
    // Forward the signature to SessionState for verification
    const sessionStateId = this.env.SESSION_STATE.idFromName(sessionId);
    const sessionStateStub = this.env.SESSION_STATE.get(sessionStateId);
    await sessionStateStub.fetch('http://session-state/signature', {
      method: 'POST',
      body: JSON.stringify({ participantRole, signature }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleMessage(webSocket: WebSocket, event: MessageEvent): Promise<void> {
    const message = JSON.parse(event.data as string);
    if (message.type === 'connect') {
      const { ethereumAddress, sessionId } = message;
      const hashedAddress = ethers.keccak256(ethereumAddress);

      const hashedTeacherAddress = await this.state.storage.get(`${sessionId}_hashedTeacherAddress`);
      const hashedLearnerAddress = await this.state.storage.get(`${sessionId}_hashedLearnerAddress`);

      let participantRole: string | undefined;
      if (hashedAddress === hashedTeacherAddress) {
        participantRole = 'teacher';
      } else if (hashedAddress === hashedLearnerAddress) {
        participantRole = 'learner';
      }

      if (participantRole) {
        this.connectedClients.set(`${sessionId}_${participantRole}`, webSocket);
        const alarmId = `${sessionId}_${participantRole}`;
        if (this.disconnectionAlarms.has(alarmId)) {
          await this.state.storage.deleteAlarm(this.disconnectionAlarms.get(alarmId));
          this.disconnectionAlarms.delete(alarmId);
        }
        if (this.connectedClients.size === 2) {
          this.broadcastMessage({ type: 'bothConnected' }, undefined, sessionId);
        } else {
          const counterpartyRole = participantRole === 'teacher' ? 'learner' : 'teacher';
          if (this.connectedClients.has(`${sessionId}_${counterpartyRole}`)) {
            this.broadcastMessage({ type: 'counterpartyConnected', message: `User ${participantRole} connected` }, { participantRole }, sessionId);
          }
        }
      } else {
        webSocket.send(JSON.stringify({ type: 'unauthorizedConnection' }));
        webSocket.close();
      }
    }
  }

  private async handleDisconnect(participantRole: string, sessionId: string): Promise<void> {
    this.connectedClients.delete(`${sessionId}_${participantRole}`);
    const counterpartyRole = participantRole === 'teacher' ? 'learner' : 'teacher';
    if (this.connectedClients.has(`${sessionId}_${counterpartyRole}`)) {
      this.broadcastMessage(
        { type: 'counterpartyDisconnected', message: `User ${participantRole} disconnected. Waiting for reconnection.` },
        { participantRole },
        sessionId
      );
    }

    const disconnectTime = Date.now();
    await this.state.storage.put(`${sessionId}_${participantRole}DisconnectTime`, disconnectTime);
    const disconnectCount = (await this.state.storage.get(`${sessionId}_${participantRole}DisconnectCount`) as number) || 0;
    await this.state.storage.put(`${sessionId}_${participantRole}DisconnectCount`, disconnectCount + 1);

    const alarmId = `${sessionId}_${participantRole}`;
    const alarmTime = disconnectTime + 3 * 60 * 1000; // 3 minutes
    const alarmKey = await this.state.storage.setAlarm(alarmTime);
    this.disconnectionAlarms.set(alarmId, alarmKey);
  }

  private async signMessage(message: string): Promise<string> {
    try {
      const wallet = new ethers.Wallet(this.env.PRIVATE_KEY);
      const signature = await wallet.signMessage(message);
      return signature;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to sign message');
    }
  }

  private getParticipantRole(webSocket: WebSocket): string | undefined {
    for (const [key, ws] of this.connectedClients.entries()) {
      if (ws === webSocket) {
        return key.split('_')[1];
      }
    }
    return undefined;
  }

  private async broadcastMessage(message: Object, data?: Object, sessionId?: string): Promise<void> {
    if (sessionId) {
      const webSockets = await this.state.getWebSockets();
      for (const ws of webSockets) {
        if (ws.readyState === WebSocket.READY_STATE_OPEN && (this.connectedClients.get(`${sessionId}_teacher`) === ws || this.connectedClients.get(`${sessionId}_learner`) === ws)) {
          const payload = {
            message,
            data,
          };
          ws.send(JSON.stringify(payload));
        }
      }
    }
  }
}

interface Env {
  SESSION_STATE: DurableObjectNamespace;
  PRIVATE_KEY: string;
}

import { ethers } from 'ethers';

export class TimerObject {
  private connectedClients: Map<string, WebSocket> = new Map();

  constructor(public state: DurableObjectState, public env: Env) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'POST') {
      const { duration, hashedTeacherAddress, hashedLearnerAddress, sessionId } = await request.json() as RequestPayload;
      await this.state.storage.put('duration', duration);
      await this.state.storage.put('hashedTeacherAddress', hashedTeacherAddress);
      await this.state.storage.put('hashedLearnerAddress', hashedLearnerAddress);
      await this.state.storage.put('sessionId', sessionId)
      await this.state.storage.setAlarm(Date.now() + duration);


      if (request.method === 'POST' && request.url === 'http://timer-object/broadcast') {
        const { type, message, data } = await request.json() as any;
        await this.broadcastMessage({ type, message }, data);
        return new Response('OK');
      }

      return new Response(JSON.stringify({ id: this.state.id.toString() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();
      this.state.acceptWebSocket(server);
      server.addEventListener('message', event => this.handleMessage(server, event));
      server.addEventListener('close', () => {
        const participantRole = this.getParticipantRole(server);
        if (participantRole) {
          this.handleDisconnect(participantRole);
        }
      });
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('Not found', { status: 404 });
  }

  private async handleDisconnect(participantRole: string): Promise<void> {
    this.connectedClients.delete(participantRole);
    this.broadcastMessage({ type: 'droppedConnection', message: `User ${participantRole} dropped connection. Waiting two minutes for reconnect.` }, { participantRole });

    const disconnectTime = Date.now();
    const sessionId = await this.state.storage.get('sessionId');
    const disconnectionManagerId = this.env.DISCONNECTION_MANAGER.idFromName(`disconnection_manager_${sessionId}`);
    const disconnectionManagerStub = this.env.DISCONNECTION_MANAGER.get(disconnectionManagerId);
    await disconnectionManagerStub.fetch('', {
      method: 'POST',
      body: JSON.stringify({ participantRole, disconnectTime }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleMessage(webSocket: WebSocket, event: MessageEvent): Promise<void> {
    const message = JSON.parse(event.data as string);
    if (message.type === 'connect') {
      const ethereumAddress = message.ethereumAddress;
      const hashedAddress = ethers.keccak256(ethereumAddress);

      const hashedTeacherAddress = await this.state.storage.get('hashedTeacherAddress');
      const hashedLearnerAddress = await this.state.storage.get('hashedLearnerAddress');

      let participantRole: string | undefined;
      if (hashedAddress === hashedTeacherAddress) {
        participantRole = 'teacher';
      } else if (hashedAddress === hashedLearnerAddress) {
        participantRole = 'learner';
      }

      if (participantRole) {
        this.connectedClients.set(participantRole, webSocket);
        if (this.connectedClients.size === 2) {
          this.broadcastMessage({ type: 'bothConnected' });
        }
      } else {
        webSocket.send(JSON.stringify({ type: 'unauthorizedConnection' }));
        webSocket.close();
      }
    }
  }
  private getParticipantRole(webSocket: WebSocket): string | undefined {
    for (const [participantRole, ws] of this.connectedClients.entries()) {
      if (ws === webSocket) {
        return participantRole;
      }
    }
    return undefined;
  }

  async alarm(): Promise<void> {
    const duration = await this.state.storage.get<number>('duration');
    if (typeof duration !== 'number') {
      console.error('Duration is undefined or not a number');
      return;
    }

    const now = Date.now();
    const warningTime = now + duration - 3 * 60 * 1000; // 3 minutes warning
    const expirationTime = now + duration;

    try {
      const wallet = new ethers.Wallet(this.env.PRIVATE_KEY);
      const currentTime = new Date();
      const timestampMs = String(currentTime.getTime());
      const signature = await wallet.signMessage(timestampMs);
      this.broadcastMessage({ type: 'initiated', message: 'Timer initiated' }, { timestampMs, signature });
    } catch (error) {
      console.error(error);
      throw new Error('Error signing');
    }

    if (now >= warningTime && now < expirationTime) {
      this.broadcastMessage({ type: 'warning', message: '3 minute warning' });
    } else if (now >= expirationTime) {
      try {
        const wallet = new ethers.Wallet(this.env.PRIVATE_KEY);
        const currentTime = new Date();
        const timestampMs = String(currentTime.getTime());
        const signature = await wallet.signMessage(timestampMs);
        this.broadcastMessage({ type: 'expired', message: 'Time expired' }, { timestampMs, signature });
        await this.state.storage.delete('duration');
      } catch (error) {
        console.error(error);
        throw new Error('Error signing');
      }
    }

    for (const participantRole of ['teacher', 'learner']) {
      const disconnectTime = await this.state.storage.get(`${participantRole}DisconnectTime`);

      if (disconnectTime && Date.now() - (disconnectTime as number) >= 2 * 60 * 1000) {
        let signature;
        const message = `User ${participantRole} dropped connection exceeds 2-minute timeout.`
        try {
        const wallet = new ethers.Wallet(this.env.PRIVATE_KEY);
        signature = await wallet.signMessage(message)
        }  catch (error) {
          console.error(error)
          throw new Error(`Failed to sign connectionTimeout message`)
        }
        this.broadcastMessage({ type: 'connectionTimeout', message }, { participantRole, signature });
        await this.state.storage.delete(`${participantRole}DisconnectTime`);
        await this.state.storage.delete(`${participantRole}DisconnectCount`);
      }
    }
  }

  // This method is updated to directly broadcast messages to all hibernatable WebSocket connections
  private async broadcastMessage(message: Object, data?: Object): Promise<void> {
    if (this.connectedClients.size === 2) {
      const webSockets = await this.state.getWebSockets();
      for (const ws of webSockets) {
        if (ws.readyState === WebSocket.READY_STATE_OPEN) {
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

interface DurableObjectState {
  storage: DurableObjectStorage;
  id: DurableObjectId;
  blockConcurrencyWhile: (callback: () => Promise<void>) => void;
  acceptWebSocket: (websocket: WebSocket) => void;
  getWebSockets: () => Promise<Iterable<WebSocket>>;
}
interface Env {
  PRIVATE_KEY: string;
  DISCONNECTION_MANAGER: DurableObjectNamespace;

}
interface RequestPayload { duration: number; hashedTeacherAddress: string; hashedLearnerAddress: string; sessionId: string; }

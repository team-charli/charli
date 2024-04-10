import { ethers } from 'ethers';

export class TimerObject {
  private connectedClients: Map<string, WebSocket> = new Map();

  constructor(public state: DurableObjectState, public env: Env) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'POST') {
      const { duration, hashedTeacherAddress, hashedLearnerAddress } = await request.json() as RequestPayload;
      await this.state.storage.put('duration', duration);
      await this.state.storage.put('hashedTeacherAddress', hashedTeacherAddress);
      await this.state.storage.put('hashedLearnerAddress', hashedLearnerAddress);
      await this.state.storage.setAlarm(Date.now() + duration);

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
  private async handleDisconnect(participantRole: string): Promise<void> {
    this.connectedClients.delete(participantRole);
    this.broadcastMessage({ type: 'droppedConnection', message: `User ${participantRole} dropped connection. Waiting two minutes for reconnect.` }, { participantRole });

    const disconnectTime = Date.now();
    await this.state.storage.put(`${participantRole}DisconnectTime`, disconnectTime);

    const disconnectCount = await this.state.storage.get(`${participantRole}DisconnectCount`) as number || 0;
    await this.state.storage.put(`${participantRole}DisconnectCount`, disconnectCount + 1);

    if (disconnectCount >= 3) {
      this.broadcastMessage({ type: 'thirdConnectionDrop', message: `User ${participantRole} dropped connection for the third time.` }, { participantRole });
    }

    await this.state.storage.setAlarm(disconnectTime + 2 * 60 * 1000); // Set alarm for 2 minutes
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
        this.broadcastMessage({ type: 'connectionTimeout', message: `User ${participantRole} dropped connection exceeds 2-minute timeout.` }, { participantRole });
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
interface Env {PRIVATE_KEY: string}
interface RequestPayload { duration: number; hashedTeacherAddress: string; hashedLearnerAddress: string; }

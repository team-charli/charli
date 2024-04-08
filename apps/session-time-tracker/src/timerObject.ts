import { ethers } from 'ethers';

export class TimerObject {
  private connectedClients: Set<string> = new Set();

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
      server.addEventListener('close', () => this.handleDisconnect(server));
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
        this.connectedClients.add(participantRole);
        if (this.connectedClients.size === 2) {
          this.broadcastMessage({ type: 'bothConnected' });
        }
      } else {
        webSocket.send(JSON.stringify({ type: 'unauthorizedConnection' }));
        webSocket.close();
      }
    }
  }

  private handleDisconnect(webSocket: WebSocket): void {
    // Remove the disconnected client from the set based on the associated participantRole
    // You may need to associate the participantRole with the webSocket to remove it correctly
    // this.connectedClients.delete(participantRole);
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

    this.broadcastMessage({type: 'initiated', message: 'timer initiated'})
    if (now >= warningTime && now < expirationTime) {
      this.broadcastMessage({ type: 'warning', message: '3 minute warning' });
    } else if (now >= expirationTime) {
      this.broadcastMessage({ type: 'expired', message: 'Time expired' });
      await this.state.storage.delete('duration');
    }
  }

  // This method is updated to directly broadcast messages to all hibernatable WebSocket connections
  private async broadcastMessage(message: Object): Promise<void> {
    if (this.connectedClients.size === 2) {
      const webSockets = await this.state.getWebSockets();
      for (const ws of webSockets) {
        if (ws.readyState === WebSocket.READY_STATE_OPEN) {
          ws.send(JSON.stringify(message));
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
interface Env {}
interface RequestPayload { duration: number; hashedTeacherAddress: string; hashedLearnerAddress: string; }

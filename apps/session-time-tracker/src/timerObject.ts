export class TimerObject {
  private state: DurableObjectState;
  private env: Env;
  private sessions = new Map<string, WebSocket>();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();
      this.handleWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    const { duration } = await request.json() as RequestPayload;
    await this.state.storage.put('duration', duration);
    await this.state.storage.setAlarm(Date.now() + duration);

    return new Response(JSON.stringify({ id: this.state.id.toString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async alarm(): Promise<void> {
    const duration = await this.state.storage.get<number>('duration');
    if (typeof duration !== 'number') {
      throw new Error(`Duration is undefined or not a number`)
    }

    const now = Date.now();
    const warningTime = now + duration - 3 * 60 * 1000; // 3 minutes warning
    const expirationTime = now + duration;

    if (now >= warningTime && now < expirationTime) {
      this.broadcastMessage({ type: 'warning', message: '3 minute warning' });
    } else if (now >= expirationTime) {
      this.broadcastMessage({ type: 'expired', message: 'Time expired' });
      await this.state.storage.delete('duration');
    }
  }

  private handleWebSocket(ws: WebSocket): void {
    ws.accept();
    const id = crypto.randomUUID();
    this.sessions.set(id, ws);

    ws.addEventListener('close', () => this.sessions.delete(id));
  }

  private broadcastMessage(message: Object): void {
    this.sessions.forEach((ws) => {
      if (ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}

interface DurableObjectState {
  storage: DurableObjectStorage;
  id: DurableObjectId;
  blockConcurrencyWhile: (callback: () => Promise<void>) => void;
}
interface Env {}
interface RequestPayload { duration: number; }

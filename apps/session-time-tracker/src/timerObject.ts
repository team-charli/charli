export class TimerObject {
  constructor(public state: DurableObjectState, public env: Env) {}

  async fetch(request: Request): Promise<Response> {
    // WebSocket connection handling preserved for potential direct communication (e.g., timing alerts)
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();
      this.state.acceptWebSocket(server);  // Inform the runtime this WebSocket is hibernatable
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
      console.error('Duration is undefined or not a number');
      return;
    }

    const now = Date.now();
    const warningTime = now + duration - 3 * 60 * 1000; // 3 minutes warning
    const expirationTime = now + duration;

    if (now >= warningTime && now < expirationTime) {
      // Adjusted to use the method for broadcasting to all hibernatable WebSocket connections
      this.broadcastMessage({ type: 'warning', message: '3 minute warning' });
    } else if (now >= expirationTime) {
      this.broadcastMessage({ type: 'expired', message: 'Time expired' });
      await this.state.storage.delete('duration');
    }
  }

  // This method is updated to directly broadcast messages to all hibernatable WebSocket connections
  // Adjusted to check WebSocket state before sending messages
private async broadcastMessage(message: Object): Promise<void> {
    const webSockets = await this.state.getWebSockets();
    for (const ws of webSockets) {
        if (ws.readyState === WebSocket.READY_STATE_OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
}
}


// DurableObjectState, Env, and RequestPayload interfaces remain unchanged
interface DurableObjectState {
  storage: DurableObjectStorage;
  id: DurableObjectId;
  blockConcurrencyWhile: (callback: () => Promise<void>) => void;
  acceptWebSocket: (websocket: WebSocket) => void;
  getWebSockets: () => Promise<Iterable<WebSocket>>;
}
interface Env {}
interface RequestPayload { duration: number; }

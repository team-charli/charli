import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import { Env } from "./types";

export class MessageRelay extends DurableObject {
  private connections = new Map<string, WebSocket>();
  private app = new Hono();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    // Endpoint for WebSocket connections
    this.app.get('/connect/:roomId', (c) => {
      const roomId = c.req.param('roomId');
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      server.accept();
      this.connections.set(roomId, server);

      server.addEventListener('close', () => {
        this.connections.delete(roomId);
      });

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    });

    // Endpoint for other DOs to broadcast messages
    this.app.post('/broadcast/:roomId', async (c) => {
      const roomId = c.req.param('roomId');
      const message = await c.req.json<Message>();

      const socket = this.connections.get(roomId);
      if (socket) {
        socket.send(JSON.stringify(message));
        return c.json({ status: 'ok' });
      }
      return c.json({ status: 'no_active_connection' }, 404);
    });
  }

  fetch(request: Request) {
    return this.app.fetch(request);
  }
}

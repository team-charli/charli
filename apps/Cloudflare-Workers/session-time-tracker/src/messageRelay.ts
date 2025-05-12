// messageRelay.ts
import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import { Env } from "./env";

export class MessageRelay extends DurableObject {
  // Now a Map from roomId → Set of WebSockets
  private connections = new Map<string, Set<WebSocket>>();
  private app = new Hono();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    // Endpoint for WebSocket connections
    this.app.get('/connect/:roomId', (c) => {
      const roomId = c.req.param('roomId');
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      server.accept();

      // If we don't yet have a Set of sockets for this room, create one
      if (!this.connections.has(roomId)) {
        this.connections.set(roomId, new Set<WebSocket>());
      }
      const socketSet = this.connections.get(roomId)!;
      socketSet.add(server);

      // Remove socket from set on close; if empty, remove from map
      server.addEventListener('close', () => {
        socketSet.delete(server);
        if (socketSet.size === 0) {
          this.connections.delete(roomId);
        }
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    });

    // Check if there's at least one active socket for this room
    this.app.get('/checkConnection/:roomId', (c) => {
      const roomId = c.req.param('roomId');
      const socketSet = this.connections.get(roomId);

      const hasConnection = socketSet && socketSet.size > 0;
      return c.json({ connected: hasConnection }, hasConnection ? 200 : 404);
    });

    // Broadcast a message to all active sockets in the room
    this.app.post('/broadcast/:roomId', async (c) => {
      const roomId = c.req.param('roomId');
      const message = await c.req.json<Message>();

      const socketSet = this.connections.get(roomId);
      if (!socketSet || socketSet.size === 0) {
        return c.json({ status: 'no_active_connection' }, 404);
      }

      const payload = JSON.stringify(message);
      for (const ws of socketSet) {
        // Compare ws.readyState to WebSocket.OPEN (the static property), not ws.OPEN
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
      return c.json({ status: 'ok' });
    });
  }

  fetch(request: Request) {
    return this.app.fetch(request);
  }
}

// If needed
interface Message {
  type: string;
  data: any;
}

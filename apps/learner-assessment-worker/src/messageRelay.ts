// apps/learner-assessment-worker/src/messageRelay.ts
import { DurableObject } from 'cloudflare:workers'
import { Hono } from 'hono'
import { Env } from './env'

export class MessageRelayDO extends DurableObject<Env> {
  private connectionsByRoomId = new Map<string, Set<WebSocket>>();
  private app = new Hono();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    // 1) use /connect/:roomId
    this.app.get('/connect/:roomId', (c) => {
      const roomId = c.req.param('roomId');
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      if (!this.connectionsByRoomId.has(roomId)) {
        this.connectionsByRoomId.set(roomId, new Set<WebSocket>());
      }
      this.connectionsByRoomId.get(roomId)!.add(server);

      server.addEventListener('close', () => {
        this.connectionsByRoomId.get(roomId)!.delete(server);
        if (this.connectionsByRoomId.get(roomId)!.size === 0) {
          this.connectionsByRoomId.delete(roomId);
        }
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    });

    // 2) Also fix broadcast to target a room
    this.app.post('/broadcast/:roomId', async (c) => {
      const roomId = c.req.param('roomId');
      const message = await c.req.json<Message>();
      const payload = JSON.stringify(message);

      const sockets = this.connectionsByRoomId.get(roomId);
      if (!sockets || sockets.size === 0) {
        return c.json({ status: 'no_active_connection' }, 404);
      }
      for (const ws of sockets) {
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

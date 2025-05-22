// apps/learner-assessment-worker/src/messageRelay.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono }            from 'hono';
import { Env }             from './env';

/**
 * A very small Durable-Object-based fan-out hub.
 *   GET  /connect/:roomId        -> upgrades the request to a WS
 *   POST /broadcast/:roomId      -> body is already a JSON string; we relay it
 *
 * - One DO instance per *roomId* key (because you use idFromName(roomId)).
 * - LearnerAssessmentDO, RoboTestDO or any other Worker can `fetch()` the
 *   broadcast endpoint with a JSON payload; every browser currently connected
 *   to that room will receive it.
 */
export class MessageRelayDO extends DurableObject<Env> {
	/** roomId  →  Map<clientId, WebSocket> */
	private clientsByRoom = new Map<string, Map<string, WebSocket>>();
	private app = new Hono();

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);

		/* ------------------------------------------------------------------ *
		 * 1.  /connect/:roomId   (WebSocket upgrade)
		 * ------------------------------------------------------------------ */
		this.app.get('/connect/:roomId', (c) => {
			if (c.req.header('upgrade') !== 'websocket') {
				return c.text('Expected WebSocket upgrade', 426);
			}

			const roomId   = c.req.param('roomId');
			const clientId = c.req.query('clientId') ?? crypto.randomUUID();

			const [client, server] = Object.values(new WebSocketPair());
			server.accept();

			/* add to in-memory registry */
			if (!this.clientsByRoom.has(roomId))
				this.clientsByRoom.set(roomId, new Map());
			this.clientsByRoom.get(roomId)!.set(clientId, server);

			server.addEventListener('close', () => {
				const room = this.clientsByRoom.get(roomId);
				if (room) {
					room.delete(clientId);
					if (room.size === 0) this.clientsByRoom.delete(roomId);
				}
			});

			return new Response(null, { status: 101, webSocket: client });
		});

		/* ------------------------------------------------------------------ *
		 * 2. /broadcast/:roomId     (POST JSON → fan-out)
		 * ------------------------------------------------------------------ */
		this.app.post('/broadcast/:roomId', async (c) => {
			const roomId  = c.req.param('roomId');
			const payload = await c.req.text();        // LearnerAssessmentDO already sends a JSON string

			const room = this.clientsByRoom.get(roomId);
			if (!room || room.size === 0)
				return c.json({ status: 'no_active_connection' }, 404);

			let delivered = 0;
			for (const [id, ws] of room) {
				if (ws.readyState === WebSocket.OPEN) {
					try { ws.send(payload); delivered++; }
					catch { /* ignore individual failures */ }
				}
			}
			return c.json({ status: 'ok', delivered });
		});
	}

	fetch(request: Request) {
		return this.app.fetch(request);
	}
}

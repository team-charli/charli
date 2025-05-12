// apps/learner-assessment-worker/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors';
import { Env } from './env'
import { MessageRelayDO } from './messageRelay';
import { LearnerAssessmentDO } from './LearnerAssessmentDO';
const app = new Hono<{ Bindings: Env }>()

// Basic CORS setup
const allowedOrigins = ['http://localhost:5173', 'https://charli.chat'];
app.use('*', async (c, next) => {
	const requestOrigin = c.req.header('origin');
	if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
		return cors({
			origin: requestOrigin,
			allowMethods: ['POST', 'GET', 'OPTIONS'],
			allowHeaders: ['Content-Type', 'Authorization', 'huddle01-signature'],
			exposeHeaders: ['Content-Length'],
			maxAge: 600,
			credentials: true,
		})(c, next);
	}
	return next();
});


// WebSocket endpoint (connections managed by MessageRelay)
app.get('/connect/:roomId', async (c) => {
	if (c.req.header('upgrade') !== 'websocket') {
		return c.text('Expected WebSocket upgrade', 426);
	}

	const roomId = c.req.param('roomId');
	const relayDO = c.env.MESSAGE_RELAY_DO.get(
		c.env.MESSAGE_RELAY_DO.idFromName(roomId)
	);

	const response = await relayDO.fetch(
		`http://message-relay/connect/${roomId}`,
		{
			method: 'GET',
			headers: {
				'Upgrade': 'websocket',
				'Connection': 'Upgrade',
			},
		}
	);

	if (response.webSocket) {
		return new Response(null, { status: 101, webSocket: response.webSocket });
	}

	return c.text('Failed to establish WebSocket connection', 500);
});

// Single endpoint for receiving audio data & end-session signal
app.post('/audio/:roomId', (c) => {
	const roomId = c.req.param('roomId')
	const assessmentDO = c.env.LEARNER_ASSESSMENT_DO.get(
		c.env.LEARNER_ASSESSMENT_DO.idFromName(roomId)
	)
	return assessmentDO.fetch(c.req.raw)
})

export { MessageRelayDO, LearnerAssessmentDO }
export default app

// apps/learner-assessment-worker/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors';
import { Env } from './env'
import { MessageRelayDO } from './messageRelay';
import { LearnerAssessmentDO } from './LearnerAssessmentDO';
import { ScorecardOrchestratorDO } from './ScorecardOrchestratorDO';
import { ScorecardPersisterDO } from './ScorecardPersisterDO';
import { MistakeAnalyzerDO } from './MistakeAnalyzerDO';
import { MistakeDetectorDO } from './MistakeDetectorDO';
import { MistakeEnricherPipelineDO } from './MistakeEnricherPipelineDO';
import { AvgFrequencyEnricherDO } from './AvgFrequencyEnricherDO';
import { SessionFrequencyColorEnricherDO } from './SessionFrequencyColorEnricherDO';
import { LemmaEnricherDO } from './LemmaEnricherDO';
import { TeacherScorecardPersisterDO } from './TeacherScorecardPersisterDO';
const app = new Hono<{ Bindings: Env }>()

// Basic CORS setup
const allowedOrigins = ['http://localhost:5173', 'https://charli.chat'];
app.use('*', async (c, next) => {
	const requestOrigin = c.req.header('origin');
	if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
		return cors({
			origin: requestOrigin,
			allowMethods: ['POST', 'GET', 'OPTIONS'],
			allowHeaders: ['Content-Type', 'Authorization', 'huddle01-signature', 'X-Audio-Level-DB', 'X-Ambient-Noise-DB'],
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
app.post('/audio/:roomId', async (c) => {
	const roomId = c.req.param('roomId')
	const originalUrl = new URL(c.req.url);
	const action = originalUrl.searchParams.get('action');
	
	// 🎯 AIRTIGHT LOGGING: Track all requests at worker entry point
	if (action === 'end-session') {
		console.log(`🎯 [WORKER-INDEX] END-SESSION REQUEST ENTRY - roomId: ${roomId}`);
		console.log(`🎯 [WORKER-INDEX] Full URL: ${c.req.url}`);
		console.log(`🎯 [WORKER-INDEX] Method: ${c.req.method}`);
		console.log(`🎯 [WORKER-INDEX] Headers:`, JSON.stringify(Object.fromEntries(c.req.header())));
		console.log(`🎯 [WORKER-INDEX] Query params:`, JSON.stringify(Object.fromEntries(originalUrl.searchParams)));
	}
	
	const assessmentDO = c.env.LEARNER_ASSESSMENT_DO.get(
		c.env.LEARNER_ASSESSMENT_DO.idFromName(roomId)
	)
	
	// Create a new request with the correct URL for the DO
	const doUrl = `http://learner-assessment${originalUrl.pathname}${originalUrl.search}`;
	
	if (action === 'end-session') {
		console.log(`🎯 [WORKER-INDEX] Forwarding to DO - doUrl: ${doUrl}`);
		console.log(`🎯 [WORKER-INDEX] DO ID: ${c.env.LEARNER_ASSESSMENT_DO.idFromName(roomId)}`);
	}
	
	const doRequest = new Request(doUrl, {
		method: c.req.method,
		headers: c.req.header(),
		body: c.req.raw.body,
	});
	
	const doResponse = await assessmentDO.fetch(doRequest);
	
	if (action === 'end-session') {
		console.log(`🎯 [WORKER-INDEX] DO response status: ${doResponse.status}`);
		console.log(`🎯 [WORKER-INDEX] DO response headers:`, JSON.stringify(Object.fromEntries(doResponse.headers)));
	}
	
	return doResponse;
})

export {
  MessageRelayDO, LearnerAssessmentDO, ScorecardOrchestratorDO,
  ScorecardPersisterDO, MistakeAnalyzerDO, MistakeDetectorDO,
  MistakeEnricherPipelineDO, AvgFrequencyEnricherDO,
  SessionFrequencyColorEnricherDO, LemmaEnricherDO,
  TeacherScorecardPersisterDO
}
export default app

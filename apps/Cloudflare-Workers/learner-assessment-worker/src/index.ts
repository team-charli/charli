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
import { CUE_CARDS, DICTATION_SCRIPTS, getDefaultQADictationScript } from './CueCards';
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


// Test endpoint for logging verification
app.get('/test-logging', async (c) => {
	console.log('[TEST] Basic console.log test');
	console.error('[TEST] Basic console.error test');
	console.warn('[TEST] Basic console.warn test');
	return c.json({ message: 'Test logging endpoint', timestamp: new Date().toISOString() });
});

// 🔍 VERBATIM QA: Cue-cards endpoint for frontend
app.get('/cue-cards', async (c) => {
	console.log('[CUE-CARDS] Serving cue-cards to frontend');
	return c.json({
		cueCards: CUE_CARDS,
		total: CUE_CARDS.length,
		categories: [...new Set(CUE_CARDS.map(card => card.category))]
	});
});

// 🔍 DICTATION SCRIPTS: Endpoint for Deepgram QA mode
app.get('/dictation-scripts', async (c) => {
	console.log('[DICTATION-SCRIPTS] Serving default dictation script for QA mode');
	const defaultScript = getDefaultQADictationScript();
	return c.json({
		script: defaultScript,
		allScripts: DICTATION_SCRIPTS,
		total: DICTATION_SCRIPTS.length
	});
});

// 🔍 VERBATIM QA: Set active cue-card for session
app.post('/cue-cards/:roomId/set-active', async (c) => {
	const roomId = c.req.param('roomId');
	const { cueCardId } = await c.req.json();
	
	console.log(`[CUE-CARDS] Setting active cue-card for room ${roomId}: ${cueCardId}`);
	
	const assessmentDO = c.env.LEARNER_ASSESSMENT_DO.get(
		c.env.LEARNER_ASSESSMENT_DO.idFromName(roomId)
	);
	
	// Forward to the DO to set the active cue-card
	const doResponse = await assessmentDO.fetch(`http://learner-assessment/cue-cards/set-active`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ cueCardId })
	});
	
	return doResponse;
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
	
	// BASIC LOGGING - THIS SHOULD ALWAYS APPEAR
	console.log(`[INDEX] Request to /audio/${roomId} - action: ${action}`);
	console.log(`[INDEX] Full URL: ${c.req.url}`);
	console.error(`[ERROR-LOG] This should appear as an error - roomId: ${roomId}`);
	console.warn(`[WARN-LOG] This should appear as a warning - action: ${action}`);
	
	// 🎯 AIRTIGHT LOGGING: Track all requests at worker entry point
	if (action === 'end-session') {
		console.log(`🎯 [WORKER-INDEX] END-SESSION REQUEST ENTRY - roomId: ${roomId}`);
		console.log(`🎯 [WORKER-INDEX] Full URL: ${c.req.url}`);
		console.log(`🎯 [WORKER-INDEX] Method: ${c.req.method}`);
		
		// Safe header logging
		try {
			const headers = {};
			for (const [key, value] of c.req.header()) {
				headers[key] = value;
			}
			console.log(`🎯 [WORKER-INDEX] Headers:`, JSON.stringify(headers));
		} catch (err) {
			console.log(`🎯 [WORKER-INDEX] Headers: <failed to serialize>`);
		}
		
		// Safe query params logging
		try {
			const params = {};
			for (const [key, value] of originalUrl.searchParams) {
				params[key] = value;
			}
			console.log(`🎯 [WORKER-INDEX] Query params:`, JSON.stringify(params));
		} catch (err) {
			console.log(`🎯 [WORKER-INDEX] Query params: <failed to serialize>`);
		}
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
		
		// Safe response headers logging
		try {
			const responseHeaders = {};
			for (const [key, value] of doResponse.headers) {
				responseHeaders[key] = value;
			}
			console.log(`🎯 [WORKER-INDEX] DO response headers:`, JSON.stringify(responseHeaders));
		} catch (err) {
			console.log(`🎯 [WORKER-INDEX] DO response headers: <failed to serialize>`);
		}
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

// This is the updated version with 5-10 second thinking time implementation
// Key changes:
// 1. Added customThinkingTimer to DGSocket type
// 2. Track interim results to detect ongoing speech  
// 3. Implement custom 7-second thinking time delay
// 4. Ignore premature is_final=true events (< 5 seconds)

// INSTRUCTIONS TO IMPLEMENT:
// 1. Copy this file content to replace LearnerAssessmentDO.ts
// 2. The main changes are in the WebSocket message handler around lines 418-482

/**
 * SOLUTION SUMMARY:
 * 
 * The issue is that Deepgram sends is_final=true every 3-5 seconds regardless of your endpointing=8000 setting.
 * This custom thinking time implementation:
 * 
 * 1. Tracks interim results to know when speech is actively happening
 * 2. When is_final=true arrives too early (< 5 seconds), starts a custom timer
 * 3. Only processes the utterance after 7 total seconds have elapsed
 * 4. Gives you the 5-10 second thinking time you need for Spanish responses
 * 
 * Key logs to watch for:
 * - [DG-THINKING] 🧠 Starting Xms thinking timer - indicates delay is active
 * - [DG-THINKING] ⏰ Thinking time expired - indicates processing after delay
 * - [DG-THINKING] ✅ Sufficient thinking time elapsed - indicates immediate processing
 */

// ADD THESE CHANGES TO YOUR EXISTING FILE:

// 1. UPDATE DGSocket TYPE (around line 31):
/*
type DGSocket = {
	ws: WebSocket;
	ready: Promise<void>;
	segments: TranscribedSegment[];
	lastSpeechTime: number;
	silenceStartTime: number;
	endpointingTimer: any;
	utteranceEndTimer: any;
	recentAudioLevel: number;
	recentAmbientLevel: number;
	customThinkingTimer?: any;      // NEW: 5-10 second thinking time timer
	lastInterimText?: string;       // NEW: track latest interim results
};
*/

// 2. UPDATE WEBSOCKET INITIALIZATION (around line 476):
/*
this.dgSocket = { 
	ws: dgWS, 
	ready, 
	segments: [],
	lastSpeechTime: 0,
	silenceStartTime: 0,
	endpointingTimer: null,
	utteranceEndTimer: null,
	recentAudioLevel: -Infinity,
	recentAmbientLevel: -Infinity,
	customThinkingTimer: null,      // NEW
	lastInterimText: ''             // NEW
};
*/

// 3. ADD INTERIM RESULT TRACKING (around line 418, BEFORE is_final handler):
/*
// Handle interim results to track ongoing speech and implement custom thinking time
else if (msg.type === 'Results' && !msg.is_final && !msg.speech_final) {
	const text = msg.channel?.alternatives?.[0]?.transcript?.trim();
	const speaker = String(msg.channel?.speaker ?? '0');
	const role = speaker === '0' ? 'learner' : 'teacher';
	
	if (text && role === 'learner' && this.dgSocket) {
		// Update latest interim text and speech timing
		this.dgSocket.lastInterimText = text;
		this.dgSocket.lastSpeechTime = Date.now();
		
		// Clear any existing thinking timer since speech is ongoing
		if (this.dgSocket.customThinkingTimer) {
			clearTimeout(this.dgSocket.customThinkingTimer);
			this.dgSocket.customThinkingTimer = null;
			console.log('[DG-THINKING] Cleared thinking timer - learner speech ongoing');
		}
	}
}
*/

// 4. REPLACE is_final HANDLER (around line 445-481):
/*
if (text && role === 'learner' && this.dgSocket) {
	const now = Date.now();
	const timeSinceLastSpeech = this.dgSocket.lastSpeechTime > 0 ? 
		(now - this.dgSocket.lastSpeechTime) : 0;
	
	console.log(`[DG-THINKING] is_final received for learner after ${timeSinceLastSpeech}ms: "${text}"`);
	
	// If this is a premature is_final (< 5 seconds since last speech), start thinking timer
	if (timeSinceLastSpeech < 5000) {
		const thinkingTimeMs = 7000; // 7 seconds total thinking time
		const remainingThinkingTime = thinkingTimeMs - timeSinceLastSpeech;
		
		console.log(`[DG-THINKING] 🧠 Starting ${remainingThinkingTime}ms thinking timer for: "${text}"`);
		
		// Clear any existing timer
		if (this.dgSocket.customThinkingTimer) {
			clearTimeout(this.dgSocket.customThinkingTimer);
		}
		
		// Start new thinking timer
		this.dgSocket.customThinkingTimer = setTimeout(async () => {
			console.log(`[DG-THINKING] ⏰ Thinking time expired, processing utterance: "${text}"`);
			
			// Use the most recent interim text if available, otherwise use the is_final text
			const finalText = this.dgSocket?.lastInterimText || text;
			
			const sessionMode = await this.getSessionMode();
			if (sessionMode === 'robo') {
				console.log(`[DG-THINKING] Triggering flushUtterance after thinking time: "${finalText}"`);
				this.flushUtterance(roomId, finalText).catch(err =>
					console.error('[DG-THINKING] robo utterance processing error:', err)
				);
			}
			
			// Clear the timer reference
			if (this.dgSocket) {
				this.dgSocket.customThinkingTimer = null;
			}
		}, remainingThinkingTime);
		
	} else {
		// Sufficient time has passed, process immediately
		console.log(`[DG-THINKING] ✅ Sufficient thinking time elapsed (${timeSinceLastSpeech}ms), processing: "${text}"`);
		
		const sessionMode = await this.getSessionMode();
		if (sessionMode === 'robo') {
			console.log(`[DG-THINKING] Triggering immediate flushUtterance: "${text}"`);
			this.flushUtterance(roomId, text).catch(err =>
				console.error('[DG-THINKING] robo utterance processing error:', err)
			);
		}
	}
	
	// Clear standard timing trackers
	if (this.dgSocket.endpointingTimer) {
		clearTimeout(this.dgSocket.endpointingTimer);
		this.dgSocket.endpointingTimer = null;
	}
	if (this.dgSocket.utteranceEndTimer) {
		clearTimeout(this.dgSocket.utteranceEndTimer);
		this.dgSocket.utteranceEndTimer = null;
	}
	this.dgSocket.silenceStartTime = 0;
}
*/
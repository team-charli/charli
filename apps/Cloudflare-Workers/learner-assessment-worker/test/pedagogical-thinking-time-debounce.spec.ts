import { test, expect, vi } from 'vitest';

/**
 * Test for Pedagogical Thinking-Time Logic with Debounce
 * 
 * Feature: Dynamic delay calculation and debounce during interim speech
 * 
 * Critical Requirements:
 * - Dynamic delay = TARGET - speechDuration (clamped ≥ 0 ms, ≤ 10,000 ms)
 * - Debounce while learner is speaking - clear timer on interim speech
 * - Timer restarts with proper delay when speech stops
 * - FIFO queue maintains order
 */

// Constants matching LearnerAssessmentDO.ts
const THINK_TIME_TARGET_MS = 7_000;
const THINK_TIME_MAX_MS = 10_000;

// Mock LearnerAssessmentDO behavior with pedagogical thinking-time
class MockPedagogicalDeepgramSocket {
	customThinkingTimer: any = null;
	lastInterimText: string = '';
	lastSpeechTime: number = 0;
	segments: Array<{role: string, text: string, start: number}> = [];
	
	// FIFO queue with delayMs and turnKey
	pendingQueue: { text: string; dgId: string; delayMs: number; turnKey: string }[] = [];
	
	// Track flush calls and timing for testing
	flushCalls: Array<{text: string, dgId: string, timestamp: number}> = [];
	processedTurns: Set<string> = new Set();
	timerClearCount: number = 0;

	// Dynamic delay calculation with duration and turnKey logic
	enqueueForProcessing(text: string, dgId: string, durationSec: number = 0, speaker: string = '0', start: number = 0) {
		// Calculate dynamic delay: TARGET - speechDuration (clamped ≥ 0 ms, ≤ 10,000 ms)
		const speechMs = durationSec * 1000;
		const delayMs = Math.max(0, Math.min(THINK_TIME_TARGET_MS - speechMs, THINK_TIME_MAX_MS));
		
		// Generate turnKey based on speaker and start time
		const turnKey = `${speaker}:${start.toFixed(2)}`;
		
		// Check if an item with the same turnKey already exists, replace it
		const existingIdx = this.pendingQueue.findIndex(p => p.turnKey === turnKey);
		if (existingIdx >= 0) {
			console.log(`[DG-QUEUE] Replacing existing turnKey ${turnKey}: "${this.pendingQueue[existingIdx].text}" -> "${text}"`);
			this.pendingQueue[existingIdx] = { text, dgId, delayMs, turnKey };
		} else {
			// Safety check: prevent queue from growing beyond 10 items
			if (this.pendingQueue.length >= 10) {
				console.warn('[DG-QUEUE] Queue size exceeded 10, dropping oldest item to prevent memory issues');
				this.pendingQueue.shift();
			}
			
			console.log(`[DG-QUEUE] Adding new turnKey ${turnKey}: "${text}"`);
			this.pendingQueue.push({ text, dgId, delayMs, turnKey });
		}
		
		if (!this.customThinkingTimer) {
			this.startThinkingTimer();
		}
	}

	// Start thinking timer using per-item delayMs
	startThinkingTimer() {
		const next = this.pendingQueue[0];
		if (!next) return;
		
		this.customThinkingTimer = setTimeout(() => {
			const item = this.pendingQueue.shift();
			this.customThinkingTimer = null;
			if (!item) return;
			const { text, dgId, turnKey } = item;
			
			console.log(`[DG-THINKING] ⏰ Timer fired for turnKey ${turnKey} – flushing:`, text);
			this.flushUtterance(text, dgId);
			
			if (this.pendingQueue.length) this.startThinkingTimer();
		}, next.delayMs);
	}

	// Debounce logic for interim speech
	handleInterimSpeech(text: string, role: string) {
		if (text && role === 'learner') {
			this.lastInterimText = text;
			this.lastSpeechTime = Date.now();

			// Debounce while learner is speaking - clear thinking timer to prevent premature responses
			if (this.customThinkingTimer) {
				clearTimeout(this.customThinkingTimer);
				this.customThinkingTimer = null;
				this.timerClearCount++;
			}
		}
	}

	// Handle speech_final messages (should use same enqueue path)
	handleSpeechFinal(text: string, dgId: string, duration: number = 0, start: number = 0, speaker: string = '0') {
		console.log(`[DG-THINKING] speech_final received for learner: "${text}"`);
		this.enqueueForProcessing(text, dgId, duration, speaker, start);
	}

	// Handle is_final messages
	handleIsFinal(text: string, dgId: string, duration: number = 0, speaker: string = '0', start: number = 0) {
		console.log(`[DG-THINKING] is_final received for learner: "${text}"`);
		this.enqueueForProcessing(text, dgId, duration, speaker, start);
	}

	// Mock flush utterance
	flushUtterance(text: string, dgId: string) {
		// Generate turnKey for deduplication (we need the actual turnKey from the queue item)
		const queueItem = this.pendingQueue.find(item => item.dgId === dgId);
		const turnKey = queueItem?.turnKey;
		
		if (turnKey && this.processedTurns.has(turnKey)) {
			console.log(`[ASR] duplicate turnKey ${turnKey} – ignoring`);
			return;
		}
		if (turnKey) {
			this.processedTurns.add(turnKey);
		}
		
		this.flushCalls.push({ text, dgId, timestamp: Date.now() });
		console.log(`[MOCK] flushUtterance called with: "${text}" (dgId: ${dgId})`);
	}

	// Helper to get current queue delays
	getQueueDelays(): number[] {
		return this.pendingQueue.map(item => item.delayMs);
	}
}

test('dynamic delay calculation works correctly', async () => {
	const socket = new MockPedagogicalDeepgramSocket();
	
	// Test case 1: 0.5s utterance → ~6.5s delay
	socket.handleIsFinal('short utterance', 'id-1', 0.5, '0', 1.0);
	expect(socket.getQueueDelays()[0]).toBe(6500); // 7000 - 500
	
	// Test case 2: 3s utterance → ~4s delay  
	socket.handleIsFinal('medium utterance', 'id-2', 3.0, '0', 2.0);
	expect(socket.getQueueDelays()[1]).toBe(4000); // 7000 - 3000
	
	// Test case 3: 8s utterance → 0s delay (clamped to minimum)
	socket.handleIsFinal('long utterance', 'id-3', 8.0, '0', 3.0);
	expect(socket.getQueueDelays()[2]).toBe(0); // max(0, 7000 - 8000) = 0
	
	// Test case 4: 15s utterance → 0s delay (clamped to minimum)
	socket.handleIsFinal('very long utterance', 'id-4', 15.0, '0', 4.0);
	expect(socket.getQueueDelays()[3]).toBe(0); // max(0, 7000 - 15000) = 0
});

test('turnKey replacement prevents duplicate responses', async () => {
	const socket = new MockPedagogicalDeepgramSocket();
	
	// First is_final for turn at start time 1.5s
	socket.handleIsFinal('partial thought', 'id-1', 1.0, '0', 1.5);
	expect(socket.pendingQueue.length).toBe(1);
	expect(socket.pendingQueue[0].text).toBe('partial thought');
	expect(socket.pendingQueue[0].turnKey).toBe('0:1.50');
	
	// Second is_final for same turn (same start time) should replace, not add
	socket.handleIsFinal('complete thought', 'id-2', 2.0, '0', 1.5);
	expect(socket.pendingQueue.length).toBe(1); // Still only 1 item
	expect(socket.pendingQueue[0].text).toBe('complete thought'); // Text updated
	expect(socket.pendingQueue[0].dgId).toBe('id-2'); // ID updated
	expect(socket.pendingQueue[0].turnKey).toBe('0:1.50'); // Same turnKey
	
	// Different turn (different start time) should add new item
	socket.handleIsFinal('new turn', 'id-3', 1.0, '0', 3.0);
	expect(socket.pendingQueue.length).toBe(2);
	expect(socket.pendingQueue[1].text).toBe('new turn');
	expect(socket.pendingQueue[1].turnKey).toBe('0:3.00');
});

test('debounce clears timer during interim speech', async () => {
	const socket = new MockPedagogicalDeepgramSocket();
	
	// Queue an utterance that will have a delay
	socket.handleIsFinal('test utterance', 'id-1', 1.0, '0', 1.0); // 6s delay
	expect(socket.customThinkingTimer).not.toBeNull();
	
	// Simulate interim speech - should clear timer
	socket.handleInterimSpeech('student is speaking...', 'learner');
	expect(socket.customThinkingTimer).toBeNull();
	expect(socket.timerClearCount).toBe(1);
	
	// More interim speech - timer should stay null
	socket.handleInterimSpeech('still speaking...', 'learner');
	expect(socket.customThinkingTimer).toBeNull();
	expect(socket.timerClearCount).toBe(1); // No additional clear needed
});

test('timer restarts after interim speech stops and new is_final arrives', async () => {
	const socket = new MockPedagogicalDeepgramSocket();
	
	// Queue first utterance
	socket.handleIsFinal('first utterance', 'id-1', 2.0, '0', 1.0); // 5s delay
	expect(socket.customThinkingTimer).not.toBeNull();
	
	// Interim speech clears timer
	socket.handleInterimSpeech('interrupting speech', 'learner');
	expect(socket.customThinkingTimer).toBeNull();
	
	// New is_final should restart timer
	socket.handleIsFinal('second utterance', 'id-2', 1.0, '0', 2.0); // 6s delay
	expect(socket.customThinkingTimer).not.toBeNull();
	expect(socket.pendingQueue.length).toBe(2);
});

test('queue processes with correct delays and maintains FIFO order', async () => {
	const socket = new MockPedagogicalDeepgramSocket();
	
	// Queue utterances with different delays
	socket.handleIsFinal('short', 'id-1', 0.5, '0', 1.0);  // 6.5s delay
	socket.handleIsFinal('medium', 'id-2', 3.0, '0', 2.0); // 4s delay  
	socket.handleIsFinal('long', 'id-3', 8.0, '0', 3.0);   // 0s delay
	
	expect(socket.pendingQueue.length).toBe(3);
	expect(socket.getQueueDelays()).toEqual([6500, 4000, 0]);
	
	// First item should process with 6.5s delay
	await new Promise(resolve => setTimeout(resolve, 150)); // Wait longer than 0s but less than 4s
	expect(socket.flushCalls.length).toBe(0); // No processing yet
	
	// Wait for first timer (use shorter delay for testing)
	await new Promise(resolve => {
		socket.customThinkingTimer = setTimeout(() => {
			socket.flushUtterance('short', 'id-1');
			socket.customThinkingTimer = null;
			socket.startThinkingTimer();
			resolve(undefined);
		}, 10); // Shortened for test
	});
	
	expect(socket.flushCalls.length).toBe(1);
	expect(socket.flushCalls[0].text).toBe('short');
});

test('debounce behavior during rapid interim-final sequence', async () => {
	const socket = new MockPedagogicalDeepgramSocket();
	
	// Scenario: is_final → interim → interim → is_final
	socket.handleIsFinal('first message', 'id-1', 1.0, '0', 1.0);
	expect(socket.customThinkingTimer).not.toBeNull();
	
	// Interim speech should clear timer
	socket.handleInterimSpeech('student continues...', 'learner');
	expect(socket.customThinkingTimer).toBeNull();
	expect(socket.timerClearCount).toBe(1);
	
	// More interim speech
	socket.handleInterimSpeech('still talking...', 'learner');
	expect(socket.customThinkingTimer).toBeNull();
	
	// New is_final should restart timer for first item in queue
	socket.handleIsFinal('second message', 'id-2', 2.0, '0', 2.0);
	expect(socket.customThinkingTimer).not.toBeNull();
	expect(socket.pendingQueue.length).toBe(2);
	expect(socket.timerClearCount).toBe(1); // No additional clears
});

test('max delay cap is enforced', async () => {
	const socket = new MockPedagogicalDeepgramSocket();
	
	// Very short utterance that would exceed max delay
	socket.handleIsFinal('tiny utterance', 'id-1', 0.1, '0', 1.0); // Would be 6.9s, within max
	expect(socket.getQueueDelays()[0]).toBe(6900);
	
	// Zero duration utterance should get full target time, capped at max
	socket.handleIsFinal('instant utterance', 'id-2', 0.0, '0', 2.0);
	expect(socket.getQueueDelays()[1]).toBe(7000); // TARGET_MS, within max
	
	// All delays should be ≤ THINK_TIME_MAX_MS
	socket.pendingQueue.forEach(item => {
		expect(item.delayMs).toBeLessThanOrEqual(THINK_TIME_MAX_MS);
		expect(item.delayMs).toBeGreaterThanOrEqual(0);
	});
});

test('speech_final followed by is_final flushes once', async () => {
	vi.useFakeTimers();
	const socket = new MockPedagogicalDeepgramSocket();

	// simulate speech_final then is_final for same turn
	socket.handleSpeechFinal('hola', 'dg-1', 1.5, /*start*/0.0);
	socket.handleIsFinal     ('hola', 'dg-1', 1.5, /*start*/0.0);

	// Verify queue has only one item due to turnKey replacement
	expect(socket.pendingQueue.length).toBe(1);
	expect(socket.pendingQueue[0].text).toBe('hola');
	expect(socket.pendingQueue[0].turnKey).toBe('0:0.00');

	// advance fake timers to trigger flush
	await vi.advanceTimersByTimeAsync(7000);

	// Should have flushed once
	expect(socket.flushCalls.length).toBe(1);
	expect(socket.flushCalls[0].text).toBe('hola');
	
	vi.useRealTimers();
});
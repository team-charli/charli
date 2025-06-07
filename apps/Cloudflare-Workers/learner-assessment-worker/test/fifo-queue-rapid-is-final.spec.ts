import { test, expect, vi } from 'vitest';

/**
 * Test for FIFO Queue Processing of Rapid is_final Messages
 * 
 * Feature: Replace single pending slot with FIFO queue to guarantee every learner 
 * is_final utterance is flushed, even when several arrive back-to-back.
 * 
 * Critical Requirements:
 * - Every is_final message gets queued and processed in order
 * - No utterances lost when rapid-fire messages arrive
 * - Queue safety check prevents memory issues
 * - Deepgram-ID dedup still works correctly
 */

// Mock the NEW queue-based LearnerAssessmentDO behavior
class MockQueuedDeepgramSocket {
	customThinkingTimer: any = null;
	lastInterimText: string = '';
	lastSpeechTime: number = 0;
	segments: Array<{role: string, text: string, start: number}> = [];
	
	// NEW: FIFO queue for pending utterances
	pendingQueue: { text: string; dgId: string }[] = [];
	
	// Track flush calls for testing
	flushCalls: Array<{text: string, dgId: string}> = [];
	processedDGIds: Set<string> = new Set();

	// NEW: Enqueue for processing (replaces complex timing logic)
	enqueueForProcessing(text: string, dgId: string) {
		// Safety check: prevent queue from growing beyond 10 items
		if (this.pendingQueue.length >= 10) {
			console.warn('[DG-QUEUE] Queue size exceeded 10, dropping oldest item to prevent memory issues');
			this.pendingQueue.shift();
		}
		
		this.pendingQueue.push({ text, dgId });
		if (!this.customThinkingTimer) {
			this.startThinkingTimer();
		}
	}

	// NEW: Start thinking timer that processes queue items
	startThinkingTimer(thinkingTimeMs: number = 100) {
		this.customThinkingTimer = setTimeout(() => {
			const next = this.pendingQueue.shift();
			this.customThinkingTimer = null;
			if (!next) return;
			const { text, dgId } = next;
			
			console.log('[DG-THINKING] ⏰ Timer fired – flushing:', text);
			this.simulateFlushUtterance(text, dgId);
			
			// Continue processing if more items in queue
			if (this.pendingQueue.length) this.startThinkingTimer(thinkingTimeMs);
		}, thinkingTimeMs);
	}

	// NEW: Simplified is_final handler using queue
	handleIsFinal(text: string, dgId: string) {
		// Add segment to array (unchanged)
		this.segments.push({
			role: 'learner',
			text: text,
			start: Date.now() / 1000
		});

		console.log(`[DG-THINKING] is_final received for learner: "${text}"`);
		
		// NEW: Enqueue for processing instead of complex timing logic
		this.enqueueForProcessing(text, dgId);
	}

	// Mock flushUtterance with Deepgram-ID dedup
	simulateFlushUtterance(text: string, dgId: string) {
		// Deepgram-ID dedup check (unchanged requirement)
		if (dgId && this.processedDGIds.has(dgId)) {
			console.log('[ASR] duplicate DG id – ignoring');
			return;
		}
		this.processedDGIds.add(dgId);

		this.flushCalls.push({ text, dgId });
		console.log(`[MOCK] flushUtterance called with: "${text}" (dgId: ${dgId})`);
	}
}

test('FIFO queue processes two rapid is_final messages in correct order', async () => {
	const mockSocket = new MockQueuedDeepgramSocket();

	// Simulate two is_final messages arriving rapidly
	const message1 = { text: "los estudiantes están confundidos", dgId: "A1" };
	const message2 = { text: "porque no entienden la lección", dgId: "A2" };

	// Fire both messages rapidly (synchronously for testing)
	mockSocket.handleIsFinal(message1.text, message1.dgId);
	mockSocket.handleIsFinal(message2.text, message2.dgId);
	
	// Verify both messages are queued in FIFO order
	expect(mockSocket.pendingQueue).toHaveLength(2);
	expect(mockSocket.pendingQueue[0]).toEqual(message1);
	expect(mockSocket.pendingQueue[1]).toEqual(message2);
	expect(mockSocket.customThinkingTimer).not.toBeNull();

	// Wait for first timer to fire (~100ms)
	await new Promise(resolve => setTimeout(resolve, 150));

	// First message should be processed
	expect(mockSocket.flushCalls).toHaveLength(1);
	expect(mockSocket.flushCalls[0]).toEqual(message1);
	expect(mockSocket.pendingQueue).toHaveLength(1);
	expect(mockSocket.pendingQueue[0]).toEqual(message2);

	// Wait for second timer to fire
	await new Promise(resolve => setTimeout(resolve, 150));

	// Second message should be processed
	expect(mockSocket.flushCalls).toHaveLength(2);
	expect(mockSocket.flushCalls[1]).toEqual(message2);
	expect(mockSocket.pendingQueue).toHaveLength(0);

	// Verify both segments were captured
	expect(mockSocket.segments).toHaveLength(2);
	expect(mockSocket.segments[0].text).toBe(message1.text);
	expect(mockSocket.segments[1].text).toBe(message2.text);
});

test('queue safety check prevents memory issues by dropping oldest items', async () => {
	const mockSocket = new MockQueuedDeepgramSocket();

	// Fill queue to capacity (10 items)
	for (let i = 0; i < 10; i++) {
		mockSocket.enqueueForProcessing(`message ${i}`, `id-${i}`);
	}

	expect(mockSocket.pendingQueue).toHaveLength(10);
	expect(mockSocket.pendingQueue[0].text).toBe('message 0');
	expect(mockSocket.pendingQueue[9].text).toBe('message 9');

	// Add 11th item - should drop oldest
	mockSocket.enqueueForProcessing('message 10', 'id-10');

	expect(mockSocket.pendingQueue).toHaveLength(10);
	expect(mockSocket.pendingQueue[0].text).toBe('message 1'); // 'message 0' dropped
	expect(mockSocket.pendingQueue[9].text).toBe('message 10');
});

test('Deepgram-ID deduplication still works with queue system', async () => {
	const mockSocket = new MockQueuedDeepgramSocket();

	// Send same message with same dgId twice
	const duplicateMessage = { text: "los estudiantes están confundidos", dgId: "DUPLICATE-ID" };

	mockSocket.handleIsFinal(duplicateMessage.text, duplicateMessage.dgId);
	mockSocket.handleIsFinal(duplicateMessage.text, duplicateMessage.dgId);

	// Both should be queued (queue doesn't dedupe)
	expect(mockSocket.pendingQueue).toHaveLength(2);

	// Wait for processing
	await new Promise(resolve => setTimeout(resolve, 250));

	// Only first should be flushed, second should be deduped
	expect(mockSocket.flushCalls).toHaveLength(1);
	expect(mockSocket.flushCalls[0]).toEqual(duplicateMessage);
	expect(mockSocket.processedDGIds.has(duplicateMessage.dgId)).toBe(true);
});

test('queue continues processing until empty', async () => {
	const mockSocket = new MockQueuedDeepgramSocket();

	// Queue 3 messages rapidly
	const messages = [
		{ text: "first message", dgId: "ID-1" },
		{ text: "second message", dgId: "ID-2" },
		{ text: "third message", dgId: "ID-3" }
	];

	messages.forEach(msg => {
		mockSocket.enqueueForProcessing(msg.text, msg.dgId);
	});

	expect(mockSocket.pendingQueue).toHaveLength(3);

	// Wait for all messages to be processed (3 * 100ms + buffer)
	await new Promise(resolve => setTimeout(resolve, 400));

	// All messages should be processed in order
	expect(mockSocket.flushCalls).toHaveLength(3);
	expect(mockSocket.flushCalls[0]).toEqual(messages[0]);
	expect(mockSocket.flushCalls[1]).toEqual(messages[1]);
	expect(mockSocket.flushCalls[2]).toEqual(messages[2]);
	expect(mockSocket.pendingQueue).toHaveLength(0);
});

test('queue starts timer only when no timer is active', async () => {
	const mockSocket = new MockQueuedDeepgramSocket();

	// First message starts timer
	mockSocket.enqueueForProcessing("first", "id-1");
	const firstTimer = mockSocket.customThinkingTimer;
	expect(firstTimer).not.toBeNull();

	// Second message while timer active should not start new timer
	mockSocket.enqueueForProcessing("second", "id-2");
	expect(mockSocket.customThinkingTimer).toBe(firstTimer); // Same timer reference

	expect(mockSocket.pendingQueue).toHaveLength(2);
});
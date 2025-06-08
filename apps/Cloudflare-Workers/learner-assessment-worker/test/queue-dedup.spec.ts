import { test, expect, vi } from 'vitest';

/**
 * Test for DgId-First Dedup Hot-fix
 * 
 * Feature: Eliminate the new "multi-chunk utterance ⇒ two robo replies" regression
 * without touching timers or pedagogical delays.
 * 
 * Critical Requirements:
 * - Use Deepgram id as the primary dedup key
 * - Two is_final packets with same dgId flush only once
 * - Fallback to speaker:start for very old models without dgId
 */

// Mock Deepgram socket with dgId-first dedup logic
class MockDeepgramSocket {
	customThinkingTimer: any = null;
	pendingQueue: { text: string; dgId: string; delayMs: number; turnKey: string }[] = [];
	processedTurns = new Set<string>();
	
	// Track flush calls for testing
	flushCalls: Array<{text: string, dgId: string}> = [];

	// Helper method: makeDedupKey - prefer dgId, fallback to speaker:start
	private makeDedupKey(dgId: string | undefined, speaker: string, start: number) {
		return dgId ? `dg:${dgId}` : `${speaker}:${start.toFixed(2)}`;
	}

	// Simulate enqueueForProcessing with dgId-based turnKey
	enqueueForProcessing(text: string, dgId: string, durationSec: number = 0, speaker: string = '0', start: number = 0) {
		const delayMs = 7000; // Simplified delay for testing
		const turnKey = this.makeDedupKey(dgId, speaker, start);
		
		// Check if an item with the same turnKey already exists, replace it
		const existingIdx = this.pendingQueue.findIndex(p => p.turnKey === turnKey);
		if (existingIdx >= 0) {
			console.log(`[DG-QUEUE] Replacing existing turnKey ${turnKey}: "${this.pendingQueue[existingIdx].text}" -> "${text}"`);
			this.pendingQueue[existingIdx] = { text, dgId, delayMs, turnKey };
		} else {
			console.log(`[DG-QUEUE] Adding new turnKey ${turnKey}: "${text}"`);
			this.pendingQueue.push({ text, dgId, delayMs, turnKey });
		}
		
		if (!this.customThinkingTimer) {
			this.startThinkingTimer();
		}
	}

	// Start thinking timer that processes queue items
	startThinkingTimer() {
		const next = this.pendingQueue[0];
		if (!next) return;
		
		this.customThinkingTimer = setTimeout(() => {
			const item = this.pendingQueue.shift();
			this.customThinkingTimer = null;
			if (!item) return;
			const { text, dgId, turnKey } = item;
			
			console.log(`[DG-THINKING] ⏰ Timer fired for turnKey ${turnKey} – flushing: "${text}"`);
			this.flushUtterance(text, dgId);
			
			if (this.pendingQueue.length) this.startThinkingTimer();
		}, next.delayMs);
	}

	// Simulate flushUtterance with dgId-first dedup logic
	flushUtterance(text: string, dgId: string) {
		const queueItem = this.pendingQueue.find(i => i.dgId === dgId);
		const dedupKey  = queueItem?.turnKey ?? this.makeDedupKey(dgId, '0', 0);

		if (this.processedTurns.has(dedupKey)) {
			console.log(`[ASR] duplicate dedupKey ${dedupKey} – ignoring`);
			return;
		}
		this.processedTurns.add(dedupKey);

		this.flushCalls.push({ text, dgId });
		console.log(`[MOCK] flushUtterance called with: "${text}" (dgId: ${dgId})`);
	}

	// Simulate handleIsFinal messages
	handleIsFinal(text: string, dgId: string, durationSec: number = 2.0, start: number = 0.00) {
		console.log(`[DG] is_final received: "${text}" (dgId: ${dgId})`);
		this.enqueueForProcessing(text, dgId, durationSec, '0', start);
	}
}

test('two is_final packets with same dgId flush only once', async () => {
	vi.useFakeTimers();
	const socket = new MockDeepgramSocket();

	socket.handleIsFinal('hola',   'dg-9', 2.0, /*start*/0.00);
	socket.handleIsFinal('hola',   'dg-9', 3.8, /*start*/4.13);

	await vi.advanceTimersByTime(7000);   // thinking timer

	expect(socket.flushCalls.length).toBe(1);
	expect(socket.flushCalls[0].text).toBe('hola');
	
	vi.useRealTimers();
});

test('different dgIds allow both messages to flush', async () => {
	vi.useFakeTimers();
	const socket = new MockDeepgramSocket();

	socket.handleIsFinal('hola',   'dg-9', 2.0, /*start*/0.00);
	socket.handleIsFinal('adios',  'dg-10', 3.8, /*start*/4.13);

	await vi.advanceTimersByTime(14000);   // two thinking timers

	expect(socket.flushCalls.length).toBe(2);
	expect(socket.flushCalls[0].text).toBe('hola');
	expect(socket.flushCalls[1].text).toBe('adios');
	
	vi.useRealTimers();
});

test('fallback to speaker:start when dgId is undefined', async () => {
	vi.useFakeTimers();
	const socket = new MockDeepgramSocket();

	// Old model without dgId - should use speaker:start fallback
	socket.handleIsFinal('hola', undefined as any, 2.0, /*start*/0.00);
	socket.handleIsFinal('hola', undefined as any, 3.8, /*start*/0.00); // Same start time

	await vi.advanceTimersByTime(7000);   // thinking timer

	expect(socket.flushCalls.length).toBe(1);
	expect(socket.flushCalls[0].text).toBe('hola');
	
	vi.useRealTimers();
});

test('speaker:start allows different utterances when dgId missing', async () => {
	vi.useFakeTimers();
	const socket = new MockDeepgramSocket();

	// Different start times should allow both to flush
	socket.handleIsFinal('hola', undefined as any, 2.0, /*start*/0.00);
	socket.handleIsFinal('adios', undefined as any, 3.8, /*start*/4.13);

	await vi.advanceTimersByTime(14000);   // two thinking timers

	expect(socket.flushCalls.length).toBe(2);
	expect(socket.flushCalls[0].text).toBe('hola');
	expect(socket.flushCalls[1].text).toBe('adios');
	
	vi.useRealTimers();
});
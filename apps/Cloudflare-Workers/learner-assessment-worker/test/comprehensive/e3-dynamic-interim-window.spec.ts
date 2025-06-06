import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../../src/VerbatimAnalyzer';

test('E-3: dynamic interim window adapts to final duration', () => {
	console.log('\n=== E-3: DYNAMIC INTERIM WINDOW TEST ===');
	
	// Test case: long 12-second pause before final should still collect all interims
	const longPauseTranscripts = [
		// Early interims (13 seconds before final)
		{ messageType: 'interim' as const, text: 'hola', confidence: 0.7, timestamp: 1000 },
		{ messageType: 'interim' as const, text: 'hola yo', confidence: 0.8, timestamp: 2000 },
		
		// Long silence gap...
		
		// Final with long duration (12 seconds)
		{ messageType: 'is_final' as const, text: 'hola yo jugimos fútbol ayer con mis amigos', confidence: 0.92, timestamp: 14000, duration: 12 },
	];

	// Access the private method through a public wrapper for testing
	const TestableAnalyzer = VerbatimAnalyzer as any;
	const relatedTranscripts = TestableAnalyzer.getRelatedTranscripts(
		longPauseTranscripts[2], // The final transcript
		longPauseTranscripts
	);
	
	console.log('📊 Dynamic window results:');
	console.log(`   - Final timestamp: ${longPauseTranscripts[2].timestamp}ms`);
	console.log(`   - Final duration: ${longPauseTranscripts[2].duration || 0}s`);
	console.log(`   - Related transcripts found: ${relatedTranscripts.length}`);
	console.log(`   - Expected window: ${Math.max(10_000, (longPauseTranscripts[2].duration || 0) * 2000)}ms`);
	
	relatedTranscripts.forEach((t, i) => {
		console.log(`     ${i + 1}: ${t.messageType} at ${t.timestamp}ms - "${t.text}"`);
	});
	
	// Acceptance criteria: long 12s pause should collect all interims
	// Dynamic window = max(10_000, 12 * 2000) = 24_000ms
	// So interims from timestamp 1000, 2000 should be included (14000 - 24000 = -10000, covers from start)
	expect(relatedTranscripts.length).toBe(3); // All 3 transcripts should be related
	expect(relatedTranscripts.some(t => t.timestamp === 1000)).toBe(true);
	expect(relatedTranscripts.some(t => t.timestamp === 2000)).toBe(true);
	
	console.log('✅ E-3 PASSED: dynamic window collected all interims despite long pause');
});

test('E-3: short duration uses minimum 10s window', () => {
	console.log('\n=== E-3: MINIMUM WINDOW TEST ===');
	
	// Test case: short final duration should still use 10s minimum window
	const shortDurationTranscripts = [
		// Interims just within 10s window
		{ messageType: 'interim' as const, text: 'sí', confidence: 0.8, timestamp: 5500 },
		{ messageType: 'interim' as const, text: 'sí muy bien', confidence: 0.9, timestamp: 6000 },
		
		// Short final (only 2 seconds duration)
		{ messageType: 'is_final' as const, text: 'sí muy bien gracias', confidence: 0.95, timestamp: 15000, duration: 2 },
	];

	const TestableAnalyzer = VerbatimAnalyzer as any;
	const relatedTranscripts = TestableAnalyzer.getRelatedTranscripts(
		shortDurationTranscripts[2], // The final transcript
		shortDurationTranscripts
	);
	
	console.log('📊 Minimum window results:');
	console.log(`   - Final timestamp: ${shortDurationTranscripts[2].timestamp}ms`);
	console.log(`   - Final duration: ${shortDurationTranscripts[2].duration || 0}s`);
	console.log(`   - Related transcripts found: ${relatedTranscripts.length}`);
	console.log(`   - Expected window: ${Math.max(10_000, (shortDurationTranscripts[2].duration || 0) * 2000)}ms`);
	
	// Acceptance criteria: should use 10s minimum window
	// Window = max(10_000, 2 * 2000) = 10_000ms
	// So interims from 5000ms+ should be included (15000 - 10000 = 5000)
	expect(relatedTranscripts.length).toBe(3); // All should be included
	expect(relatedTranscripts.some(t => t.timestamp === 5500)).toBe(true);
	
	console.log('✅ E-3 PASSED: minimum 10s window preserved for short durations');
});
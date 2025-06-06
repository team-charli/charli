import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../../src/VerbatimAnalyzer';

test('E-1: speech_final transcripts are included in matching', () => {
	console.log('\n=== E-1: SPEECH_FINAL PARITY TEST ===');
	
	// Test case: only speech_final exists (no is_final)
	const speechFinalOnlyTranscripts = [
		{ messageType: 'interim' as const, text: 'hola yo', confidence: 0.8, timestamp: 1000 },
		{ messageType: 'interim' as const, text: 'hola yo jugimos', confidence: 0.85, timestamp: 1500 },
		{ messageType: 'speech_final' as const, text: 'hola yo jugimos fútbol ayer con mis amigos', confidence: 0.92, timestamp: 2000 },
	];

	const result = VerbatimAnalyzer.analyzeComprehensiveVerbatimness('speech-final-test', speechFinalOnlyTranscripts);
	
	console.log('📊 Results with speech_final only:');
	console.log(`   - Matched analyses: ${result.matchedAnalyses.length}`);
	console.log(`   - Unmatched transcripts: ${result.unmatchedTranscripts.length}`);
	console.log(`   - Overall score: ${result.overallVerbatimScore}/100`);
	
	// Acceptance criteria: speech_final transcript should be matched
	expect(result.matchedAnalyses.length).toBeGreaterThan(0);
	expect(result.overallVerbatimScore).toBeGreaterThan(0);
	
	// Verify the match contains the speech_final transcript
	const firstMatch = result.matchedAnalyses[0];
	expect(firstMatch.actualTranscripts.some(t => t.messageType === 'speech_final')).toBe(true);
	
	console.log('✅ E-1 PASSED: speech_final transcripts are properly matched');
});

test('E-1 Regression: existing is_final tests still pass', () => {
	console.log('\n=== E-1: REGRESSION TEST ===');
	
	// Test case: mixed speech_final and is_final (existing behavior)
	const mixedTranscripts = [
		{ messageType: 'interim' as const, text: 'muy embarazada', confidence: 0.9, timestamp: 5000 },
		{ messageType: 'speech_final' as const, text: 'muy embarazada por la situación', confidence: 0.94, timestamp: 5300 },
		{ messageType: 'is_final' as const, text: 'muy embarazada por la situación en la tienda', confidence: 0.95, timestamp: 5500 },
	];

	const result = VerbatimAnalyzer.analyzeComprehensiveVerbatimness('regression-test', mixedTranscripts);
	
	console.log('📊 Results with mixed transcript types:');
	console.log(`   - Matched analyses: ${result.matchedAnalyses.length}`);
	console.log(`   - Overall score: ${result.overallVerbatimScore}/100`);
	
	// Should still work as before
	expect(result.matchedAnalyses.length).toBeGreaterThan(0);
	expect(result.overallVerbatimScore).toBeGreaterThan(0);
	
	console.log('✅ E-1 REGRESSION PASSED: existing behavior preserved');
});
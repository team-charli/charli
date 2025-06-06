import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../../src/VerbatimAnalyzer';

test('E-4: short utterances require higher similarity threshold', () => {
	console.log('\n=== E-4: SHORT UTTERANCE THRESHOLD TEST ===');
	
	// Test case: very short utterance "sí" should not match unrelated long turns
	const shortUtteranceTranscripts = [
		{ messageType: 'interim' as const, text: 'sí', confidence: 0.9, timestamp: 1000 },
		{ messageType: 'is_final' as const, text: 'sí', confidence: 0.95, timestamp: 1500 },
	];

	const result = VerbatimAnalyzer.analyzeComprehensiveVerbatimness('short-utterance-test', shortUtteranceTranscripts);
	
	console.log('📊 Short utterance results:');
	console.log(`   - Final text: "${shortUtteranceTranscripts[1].text}"`);
	console.log(`   - Token count: ${shortUtteranceTranscripts[1].text.split(/\s+/).length}`);
	console.log(`   - Matched analyses: ${result.matchedAnalyses.length}`);
	console.log(`   - Unmatched transcripts: ${result.unmatchedTranscripts.length}`);
	
	if (result.matchedAnalyses.length > 0) {
		result.matchedAnalyses.forEach((analysis, index) => {
			console.log(`     Match ${index + 1}: "${analysis.expectedText}" (similarity would need to be ≥0.6)`);
		});
	}
	
	// Acceptance criteria: sentence "sí" should not match unrelated turns
	// With <5 tokens, similarity threshold should be 0.6, which should prevent matches to long unrelated texts
	expect(result.unmatchedTranscripts.length).toBeGreaterThan(0);
	
	console.log('✅ E-4 PASSED: short utterance "sí" correctly avoided false matches');
});

test('E-4: longer utterances use normal threshold', () => {
	console.log('\n=== E-4: NORMAL THRESHOLD TEST ===');
	
	// Test case: longer utterance should still match with normal 0.3 threshold
	const normalUtteranceTranscripts = [
		{ messageType: 'interim' as const, text: 'hola yo jugimos', confidence: 0.8, timestamp: 1000 },
		{ messageType: 'is_final' as const, text: 'hola yo jugimos fútbol ayer con mis amigos', confidence: 0.92, timestamp: 2000 },
	];

	const result = VerbatimAnalyzer.analyzeComprehensiveVerbatimness('normal-utterance-test', normalUtteranceTranscripts);
	
	console.log('📊 Normal utterance results:');
	console.log(`   - Final text: "${normalUtteranceTranscripts[1].text}"`);
	console.log(`   - Token count: ${normalUtteranceTranscripts[1].text.split(/\s+/).length}`);
	console.log(`   - Matched analyses: ${result.matchedAnalyses.length}`);
	console.log(`   - Unmatched transcripts: ${result.unmatchedTranscripts.length}`);
	
	if (result.matchedAnalyses.length > 0) {
		result.matchedAnalyses.forEach((analysis, index) => {
			console.log(`     Match ${index + 1}: "${analysis.expectedText}" (normal 0.3 threshold)`);
		});
	}
	
	// Acceptance criteria: longer utterance should match normally
	// With ≥5 tokens, should use normal 0.3 threshold and find matches
	expect(result.matchedAnalyses.length).toBeGreaterThan(0);
	
	console.log('✅ E-4 PASSED: longer utterance matched with normal threshold');
});

test('E-4: edge case with exactly 5 tokens', () => {
	console.log('\n=== E-4: EDGE CASE 5 TOKENS TEST ===');
	
	// Test case: exactly 5 tokens should use normal threshold
	const fiveTokenTranscripts = [
		{ messageType: 'is_final' as const, text: 'muy embarazada por la situación', confidence: 0.95, timestamp: 1500 },
	];

	const result = VerbatimAnalyzer.analyzeComprehensiveVerbatimness('five-token-test', fiveTokenTranscripts);
	
	console.log('📊 Five token results:');
	console.log(`   - Final text: "${fiveTokenTranscripts[0].text}"`);
	console.log(`   - Token count: ${fiveTokenTranscripts[0].text.split(/\s+/).length}`);
	console.log(`   - Matched analyses: ${result.matchedAnalyses.length}`);
	
	// 5 tokens = normal threshold (0.3), should find matches
	expect(result.matchedAnalyses.length).toBeGreaterThan(0);
	
	console.log('✅ E-4 PASSED: exactly 5 tokens used normal threshold');
});
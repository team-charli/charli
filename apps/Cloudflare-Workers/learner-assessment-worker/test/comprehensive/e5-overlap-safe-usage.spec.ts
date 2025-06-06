import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../../src/VerbatimAnalyzer';

test('E-5: overlap-safe transcript usage allows shared interims', () => {
	console.log('\n=== E-5: OVERLAP-SAFE TRANSCRIPT USAGE TEST ===');
	
	// Test case: two finals 8 seconds apart should both produce matches
	// and shared interims should be allowed
	const overlappingTranscripts = [
		// Early interims
		{ messageType: 'interim' as const, text: 'hola', confidence: 0.8, timestamp: 1000 },
		{ messageType: 'interim' as const, text: 'hola yo', confidence: 0.85, timestamp: 2000 },
		
		// First final
		{ messageType: 'is_final' as const, text: 'hola yo jugimos fútbol ayer', confidence: 0.90, timestamp: 3000 },
		
		// Shared interims (could relate to both finals due to timing)
		{ messageType: 'interim' as const, text: 'muy embarazada', confidence: 0.88, timestamp: 9000 },
		{ messageType: 'interim' as const, text: 'muy embarazada por', confidence: 0.92, timestamp: 10000 },
		
		// Second final (8 seconds after first)
		{ messageType: 'is_final' as const, text: 'muy embarazada por la situación en la tienda', confidence: 0.95, timestamp: 11000 },
	];

	const result = VerbatimAnalyzer.analyzeComprehensiveVerbatimness('overlap-safe-test', overlappingTranscripts);
	
	console.log('📊 Overlap-safe results:');
	console.log(`   - Total transcripts: ${overlappingTranscripts.length}`);
	console.log(`   - Matched analyses: ${result.matchedAnalyses.length}`);
	console.log(`   - Unmatched transcripts: ${result.unmatchedTranscripts.length}`);
	
	result.matchedAnalyses.forEach((analysis, index) => {
		console.log(`     Match ${index + 1}: "${analysis.expectedText.substring(0, 40)}..."`);
		console.log(`       - Uses ${analysis.actualTranscripts.length} transcripts`);
	});
	
	// Acceptance criteria: both finals should produce matches despite shared interims
	expect(result.matchedAnalyses.length).toBe(2);
	
	// Verify we have both expected matches
	const hasJugimosMatch = result.matchedAnalyses.some(a => a.expectedText.includes('jugimos'));
	const hasEmbarazadaMatch = result.matchedAnalyses.some(a => a.expectedText.includes('embarazada'));
	
	expect(hasJugimosMatch).toBe(true);
	expect(hasEmbarazadaMatch).toBe(true);
	
	console.log('✅ E-5 PASSED: both finals matched despite shared interim window');
});

test('E-5: final transcripts are still unique per match', () => {
	console.log('\n=== E-5: FINAL UNIQUENESS TEST ===');
	
	// Test case: ensure final transcripts themselves aren't double-used
	const finalReuseTranscripts = [
		// Same final appears twice (edge case)
		{ messageType: 'interim' as const, text: 'hola yo', confidence: 0.8, timestamp: 1000 },
		{ messageType: 'is_final' as const, text: 'hola yo jugimos fútbol ayer con mis amigos', confidence: 0.90, timestamp: 2000 },
		
		// Different content, different final
		{ messageType: 'interim' as const, text: 'muy embarazada', confidence: 0.88, timestamp: 5000 },
		{ messageType: 'is_final' as const, text: 'muy embarazada por la situación', confidence: 0.95, timestamp: 6000 },
	];

	const result = VerbatimAnalyzer.analyzeComprehensiveVerbatimness('final-uniqueness-test', finalReuseTranscripts);
	
	console.log('📊 Final uniqueness results:');
	console.log(`   - Matched analyses: ${result.matchedAnalyses.length}`);
	console.log(`   - Unmatched transcripts: ${result.unmatchedTranscripts.length}`);
	
	// Should have 2 distinct matches, each using their own final
	expect(result.matchedAnalyses.length).toBe(2);
	
	// Verify each match uses different content
	const match1Text = result.matchedAnalyses[0].actualTranscripts.find(t => t.messageType === 'is_final')?.actualText;
	const match2Text = result.matchedAnalyses[1].actualTranscripts.find(t => t.messageType === 'is_final')?.actualText;
	
	expect(match1Text).not.toBe(match2Text);
	
	console.log('✅ E-5 PASSED: each match uses unique final transcript');
});
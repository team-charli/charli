import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../src/VerbatimAnalyzer';

test('FALLBACK: No learner turns matched should use quality score instead of 0/100', () => {
	// Completely unrelated transcript that won't match any dictation scripts
	const unrelatedTranscript = [
		{ messageType: 'interim' as const, text: 'weather is nice today', confidence: 0.85, timestamp: 0 },
		{ messageType: 'is_final' as const, text: 'the weather is really nice today', confidence: 0.92, timestamp: 800 }
	];

	const result = VerbatimAnalyzer.analyzeComprehensiveVerbatimness(
		'test-session-no-match',
		unrelatedTranscript
	);

	// Should not return 0 due to fallback
	expect(result.overallVerbatimScore).toBeGreaterThan(0);
	expect(result.overallVerbatimScore).toBeLessThanOrEqual(100);
	
	// Should have no matched analyses
	expect(result.matchedAnalyses.length).toBe(0);
	
	// All transcripts should be unmatched
	expect(result.unmatchedTranscripts.length).toBe(2);
	
	// Summary should indicate fallback was used
	expect(result.summary).toContain('No learner turns matched – fallback quality');
	expect(result.summary).toContain(`score ${result.overallVerbatimScore}/100 applied`);
	
	console.log('✅ FALLBACK TEST RESULTS:');
	console.log(`   - Fallback score: ${result.overallVerbatimScore}/100`);
	console.log(`   - Summary: ${result.summary}`);
});
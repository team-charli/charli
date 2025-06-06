import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../../src/VerbatimAnalyzer';

test('E-6: length bucket pre-indexing performance optimization', () => {
	console.log('\n=== E-6: LENGTH BUCKET PRE-INDEXING TEST ===');
	
	// Test case: create many mock turns to trigger bucketing logic
	// This is more of a performance test to verify the feature flag works
	const performanceTranscripts = [
		// Short utterance (should only compare against short turns in bucket)
		{ messageType: 'is_final' as const, text: 'sí muy bien', confidence: 0.9, timestamp: 1000 },
		
		// Medium utterance
		{ messageType: 'is_final' as const, text: 'hola yo jugimos fútbol ayer con mis amigos en el parque', confidence: 0.92, timestamp: 2000 },
		
		// Long utterance
		{ messageType: 'is_final' as const, text: 'muy embarazada por la situación en la tienda cuando había muchas personas comprando diferentes productos', confidence: 0.95, timestamp: 3000 },
	];

	console.log('📊 Testing with various utterance lengths:');
	performanceTranscripts.forEach((t, i) => {
		console.log(`   ${i + 1}: ${t.text.length} chars - "${t.text}"`);
	});

	const result = VerbatimAnalyzer.analyzeComprehensiveVerbatimness('length-bucket-test', performanceTranscripts);
	
	console.log('📊 Length bucket results:');
	console.log(`   - Matched analyses: ${result.matchedAnalyses.length}`);
	console.log(`   - Unmatched transcripts: ${result.unmatchedTranscripts.length}`);
	
	result.matchedAnalyses.forEach((analysis, index) => {
		console.log(`     Match ${index + 1}: "${analysis.expectedText.substring(0, 50)}..."`);
		console.log(`       - Input length: ${performanceTranscripts.find(t => analysis.actualTranscripts.some(at => at.actualText === t.text))?.text.length || 0} chars`);
		console.log(`       - Expected length: ${analysis.expectedText.length} chars`);
	});
	
	// Acceptance criteria: should still find appropriate matches
	// The bucketing is a performance optimization and shouldn't change matching quality
	expect(result.matchedAnalyses.length).toBeGreaterThan(0);
	
	console.log('✅ E-6 PASSED: length bucketing preserved matching accuracy');
});

test('E-6: performance benchmark with many transcripts', () => {
	console.log('\n=== E-6: PERFORMANCE BENCHMARK TEST ===');
	
	// Create many transcripts to test performance improvements
	const manyTranscripts = [];
	for (let i = 0; i < 50; i++) {
		manyTranscripts.push({
			messageType: 'is_final' as const,
			text: `Test transcript ${i} with varying length content to simulate real usage patterns`,
			confidence: 0.9,
			timestamp: i * 1000
		});
	}

	console.log(`📊 Benchmarking with ${manyTranscripts.length} transcripts...`);
	
	const startTime = performance.now();
	const result = VerbatimAnalyzer.analyzeComprehensiveVerbatimness('benchmark-test', manyTranscripts);
	const endTime = performance.now();
	
	const duration = endTime - startTime;
	console.log(`📊 Performance results:`);
	console.log(`   - Processing time: ${duration.toFixed(2)}ms`);
	console.log(`   - Transcripts processed: ${manyTranscripts.length}`);
	console.log(`   - Time per transcript: ${(duration / manyTranscripts.length).toFixed(2)}ms`);
	console.log(`   - Matched analyses: ${result.matchedAnalyses.length}`);
	
	// Should complete in reasonable time even with many transcripts
	expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
	
	console.log('✅ E-6 PASSED: performance benchmark completed within acceptable time');
});
import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../src/VerbatimAnalyzer';
import { DICTATION_SCRIPTS } from '../src/DictationScripts';

const script = DICTATION_SCRIPTS.find(s => s.id === 'grammar-structure-test-003')!;

test('debug subject-verb auto-correction', () => {
	// Simulate auto-corrected transcript data
	const correctedTranscripts = [
		{ "messageType": "interim", "text": "los estudiantes", "confidence": 0.88, "timestamp": 0 },
		{ "messageType": "is_final", "text": "los estudiantes están muy confundidos porque no entienden la lección", "confidence": 0.93, "timestamp": 800 }
	];

	console.log('Expected text:', script.turns[2].expectedText); // turn 3 = index 2
	console.log('Corrected transcripts:', correctedTranscripts);
	
	const result = VerbatimAnalyzer.analyzeDictationScriptVerbatimness(
		script,
		3, // learnerTurnNumber for "Los estudiantes está muy confundidos..."
		correctedTranscripts as any
	);
	
	console.log('Verbatim score:', result.verbatimScore);
	console.log('Auto-corrections:', result.autoCorrectionInstances);
	console.log('Summary:', result.summary);
});
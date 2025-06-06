import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../src/VerbatimAnalyzer';
import { DICTATION_SCRIPTS } from '../src/DictationScripts';

const script = DICTATION_SCRIPTS.find(s => s.id === 'grammar-structure-test-003')!;

// Test for "estudiantes está" → "estudiantes están" correction
test('subject-verb disagreement auto-corrected → low verbatim score', () => {
	// Simulate auto-corrected transcript data
	const correctedTranscripts = [
		{ "messageType": "interim", "text": "los estudiantes", "confidence": 0.88, "timestamp": 0 },
		{ "messageType": "is_final", "text": "los estudiantes están muy confundidos porque no entienden la lección", "confidence": 0.93, "timestamp": 800 }
	];

	const result = VerbatimAnalyzer.analyzeDictationScriptVerbatimness(
		script,
		3, // learnerTurnNumber for "Los estudiantes está muy confundidos..."
		correctedTranscripts as any
	);

	expect(result.verbatimScore).toBeLessThanOrEqual(50);
	expect(result.autoCorrectionInstances.length).toBeGreaterThanOrEqual(1);
	expect(result.autoCorrectionInstances[0].correctionType).toBe('grammar');
});

test('subject-verb disagreement preserved → high verbatim score', () => {
	// Simulate preserved error transcript data
	const preservedTranscripts = [
		{ "messageType": "interim", "text": "los estudiantes", "confidence": 0.86, "timestamp": 0 },
		{ "messageType": "is_final", "text": "los estudiantes está muy confundidos porque no entienden la lección", "confidence": 0.91, "timestamp": 800 }
	];

	const result = VerbatimAnalyzer.analyzeDictationScriptVerbatimness(
		script,
		3, // learnerTurnNumber for "Los estudiantes está muy confundidos..."
		preservedTranscripts as any
	);

	expect(result.verbatimScore).toBeGreaterThanOrEqual(90);
	expect(result.autoCorrectionInstances.length).toBeLessThanOrEqual(1);
});
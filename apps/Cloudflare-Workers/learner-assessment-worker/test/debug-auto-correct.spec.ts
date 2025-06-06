import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../src/VerbatimAnalyzer';
import { DICTATION_SCRIPTS } from '../src/DictationScripts';
import correctedFixture from './__fixtures__/jugimos-corrected.json';

const script = DICTATION_SCRIPTS.find(s => s.id === 'morphological-test-001')!;

test('debug auto-correction detection', () => {
	console.log('Expected text:', script.turns[0].expectedText);
	console.log('Corrected fixture data:', correctedFixture);
	
	const result = VerbatimAnalyzer.analyzeDictationScriptVerbatimness(
		script,
		1, // learnerTurnNumber
		correctedFixture as any
	);
	
	console.log('Verbatim score:', result.verbatimScore);
	console.log('Auto-corrections:', result.autoCorrectionInstances);
	console.log('Actual transcripts:', result.actualTranscripts);
	console.log('Summary:', result.summary);
	
	// This test is just for debugging, no assertions
});
import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../src/VerbatimAnalyzer';
import { DICTATION_SCRIPTS } from '../src/DictationScripts';
import perfectFixture from './__fixtures__/perfect-transcript.json';

const script = DICTATION_SCRIPTS.find(s => s.id === 'tense-vocabulary-test-002')!;

// Test perfect transcript against clean expected text
test('perfect transcript → high verbatim score', () => {
	// Use a learner turn that should have clean text matching the fixture
	const result = VerbatimAnalyzer.analyzeDictationScriptVerbatimness(
		script,
		1, // learner turn with clean text
		perfectFixture as any
	);

	expect(result.verbatimScore).toBeGreaterThanOrEqual(95);
	expect(result.autoCorrectionInstances.length).toBe(0);
	expect(result.summary).toMatch(/Excellent|Perfect/);
});
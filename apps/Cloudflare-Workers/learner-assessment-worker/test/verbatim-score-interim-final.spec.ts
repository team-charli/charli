import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../src/VerbatimAnalyzer';
import { DICTATION_SCRIPTS } from '../src/DictationScripts';
import interimFinalFixture from './__fixtures__/interim-final-normal.json';

const script = DICTATION_SCRIPTS.find(s => s.id === 'grammar-structure-test-003')!;

// Test normal interim progression doesn't trigger false penalties
test('normal interim-final progression → no auto-correction penalty', () => {
	const result = VerbatimAnalyzer.analyzeDictationScriptVerbatimness(
		script,
		3, // use turn 3 which matches the fixture's expected text pattern
		interimFinalFixture as any
	);

	expect(result.verbatimScore).toBeGreaterThanOrEqual(90);
	expect(result.autoCorrectionInstances.length).toBe(0);
	expect(result.summary).toMatch(/Excellent|Good/);
});
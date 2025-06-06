import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../src/VerbatimAnalyzer';
import { DICTATION_SCRIPTS } from '../src/DictationScripts';
import preservedFixture from './__fixtures__/jugimos-preserved.json';

const script = DICTATION_SCRIPTS.find(s => s.id === 'morphological-test-001')!;

test('morphological error preserved → high verbatim score', () => {
	const result = VerbatimAnalyzer.analyzeDictationScriptVerbatimness(
		script,
		1, // learnerTurnNumber
		preservedFixture as any
	);

	expect(result.verbatimScore).toBeGreaterThanOrEqual(90);
	expect(result.autoCorrectionInstances.length).toBeLessThanOrEqual(1);
	expect(result.summary).toMatch(/Excellent|Good/);
});
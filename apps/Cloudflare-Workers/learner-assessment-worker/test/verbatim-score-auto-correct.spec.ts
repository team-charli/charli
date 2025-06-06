import { test, expect } from 'vitest';
import { VerbatimAnalyzer } from '../src/VerbatimAnalyzer';
import { DICTATION_SCRIPTS } from '../src/DictationScripts';
import correctedFixture from './__fixtures__/jugimos-corrected.json';

const script = DICTATION_SCRIPTS.find(s => s.id === 'morphological-test-001')!;

test('morphological error auto-corrected → low verbatim score', () => {
	const result = VerbatimAnalyzer.analyzeDictationScriptVerbatimness(
		script,
		1, // learnerTurnNumber  
		correctedFixture as any
	);

	expect(result.verbatimScore).toBeLessThanOrEqual(50);
	expect(result.autoCorrectionInstances.length).toBeGreaterThanOrEqual(1);
	expect(result.autoCorrectionInstances[0].correctionType).toBe('structure');
});
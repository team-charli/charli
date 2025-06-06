import { test, expect } from 'vitest';

test('debug pattern matching', () => {
	const expectedText = "los estudiantes está muy confundidos porque no entienden la lección";
	const actualText = "los estudiantes están muy confundidos porque no entienden la lección";
	
	// Test different patterns
	const patterns = [
		/\bestudiantes\s+está\b/,
		/estudiantes\s+está/,
		/está/,
		/están/
	];
	
	console.log('Expected text:', expectedText);
	console.log('Actual text:', actualText);
	
	patterns.forEach((pattern, i) => {
		const expectedMatch = expectedText.match(pattern);
		const actualMatch = actualText.match(pattern);
		console.log(`Pattern ${i}: ${pattern}`);
		console.log(`  Expected match: ${expectedMatch ? expectedMatch[0] : 'null'}`);
		console.log(`  Actual match: ${actualMatch ? actualMatch[0] : 'null'}`);
		console.log(`  Should detect correction: ${expectedMatch && !actualMatch}`);
	});
});
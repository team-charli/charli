// apps/learner-assessment-worker/src/VerbatimAnalyzer.ts
// 🔍 VERBATIM ANALYZER: Compare expected cue-card text with actual Deepgram output

import { CueCard } from './CueCards';

export interface VerbatimAnalysisResult {
	cueCardId: string;
	expectedText: string;
	actualTranscripts: TranscriptComparison[];
	verbatimScore: number; // 0-100, how verbatim the output was
	autoCorrectionInstances: AutoCorrectionInstance[];
	preservedErrors: string[];
	lostErrors: string[];
	summary: string;
}

export interface TranscriptComparison {
	messageType: 'interim' | 'speech_final' | 'is_final';
	actualText: string;
	confidence: number;
	timestamp: number;
	editDistance: number;
	similarity: number; // 0-1
}

export interface AutoCorrectionInstance {
	expectedPhrase: string;
	actualPhrase: string;
	correctionType: 'grammar' | 'vocabulary' | 'pronunciation' | 'structure';
	description: string;
}

export class VerbatimAnalyzer {
	/**
	 * Analyze how verbatim Deepgram's output is compared to expected cue-card text
	 */
	static analyzeCueCardVerbatimness(
		cueCard: CueCard,
		deepgramTranscripts: Array<{
			messageType: 'interim' | 'speech_final' | 'is_final';
			text: string;
			confidence: number;
			timestamp: number;
		}>
	): VerbatimAnalysisResult {
		const expectedText = cueCard.expectedText.toLowerCase().trim();
		const transcriptComparisons: TranscriptComparison[] = [];

		// Compare each Deepgram transcript with expected text
		for (const transcript of deepgramTranscripts) {
			const actualText = transcript.text.toLowerCase().trim();
			const editDistance = this.calculateEditDistance(expectedText, actualText);
			const similarity = this.calculateSimilarity(expectedText, actualText);

			transcriptComparisons.push({
				messageType: transcript.messageType,
				actualText: transcript.text, // Keep original case for display
				confidence: transcript.confidence,
				timestamp: transcript.timestamp,
				editDistance,
				similarity
			});
		}

		// Find auto-correction instances
		const autoCorrectionInstances = this.detectAutoCorrections(cueCard, transcriptComparisons);
		
		// Calculate verbatim score
		const verbatimScore = this.calculateVerbatimScore(cueCard, transcriptComparisons, autoCorrectionInstances);
		
		// Analyze preserved vs lost errors
		const { preservedErrors, lostErrors } = this.analyzeErrorPreservation(cueCard, transcriptComparisons);

		// Generate summary
		const summary = this.generateAnalysisSummary(cueCard, verbatimScore, autoCorrectionInstances.length);

		return {
			cueCardId: cueCard.id,
			expectedText: cueCard.expectedText,
			actualTranscripts: transcriptComparisons,
			verbatimScore,
			autoCorrectionInstances,
			preservedErrors,
			lostErrors,
			summary
		};
	}

	/**
	 * Calculate Levenshtein distance between two strings
	 */
	private static calculateEditDistance(str1: string, str2: string): number {
		const matrix = [];
		
		for (let i = 0; i <= str2.length; i++) {
			matrix[i] = [i];
		}
		
		for (let j = 0; j <= str1.length; j++) {
			matrix[0][j] = j;
		}
		
		for (let i = 1; i <= str2.length; i++) {
			for (let j = 1; j <= str1.length; j++) {
				if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
					matrix[i][j] = matrix[i - 1][j - 1];
				} else {
					matrix[i][j] = Math.min(
						matrix[i - 1][j - 1] + 1, // substitution
						matrix[i][j - 1] + 1,     // insertion
						matrix[i - 1][j] + 1      // deletion
					);
				}
			}
		}
		
		return matrix[str2.length][str1.length];
	}

	/**
	 * Calculate similarity score (0-1) based on edit distance
	 */
	private static calculateSimilarity(str1: string, str2: string): number {
		const maxLength = Math.max(str1.length, str2.length);
		if (maxLength === 0) return 1;
		
		const editDistance = this.calculateEditDistance(str1, str2);
		return 1 - (editDistance / maxLength);
	}

	/**
	 * Detect instances where Deepgram auto-corrected learner errors
	 */
	private static detectAutoCorrections(
		cueCard: CueCard,
		transcripts: TranscriptComparison[]
	): AutoCorrectionInstance[] {
		const corrections: AutoCorrectionInstance[] = [];
		const expectedText = cueCard.expectedText.toLowerCase();

		// Define common Spanish auto-corrections based on error types
		const correctionPatterns = [
			// Grammar corrections
			{ pattern: /yo estar/, correction: /yo estoy/, type: 'grammar' as const, desc: 'Corrected verb conjugation' },
			{ pattern: /ella está/, correction: /ellas están/, type: 'grammar' as const, desc: 'Corrected plural agreement' },
			{ pattern: /tu vienes/, correction: /tú vengas/, type: 'grammar' as const, desc: 'Corrected subjunctive' },
			
			// Vocabulary corrections
			{ pattern: /embarazada por/, correction: /avergonzada por/, type: 'vocabulary' as const, desc: 'Corrected false friend' },
			{ pattern: /realizar que/, correction: /darme cuenta/, type: 'vocabulary' as const, desc: 'Corrected anglicism' },
			{ pattern: /aplicar para/, correction: /solicitar/, type: 'vocabulary' as const, desc: 'Corrected direct translation' },
			
			// Pronunciation artifact removal
			{ pattern: /eh\.\.\./, correction: '', type: 'pronunciation' as const, desc: 'Removed hesitation marker' },
			{ pattern: /al\.\.\. al\.\.\. al/, correction: /al/, type: 'pronunciation' as const, desc: 'Cleaned up stuttering' },
			{ pattern: /como se dice\.\.\./, correction: '', type: 'pronunciation' as const, desc: 'Removed filler phrase' },
		];

		for (const transcript of transcripts) {
			const actualText = transcript.actualText.toLowerCase();
			
			for (const pattern of correctionPatterns) {
				if (expectedText.match(pattern.pattern) && !actualText.match(pattern.pattern)) {
					// Expected text has the error, but actual transcript doesn't = auto-correction detected
					corrections.push({
						expectedPhrase: pattern.pattern.source,
						actualPhrase: transcript.actualText,
						correctionType: pattern.type,
						description: pattern.desc
					});
				}
			}
		}

		return corrections;
	}

	/**
	 * Calculate overall verbatim score (0-100)
	 */
	private static calculateVerbatimScore(
		cueCard: CueCard,
		transcripts: TranscriptComparison[],
		autoCorrections: AutoCorrectionInstance[]
	): number {
		if (transcripts.length === 0) return 0;

		// Use the highest similarity score (best match)
		const bestMatch = transcripts.reduce((best, current) => 
			current.similarity > best.similarity ? current : best
		);

		// Start with similarity score
		let score = bestMatch.similarity * 100;

		// Penalize auto-corrections (each correction reduces verbatimness)
		const correctionPenalty = autoCorrections.length * 15; // 15 points per correction
		score = Math.max(0, score - correctionPenalty);

		// Bonus for preserving hesitation markers and fillers (important for learner assessment)
		const expectedLower = cueCard.expectedText.toLowerCase();
		const actualLower = bestMatch.actualText.toLowerCase();
		
		let preservationBonus = 0;
		if (expectedLower.includes('eh') && actualLower.includes('eh')) preservationBonus += 5;
		if (expectedLower.includes('...') && actualLower.includes('...')) preservationBonus += 5;
		if (expectedLower.includes('como se dice') && actualLower.includes('como se dice')) preservationBonus += 10;

		score = Math.min(100, score + preservationBonus);

		return Math.round(score);
	}

	/**
	 * Analyze which errors were preserved vs lost
	 */
	private static analyzeErrorPreservation(
		cueCard: CueCard,
		transcripts: TranscriptComparison[]
	): { preservedErrors: string[], lostErrors: string[] } {
		const preservedErrors: string[] = [];
		const lostErrors: string[] = [];

		if (transcripts.length === 0) {
			return { preservedErrors, lostErrors: cueCard.errorTypes };
		}

		const bestTranscript = transcripts.reduce((best, current) => 
			current.similarity > best.similarity ? current : best
		);

		const expectedLower = cueCard.expectedText.toLowerCase();
		const actualLower = bestTranscript.actualText.toLowerCase();

		// Check preservation of specific error patterns
		const errorChecks = [
			{ type: 'verb_conjugation', pattern: /yo estar/, desc: 'Incorrect verb estar' },
			{ type: 'subject_verb_disagreement', pattern: /niños está/, desc: 'Singular verb with plural subject' },
			{ type: 'double_negative', pattern: /no.*nada/, desc: 'Double negative construction' },
			{ type: 'hesitation_markers', pattern: /eh/, desc: 'Hesitation markers (eh)' },
			{ type: 'fillers', pattern: /como se dice/, desc: 'Filler phrases' },
			{ type: 'stuttering', pattern: /al\.\.\. al/, desc: 'Stuttering patterns' },
			{ type: 'false_friend', pattern: /embarazada por/, desc: 'False friend usage' },
		];

		for (const check of errorChecks) {
			if (cueCard.errorTypes.includes(check.type)) {
				const expectedHasError = expectedLower.match(check.pattern);
				const actualHasError = actualLower.match(check.pattern);

				if (expectedHasError && actualHasError) {
					preservedErrors.push(check.desc);
				} else if (expectedHasError && !actualHasError) {
					lostErrors.push(check.desc);
				}
			}
		}

		return { preservedErrors, lostErrors };
	}

	/**
	 * Generate human-readable analysis summary
	 */
	private static generateAnalysisSummary(
		cueCard: CueCard,
		verbatimScore: number,
		autoCorrectionCount: number
	): string {
		let summary = `Verbatim analysis for "${cueCard.expectedText}": `;
		
		if (verbatimScore >= 90) {
			summary += `Excellent verbatim preservation (${verbatimScore}%)`;
		} else if (verbatimScore >= 70) {
			summary += `Good verbatim preservation (${verbatimScore}%)`;
		} else if (verbatimScore >= 50) {
			summary += `Moderate verbatim preservation (${verbatimScore}%)`;
		} else {
			summary += `Low verbatim preservation (${verbatimScore}%)`;
		}

		if (autoCorrectionCount > 0) {
			summary += `. Detected ${autoCorrectionCount} auto-correction${autoCorrectionCount > 1 ? 's' : ''}.`;
		} else {
			summary += `. No auto-corrections detected.`;
		}

		return summary;
	}
}
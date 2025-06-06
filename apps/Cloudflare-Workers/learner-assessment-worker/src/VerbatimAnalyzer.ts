// apps/learner-assessment-worker/src/VerbatimAnalyzer.ts
// 🔍 VERBATIM ANALYZER: Analyze transcript quality and auto-correction patterns

import { DictationScript, DictationTurn } from './DictationScripts';

export interface VerbatimAnalysisResult {
	dictationScriptId: string;
	learnerTurnNumber: number;
	expectedText: string;
	actualTranscripts: TranscriptComparison[];
	verbatimScore: number; // 0-100, how verbatim the output was
	autoCorrectionInstances: AutoCorrectionInstance[];
	preservedErrors: string[];
	lostErrors: string[];
	summary: string;
}

export interface TranscriptQualityResult {
	sessionId: string;
	transcriptData: TranscriptComparison[];
	qualityScore: number; // 0-100, overall transcript quality
	autoCorrectionInstances: AutoCorrectionInstance[];
	detectedErrorPatterns: string[];
	confidenceAnalysis: {
		averageConfidence: number;
		lowConfidenceSegments: number;
		confidenceVariability: number;
	};
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
	 * Analyze transcript quality without requiring cue card comparison
	 * This method runs sophisticated analysis on any transcript data
	 */
	static analyzeTranscriptQuality(
		sessionId: string,
		deepgramTranscripts: Array<{
			messageType: 'interim' | 'speech_final' | 'is_final';
			text: string;
			confidence: number;
			timestamp: number;
		}>
	): TranscriptQualityResult {
		const transcriptComparisons: TranscriptComparison[] = [];

		// Process each transcript for analysis
		for (const transcript of deepgramTranscripts) {
			const actualText = transcript.text.toLowerCase().trim();
			
			transcriptComparisons.push({
				messageType: transcript.messageType,
				actualText: transcript.text, // Keep original case for display
				confidence: transcript.confidence,
				timestamp: transcript.timestamp,
				editDistance: 0, // Not applicable without expected text
				similarity: 1 // Not applicable without expected text
			});
		}

		// Detect auto-correction patterns without expected text
		const autoCorrectionInstances = this.detectTranscriptAutoCorrections(transcriptComparisons);
		
		// Calculate quality score based on confidence and patterns
		const qualityScore = this.calculateTranscriptQualityScore(transcriptComparisons, autoCorrectionInstances);
		
		// Detect error patterns in transcripts
		const detectedErrorPatterns = this.detectErrorPatterns(transcriptComparisons);

		// Analyze confidence patterns
		const confidenceAnalysis = this.analyzeConfidencePatterns(transcriptComparisons);

		// Generate summary
		const summary = this.generateTranscriptQualitySummary(qualityScore, autoCorrectionInstances.length, confidenceAnalysis);

		return {
			sessionId,
			transcriptData: transcriptComparisons,
			qualityScore,
			autoCorrectionInstances,
			detectedErrorPatterns,
			confidenceAnalysis,
			summary
		};
	}

	/**
	 * Analyze how verbatim Deepgram's output is compared to expected dictation script text
	 */
	static analyzeDictationScriptVerbatimness(
		dictationScript: DictationScript,
		learnerTurnNumber: number,
		deepgramTranscripts: Array<{
			messageType: 'interim' | 'speech_final' | 'is_final';
			text: string;
			confidence: number;
			timestamp: number;
		}>
	): VerbatimAnalysisResult {
		// Find the specific learner turn
		const learnerTurn = dictationScript.turns.find(turn => 
			turn.turnNumber === learnerTurnNumber && turn.speaker === 'learner'
		);
		
		if (!learnerTurn) {
			throw new Error(`No learner turn found for turn number ${learnerTurnNumber} in script ${dictationScript.id}`);
		}
		
		const expectedText = learnerTurn.expectedText.toLowerCase().trim();
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
		const staticPatternCorrections = this.detectAutoCorrections(learnerTurn, transcriptComparisons);
		const interimFinalCorrections = this.detectInterimFinalDifferences(transcriptComparisons);
		const autoCorrectionInstances = [...staticPatternCorrections, ...interimFinalCorrections];
		
		// Calculate verbatim score
		const verbatimScore = this.calculateVerbatimScore(learnerTurn, transcriptComparisons, autoCorrectionInstances);
		
		// Analyze preserved vs lost errors
		const { preservedErrors, lostErrors } = this.analyzeErrorPreservation(learnerTurn, transcriptComparisons);

		// Generate summary
		const summary = this.generateAnalysisSummary(learnerTurn, verbatimScore, autoCorrectionInstances.length);

		return {
			dictationScriptId: dictationScript.id,
			learnerTurnNumber,
			expectedText: learnerTurn.expectedText,
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
		learnerTurn: DictationTurn,
		transcripts: TranscriptComparison[]
	): AutoCorrectionInstance[] {
		const corrections: AutoCorrectionInstance[] = [];
		const expectedText = learnerTurn.expectedText.toLowerCase();

		// Define common Spanish auto-corrections based on error types
		const correctionPatterns = [
			// Grammar corrections
			{ pattern: /yo estar/, correction: /yo estoy/, type: 'grammar' as const, desc: 'Corrected verb conjugation' },
			{ pattern: /ella está/, correction: /ellas están/, type: 'grammar' as const, desc: 'Corrected plural agreement' },
			{ pattern: /tu vienes/, correction: /tú vengas/, type: 'grammar' as const, desc: 'Corrected subjunctive' },
			
			// CRITICAL ADDITIONS - Bidirectional subject-verb disagreement patterns
			{ pattern: /\b\w+s\s+está\b/, correction: /\w+s\s+están/, type: 'grammar' as const, desc: 'Corrected plural subject-verb disagreement' },
			{ pattern: /\bestudiantes\s+está\b/, correction: /estudiantes\s+están/, type: 'grammar' as const, desc: 'Corrected student plural agreement' },
			{ pattern: /\bniños\s+está\b/, correction: /niños\s+están/, type: 'grammar' as const, desc: 'Corrected children plural agreement' },
			
			// Morphological malformations from DictationScripts
			{ pattern: /\bjugimos\b/, correction: /jugamos/, type: 'grammar' as const, desc: 'Corrected malformed past tense' },
			{ pattern: /\bcomiómos\b/, correction: /comimos/, type: 'grammar' as const, desc: 'Corrected malformed accent placement' },
			{ pattern: /\bdormímos\b/, correction: /dormimos/, type: 'grammar' as const, desc: 'Corrected stress placement error' },
			{ pattern: /\bdijieron\b/, correction: /dijeron/, type: 'grammar' as const, desc: 'Corrected non-standard conjugation' },
			{ pattern: /\bhubímos\b/, correction: /hubimos/, type: 'grammar' as const, desc: 'Corrected accent-only malformation' },
			
			// Gender agreement errors
			{ pattern: /\bla\s+problema\b/, correction: /el\s+problema/, type: 'grammar' as const, desc: 'Corrected gender agreement' },
			
			// Pronoun variants and accent errors
			{ pattern: /\bvos\s+podés\b/, correction: /tú\s+puedes/, type: 'grammar' as const, desc: 'Normalized pronoun variant' },
			
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
	 * Detect auto-corrections by comparing interim vs final transcripts
	 * This catches corrections that aren't in the static pattern list
	 */
	private static detectInterimFinalDifferences(
		transcripts: TranscriptComparison[]
	): AutoCorrectionInstance[] {
		const corrections: AutoCorrectionInstance[] = [];

		// Group transcripts by approximate timing (within 2 seconds)
		const timeGroups: Map<number, TranscriptComparison[]> = new Map();

		for (const transcript of transcripts) {
			const timeSlot = Math.floor(transcript.timestamp / 2000) * 2000;
			if (!timeGroups.has(timeSlot)) {
				timeGroups.set(timeSlot, []);
			}
			timeGroups.get(timeSlot)!.push(transcript);
		}

		// For each time group, compare interim vs final
		for (const [timeSlot, group] of timeGroups) {
			const interims = group.filter(t => t.messageType === 'interim');
			const finals = group.filter(t => t.messageType === 'is_final');

			if (interims.length > 0 && finals.length > 0) {
				const lastInterim = interims[interims.length - 1];
				const final = finals[finals.length - 1];

				// Calculate similarity - if very different, likely auto-corrected
				const similarity = this.calculateSimilarity(
					lastInterim.actualText.toLowerCase(),
					final.actualText.toLowerCase()
				);

				if (similarity < 0.8) { // Less than 80% similar
					corrections.push({
						expectedPhrase: lastInterim.actualText,
						actualPhrase: final.actualText,
						correctionType: 'structure',
						description: `Interim-final mismatch: "${lastInterim.actualText}" → "${final.actualText}"`
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
		learnerTurn: DictationTurn,
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

		// Apply percentage-based penalties instead of flat deductions
		const correctionPenaltyPercent = autoCorrections.length * 0.15; // 15% penalty per correction
		
		// Add percentage penalty for interim-final discrepancies
		const interimFinalPenaltyPercent = autoCorrections
			.filter(correction => correction.correctionType === 'structure')
			.length * 0.20; // 20% penalty for structural changes
		
		// Apply percentage penalties
		score = score * (1 - correctionPenaltyPercent - interimFinalPenaltyPercent);
		score = Math.max(0, score);

		// Bonus for preserving hesitation markers and fillers (important for learner assessment)
		const expectedLower = learnerTurn.expectedText.toLowerCase();
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
		learnerTurn: DictationTurn,
		transcripts: TranscriptComparison[]
	): { preservedErrors: string[], lostErrors: string[] } {
		const preservedErrors: string[] = [];
		const lostErrors: string[] = [];

		if (transcripts.length === 0) {
			return { preservedErrors, lostErrors: learnerTurn.errorTypes };
		}

		const bestTranscript = transcripts.reduce((best, current) => 
			current.similarity > best.similarity ? current : best
		);

		const expectedLower = learnerTurn.expectedText.toLowerCase();
		const actualLower = bestTranscript.actualText.toLowerCase();

		// Check preservation of specific error patterns
		const errorChecks = [
			{ type: 'verb_conjugation', pattern: /yo estar/, desc: 'Incorrect verb estar' },
			{ type: 'subject_verb_disagreement', pattern: /niños está/, desc: 'Singular verb with plural subject' },
			{ type: 'plural_subject_verb_disagreement', pattern: /\w+s\s+está/, desc: 'Plural subject with singular verb' },
			{ type: 'morphological_malformation', pattern: /jugimos|comiómos|dormímos|dijieron|hubímos/, desc: 'Malformed verb conjugations' },
			{ type: 'gender_agreement_error', pattern: /la\s+problema/, desc: 'Gender agreement errors' },
			{ type: 'pronoun_variant', pattern: /vos\s+podés/, desc: 'Regional pronoun variants' },
			{ type: 'double_negative', pattern: /no.*nada/, desc: 'Double negative construction' },
			{ type: 'hesitation_markers', pattern: /eh/, desc: 'Hesitation markers (eh)' },
			{ type: 'fillers', pattern: /como se dice/, desc: 'Filler phrases' },
			{ type: 'stuttering', pattern: /al\.\.\. al/, desc: 'Stuttering patterns' },
			{ type: 'false_friend', pattern: /embarazada por/, desc: 'False friend usage' },
		];

		for (const check of errorChecks) {
			if (learnerTurn.errorTypes.includes(check.type)) {
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
		learnerTurn: DictationTurn,
		verbatimScore: number,
		autoCorrectionCount: number
	): string {
		let summary = `Verbatim analysis for "${learnerTurn.expectedText}": `;
		
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

	/**
	 * Detect auto-correction patterns in transcripts without expected text
	 */
	private static detectTranscriptAutoCorrections(
		transcripts: TranscriptComparison[]
	): AutoCorrectionInstance[] {
		const corrections: AutoCorrectionInstance[] = [];

		// Define patterns that suggest auto-correction occurred
		const suspiciousPatterns = [
			// Overly clean Spanish without typical learner hesitations
			{ pattern: /^[^\.]{20,}$/, type: 'pronunciation' as const, desc: 'Suspiciously fluent without hesitations' },
			
			// Perfect grammar where errors would be expected
			{ pattern: /\bestoy\b/, type: 'grammar' as const, desc: 'Perfect "estoy" conjugation (learners often use "estar")' },
			{ pattern: /\bestán\b/, type: 'grammar' as const, desc: 'Perfect plural agreement (often incorrect in learner speech)' },
			{ pattern: /\bvengas\b/, type: 'grammar' as const, desc: 'Correct subjunctive usage (commonly incorrect)' },
			
			// Clean vocabulary without false friends
			{ pattern: /\bavergonzada\b/, type: 'vocabulary' as const, desc: 'Correct use avoiding "embarazada" false friend' },
			{ pattern: /\bdarme cuenta\b/, type: 'vocabulary' as const, desc: 'Native phrase avoiding "realizar" anglicism' },
			{ pattern: /\bsolicitar\b/, type: 'vocabulary' as const, desc: 'Formal vocabulary avoiding "aplicar" direct translation' },
		];

		// Look for patterns across transcript progression
		for (let i = 0; i < transcripts.length; i++) {
			const current = transcripts[i];
			const actualText = current.actualText.toLowerCase();
			
			// Check for suspiciously perfect patterns
			for (const pattern of suspiciousPatterns) {
				if (actualText.match(pattern.pattern)) {
					// If this appears in final but not interim, possible auto-correction
					if (current.messageType === 'is_final') {
						const interimVersions = transcripts
							.filter(t => t.messageType === 'interim' && t.timestamp <= current.timestamp)
							.slice(-3); // Check last 3 interim versions
						
						const hadErrors = interimVersions.some(t => 
							!t.actualText.toLowerCase().match(pattern.pattern)
						);
						
						if (hadErrors) {
							corrections.push({
								expectedPhrase: 'learner error pattern',
								actualPhrase: current.actualText,
								correctionType: pattern.type,
								description: pattern.desc
							});
						}
					}
				}
			}
		}

		return corrections;
	}

	/**
	 * Calculate quality score based on confidence and consistency
	 */
	private static calculateTranscriptQualityScore(
		transcripts: TranscriptComparison[],
		autoCorrections: AutoCorrectionInstance[]
	): number {
		if (transcripts.length === 0) return 0;

		// Base score from average confidence
		const avgConfidence = transcripts.reduce((sum, t) => sum + t.confidence, 0) / transcripts.length;
		let score = avgConfidence * 100;

		// Analyze consistency between interim and final versions
		const finalTranscripts = transcripts.filter(t => t.messageType === 'is_final');
		const interimTranscripts = transcripts.filter(t => t.messageType === 'interim');
		
		if (finalTranscripts.length > 0 && interimTranscripts.length > 0) {
			// Calculate consistency bonus/penalty
			let consistencyScore = 0;
			for (const final of finalTranscripts) {
				const relatedInterims = interimTranscripts.filter(i => 
					Math.abs(i.timestamp - final.timestamp) < 5000 // Within 5 seconds
				);
				
				if (relatedInterims.length > 0) {
					const similarity = this.calculateSimilarity(
						final.actualText.toLowerCase(),
						relatedInterims[relatedInterims.length - 1].actualText.toLowerCase()
					);
					consistencyScore += similarity;
				}
			}
			
			if (finalTranscripts.length > 0) {
				consistencyScore /= finalTranscripts.length;
				score = (score * 0.7) + (consistencyScore * 100 * 0.3); // Weight consistency at 30%
			}
		}

		// Penalize suspected auto-corrections
		const correctionPenalty = autoCorrections.length * 10;
		score = Math.max(0, score - correctionPenalty);

		// Bonus for preserving learner characteristics (hesitations, false starts)
		let learnerCharacteristicsBonus = 0;
		const allText = transcripts.map(t => t.actualText.toLowerCase()).join(' ');
		
		if (allText.includes('eh')) learnerCharacteristicsBonus += 5;
		if (allText.includes('...')) learnerCharacteristicsBonus += 5;
		if (allText.includes('como se dice')) learnerCharacteristicsBonus += 10;
		if (allText.match(/\b\w+\.\.\.\s*\w+/)) learnerCharacteristicsBonus += 5; // Hesitation patterns

		score = Math.min(100, score + learnerCharacteristicsBonus);

		return Math.round(score);
	}

	/**
	 * Detect Spanish error patterns that may indicate learner speech
	 */
	private static detectErrorPatterns(transcripts: TranscriptComparison[]): string[] {
		const patterns: string[] = [];
		const allText = transcripts.map(t => t.actualText.toLowerCase()).join(' ');

		// Common Spanish learner error patterns
		const errorChecks = [
			{ pattern: /yo estar/, desc: 'Incorrect verb conjugation (estar)' },
			{ pattern: /\w+ está\b.*\w+s\b/, desc: 'Subject-verb disagreement' },
			{ pattern: /\w+s\s+está\b/, desc: 'Plural subject-verb disagreement' },
			{ pattern: /jugimos|comiómos|dormímos/, desc: 'Malformed verb conjugations' },
			{ pattern: /dijieron\b/, desc: 'Non-standard preterite forms' },
			{ pattern: /vos\s+podés/, desc: 'Regional pronoun variants' },
			{ pattern: /la\s+problema/, desc: 'Gender agreement error' },
			{ pattern: /embarazada por/, desc: 'False friend usage (embarrassed)' },
			{ pattern: /realizar que/, desc: 'Anglicism (realize)' },
			{ pattern: /aplicar para/, desc: 'Direct translation (apply for)' },
			{ pattern: /eh\.\.\./, desc: 'Hesitation markers' },
			{ pattern: /como se dice/, desc: 'Filler phrases' },
			{ pattern: /\b\w+\.\.\.\s*\w+/, desc: 'Stuttering/repetition patterns' },
			{ pattern: /no.*nada/, desc: 'Double negative' },
		];

		for (const check of errorChecks) {
			if (allText.match(check.pattern)) {
				patterns.push(check.desc);
			}
		}

		return patterns;
	}

	/**
	 * Analyze confidence score patterns across transcripts
	 */
	private static analyzeConfidencePatterns(transcripts: TranscriptComparison[]): {
		averageConfidence: number;
		lowConfidenceSegments: number;
		confidenceVariability: number;
	} {
		if (transcripts.length === 0) {
			return { averageConfidence: 0, lowConfidenceSegments: 0, confidenceVariability: 0 };
		}

		const confidences = transcripts.map(t => t.confidence);
		const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
		const lowConfidenceSegments = confidences.filter(c => c < 0.7).length;
		
		// Calculate standard deviation for variability
		const variance = confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidences.length;
		const confidenceVariability = Math.sqrt(variance);

		return {
			averageConfidence: Math.round(avgConfidence * 100) / 100,
			lowConfidenceSegments,
			confidenceVariability: Math.round(confidenceVariability * 100) / 100
		};
	}

	/**
	 * Generate summary for transcript quality analysis
	 */
	private static generateTranscriptQualitySummary(
		qualityScore: number,
		autoCorrectionCount: number,
		confidenceAnalysis: { averageConfidence: number; lowConfidenceSegments: number; confidenceVariability: number }
	): string {
		let summary = `Transcript quality analysis: `;
		
		if (qualityScore >= 90) {
			summary += `Excellent quality (${qualityScore}%)`;
		} else if (qualityScore >= 70) {
			summary += `Good quality (${qualityScore}%)`;
		} else if (qualityScore >= 50) {
			summary += `Moderate quality (${qualityScore}%)`;
		} else {
			summary += `Low quality (${qualityScore}%)`;
		}

		summary += `. Average confidence: ${(confidenceAnalysis.averageConfidence * 100).toFixed(1)}%`;

		if (confidenceAnalysis.lowConfidenceSegments > 0) {
			summary += `. ${confidenceAnalysis.lowConfidenceSegments} low-confidence segments detected`;
		}

		if (autoCorrectionCount > 0) {
			summary += `. ${autoCorrectionCount} potential auto-correction${autoCorrectionCount > 1 ? 's' : ''} detected`;
		}

		return summary;
	}
}
// apps/learner-assessment-worker/src/VerbatimAnalyzer.ts
// 🔍 VERBATIM ANALYZER: Analyze transcript quality and auto-correction patterns

import { DictationScript, DictationTurn, DICTATION_SCRIPTS } from './DictationScripts';

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

export interface ComprehensiveVerbatimAnalysisResult {
	sessionId: string;
	matchedAnalyses: VerbatimAnalysisResult[];
	unmatchedTranscripts: Array<{
		messageType: 'interim' | 'speech_final' | 'is_final';
		text: string;
		confidence: number;
		timestamp: number;
	}>;
	overallVerbatimScore: number;
	totalAutoCorrections: number;
	summary: string;
}

export interface AutoCorrectionInstance {
	expectedPhrase: string;
	actualPhrase: string;
	correctionType: 'grammar' | 'vocabulary' | 'pronunciation' | 'structure';
	description: string;
}

export class VerbatimAnalyzer {
	/**
	 * DEBUG LOGGING: Only log when DEBUG_VERBATIM=1 to avoid 100 MB Day-0 logs
	 */
	private static debugLog(message: string, data?: any): void {
		if (typeof process !== 'undefined' && process.env?.DEBUG_VERBATIM === '1') {
			console.log(`[VerbatimAnalyzer] ${message}`, data ? JSON.stringify(data, null, 2) : '');
		}
	}
	/**
	 * Comprehensive verbatim analysis that automatically matches transcripts 
	 * to the most appropriate dictation script turns from all available scripts
	 */
	static analyzeComprehensiveVerbatimness(
		sessionId: string,
		deepgramTranscripts: Array<{
			messageType: 'interim' | 'speech_final' | 'is_final';
			text: string;
			confidence: number;
			timestamp: number;
			duration?: number; // E-3: Support duration for dynamic window calculation
		}>
	): ComprehensiveVerbatimAnalysisResult {
		const matchedAnalyses: VerbatimAnalysisResult[] = [];
		const usedTranscripts = new Set<number>();
		const usedLearnerTurns = new Set<string>(); // E-2: Track claimed learner turns
		
		// Group transcripts by final statements for matching (E-1: include speech_final)
		const finalTranscripts = deepgramTranscripts
			.filter(t => t.messageType === 'is_final' || t.messageType === 'speech_final')
			.map((transcript, index) => ({
				...transcript,
				originalIndex: deepgramTranscripts.indexOf(transcript),
				relatedTranscripts: this.getRelatedTranscripts(transcript, deepgramTranscripts)
			}));

		// E-6: Pre-index learner turns by length buckets for performance (when > 200 turns)
		const allLearnerTurns: Array<{ script: DictationScript; turn: DictationTurn }> = [];
		for (const script of DICTATION_SCRIPTS) {
			for (const turn of script.turns) {
				if (turn.speaker === 'learner') {
					allLearnerTurns.push({ script, turn });
				}
			}
		}

		const shouldUseBucketing = allLearnerTurns.length > 200;
		let lengthBuckets: Map<string, Array<{ script: DictationScript; turn: DictationTurn }>> | null = null;

		if (shouldUseBucketing) {
			lengthBuckets = new Map();
			for (const item of allLearnerTurns) {
				const bucketKey = this.getLengthBucket(item.turn.expectedText.length);
				if (!lengthBuckets.has(bucketKey)) {
					lengthBuckets.set(bucketKey, []);
				}
				lengthBuckets.get(bucketKey)!.push(item);
			}
		}

		// Try to match each final transcript against all learner turns in all scripts
		for (const finalTranscript of finalTranscripts) {
			let bestMatch: {
				script: DictationScript;
				turn: DictationTurn;
				similarity: number;
			} | null = null;

			// E-6: Use bucketed search if available, otherwise search all
			const candidateTurns = shouldUseBucketing && lengthBuckets 
				? this.getCandidateTurnsFromBuckets(finalTranscript.text.length, lengthBuckets)
				: allLearnerTurns;

			// Search through candidate learner turns
			for (const { script, turn } of candidateTurns) {
				// E-2: Skip if this learner turn is already claimed
				const turnKey = `${script.id}:${turn.turnNumber}`;
				if (usedLearnerTurns.has(turnKey)) continue;

				const similarity = this.calculateSimilarity(
					turn.expectedText.toLowerCase().trim(),
					finalTranscript.text.toLowerCase().trim()
				);

				// E-4: Dynamic threshold based on utterance length
				const tokenCount = finalTranscript.text.split(/\s+/).length;
				const threshold = tokenCount < 5 ? 0.6 : 0.3; // Higher threshold for short utterances

				// Use dynamic threshold to ensure reasonable matches
				if (similarity >= threshold && (!bestMatch || similarity > bestMatch.similarity)) {
					bestMatch = { script, turn, similarity };
				}
			}

			// If we found a good match, analyze it
			if (bestMatch) {
				// E-2: Mark this learner turn as claimed
				const turnKey = `${bestMatch.script.id}:${bestMatch.turn.turnNumber}`;
				usedLearnerTurns.add(turnKey);
				const analysisResult = this.analyzeDictationScriptVerbatimness(
					bestMatch.script,
					bestMatch.turn.turnNumber,
					finalTranscript.relatedTranscripts
				);
				
				matchedAnalyses.push(analysisResult);
				
				// E-5: Only mark the final transcript as used, allow interims to be shared
				const finalIndex = deepgramTranscripts.indexOf(finalTranscript as any);
				if (finalIndex >= 0) usedTranscripts.add(finalIndex);
			}
		}

		// Collect unmatched transcripts
		const unmatchedTranscripts = deepgramTranscripts.filter((_, index) => !usedTranscripts.has(index));

		// Calculate overall metrics
		const overallVerbatimScore = matchedAnalyses.length > 0 
			? Math.round(matchedAnalyses.reduce((sum, analysis) => sum + analysis.verbatimScore, 0) / matchedAnalyses.length)
			: 0;

		const totalAutoCorrections = matchedAnalyses.reduce((sum, analysis) => sum + analysis.autoCorrectionInstances.length, 0);

		// Generate summary
		const summary = this.generateComprehensiveSummary(matchedAnalyses.length, unmatchedTranscripts.length, overallVerbatimScore, totalAutoCorrections);

		return {
			sessionId,
			matchedAnalyses,
			unmatchedTranscripts,
			overallVerbatimScore,
			totalAutoCorrections,
			summary
		};
	}

	/**
	 * Get all transcripts related to a final transcript (interims leading up to it)
	 * E-3: Dynamic interim window based on final duration
	 */
	private static getRelatedTranscripts(
		finalTranscript: { timestamp: number; messageType: string; text: string; confidence: number; duration?: number },
		allTranscripts: Array<{ messageType: 'interim' | 'speech_final' | 'is_final'; text: string; confidence: number; timestamp: number; duration?: number }>
	): Array<{ messageType: 'interim' | 'speech_final' | 'is_final'; text: string; confidence: number; timestamp: number; duration?: number }> {
		// SHRUNK: Dynamic window = max(3_000ms, final.duration * 1500ms)
		const dynamicWindow = Math.max(3_000, (finalTranscript.duration || 0) * 1500);
		
		// Find all interim transcripts in the dynamic window leading up to this final
		// ROLE ISOLATION: Filter by role === 'learner' if available (defensive for future two-speaker recordings)
		const relatedTranscripts = allTranscripts.filter(t => 
			t.timestamp <= finalTranscript.timestamp && 
			t.timestamp > finalTranscript.timestamp - dynamicWindow && // Dynamic window
			(t.messageType === 'interim' || t === finalTranscript) &&
			// Future role isolation - currently transcripts don't have role, but this prevents teacher speech leakage
			(!('role' in t) || (t as any).role !== 'teacher')
		);

		// Always include the final transcript itself
		if (!relatedTranscripts.includes(finalTranscript as any)) {
			relatedTranscripts.push(finalTranscript as any);
		}

		return relatedTranscripts.sort((a, b) => a.timestamp - b.timestamp);
	}

	/**
	 * Generate comprehensive analysis summary
	 */
	private static generateComprehensiveSummary(
		matchedCount: number,
		unmatchedCount: number,
		overallScore: number,
		totalCorrections: number
	): string {
		let summary = `Comprehensive verbatim analysis: ${matchedCount} phrases matched to dictation scripts`;
		
		if (unmatchedCount > 0) {
			summary += `, ${unmatchedCount} unmatched transcripts`;
		}

		summary += `. Overall verbatim score: ${overallScore}/100`;

		if (totalCorrections > 0) {
			summary += `. Detected ${totalCorrections} auto-correction${totalCorrections > 1 ? 's' : ''} across all matches`;
		}

		if (overallScore >= 80) {
			summary += `. ✅ Excellent verbatim preservation - minimal assessment impact`;
		} else if (overallScore >= 60) {
			summary += `. ⚠️ Good verbatim preservation - some assessment impact`;
		} else if (overallScore >= 40) {
			summary += `. 🟡 Moderate verbatim preservation - notable assessment impact`;
		} else {
			summary += `. 🔴 Poor verbatim preservation - significant assessment impact`;
		}

		return summary;
	}

	/**
	 * RECOMMENDED: Use this method instead of manually calling analyzeDictationScriptVerbatimness
	 * This automatically finds the best matching dictation script turns for your transcripts
	 */
	static analyzeSessionVerbatimness(
		sessionId: string,
		deepgramTranscripts: Array<{
			messageType: 'interim' | 'speech_final' | 'is_final';
			text: string;
			confidence: number;
			timestamp: number;
			duration?: number; // E-3: Support duration for dynamic window calculation
		}>
	): ComprehensiveVerbatimAnalysisResult {
		return this.analyzeComprehensiveVerbatimness(sessionId, deepgramTranscripts);
	}

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
		const allCorrections = [...staticPatternCorrections, ...interimFinalCorrections];
		const autoCorrectionInstances = this.deduplicateCorrections(allCorrections);
		
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
	 * TOKEN-DIFF SANITY CHECK: Detect extreme mismatches using Levenshtein distance and word overlap
	 */
	private static isExtremeMismatch(expected: string, actual: string): boolean {
		const maxLen = Math.max(expected.length, actual.length);
		if (maxLen === 0) return false;
		
		const editDistance = this.calculateEditDistance(expected, actual);
		const distanceRatio = editDistance / maxLen;
		
		// Check common word overlap
		const expectedWords = expected.toLowerCase().split(/\s+/).filter(w => w.length > 2);
		const actualWords = actual.toLowerCase().split(/\s+/).filter(w => w.length > 2);
		
		if (expectedWords.length === 0 || actualWords.length === 0) return true;
		
		const commonWords = expectedWords.filter(w => actualWords.includes(w));
		const overlapRatio = commonWords.length / Math.max(expectedWords.length, actualWords.length);
		
		// If Levenshtein distance / maxLen > 0.8 AND common-word overlap < 0.15, it's an extreme mismatch
		return distanceRatio > 0.8 && overlapRatio < 0.15;
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
		
		// Only check the best (final) transcript
		const bestTranscript = this.selectBestTranscript(transcripts);
		const actualText = bestTranscript.actualText.toLowerCase();
		
		// SIMILARITY GATE: Require minimum similarity before auto-correction analysis
		const similarity = this.calculateSimilarity(expectedText, actualText);
		this.debugLog(`Similarity check: ${similarity.toFixed(3)} for expected="${expectedText}" vs actual="${actualText}"`);
		if (similarity < 0.25) {
			// If similarity is too low, likely unrelated transcripts - skip auto-correction analysis
			this.debugLog('SKIPPED: Similarity too low, aborting auto-correction analysis');
			return corrections;
		}
		
		// TOKEN-DIFF SANITY CHECK: Abort for extreme mismatches
		if (this.isExtremeMismatch(expectedText, actualText)) {
			// Extreme mismatch detected - abort auto-correction flags for this pair
			this.debugLog('SKIPPED: Extreme mismatch detected, aborting auto-correction analysis');
			return corrections;
		}
		
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
			{ pattern: /\bjugimos\b/i, correction: /jugamos/i, type: 'grammar' as const, desc: 'Corrected malformed past tense' },
			{ pattern: /\bcomiómos\b/i, correction: /comimos/i, type: 'grammar' as const, desc: 'Corrected malformed accent placement' },
			{ pattern: /\bdormímos\b/i, correction: /dormimos/i, type: 'grammar' as const, desc: 'Corrected stress placement error' },
			{ pattern: /\bdijieron\b/i, correction: /dijeron/i, type: 'grammar' as const, desc: 'Corrected non-standard conjugation' },
			{ pattern: /\bhubímos\b/i, correction: /hubimos/i, type: 'grammar' as const, desc: 'Corrected accent-only malformation' },
			
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

		// Two-phase subject-verb disagreement checks  
		// Check for plural subjects with singular verb in expected, corrected in actual
		const pluralWithEsta = /estudiantes\s+está/i.test(expectedText);
		const pluralWithEstan = /estudiantes\s+están/i.test(actualText);
		
		if (pluralWithEsta && pluralWithEstan) {
			corrections.push({
				expectedPhrase: 'plural subject + está',
				actualPhrase: bestTranscript.actualText,
				correctionType: 'grammar',
				description: 'Corrected plural subject-verb disagreement'
			});
		}

		for (const pattern of correctionPatterns) {
			// Skip subject-verb patterns as they're handled above
			if (pattern.desc.includes('plural agreement') || pattern.desc.includes('subject-verb')) {
				continue;
			}
			
			// NULL-SAFE PATTERN RULES: Validate each pattern.correction is non-empty string
			if (!pattern.correction || typeof pattern.correction !== 'object' || 
				!(pattern.correction instanceof RegExp) && typeof pattern.correction !== 'string') {
				this.debugLog(`SKIPPED: Invalid correction pattern - missing or invalid correction field`, pattern);
				continue;
			}
			
			// TIGHTENED: Both conditions must be true:
			// 1. Expected text contains the error
			// 2. Actual text contains the correction (not just omits the error)
			if (expectedText.match(pattern.pattern) && 
				pattern.correction && 
				new RegExp(pattern.correction, 'i').test(actualText)) {
				corrections.push({
					expectedPhrase: pattern.pattern.source,
					actualPhrase: bestTranscript.actualText,
					correctionType: pattern.type,
					description: pattern.desc
				});
				// Note: removed break to allow multiple patterns to match
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
		
		// Only check final transcripts
		const finalTranscripts = transcripts.filter(t => t.messageType === 'is_final');
		
		for (const final of finalTranscripts) {
			// Find interim transcripts within 1 second before this final
			const relatedInterims = transcripts.filter(t => 
				t.messageType === 'interim' && 
				t.timestamp <= final.timestamp &&
				t.timestamp > final.timestamp - 1000 // Within 1 second
			);
			
			if (relatedInterims.length > 0) {
				const lastInterim = relatedInterims[relatedInterims.length - 1];
				
				// Only flag if texts are related but significantly different
				const hasOverlap = this.hasSignificantTextOverlap(
					lastInterim.actualText,
					final.actualText
				);
				
				const editDistance = this.calculateEditDistance(
					lastInterim.actualText.toLowerCase(),
					final.actualText.toLowerCase()
				);
				
				const diffRatio = editDistance / Math.max(
					lastInterim.actualText.length,
					final.actualText.length
				);
				
				// Check if this is actually a morphological correction vs normal extension
				const containsMorphError = /\b(jugimos|comiómos|dormímos|dijieron|hubímos)\b/i.test(lastInterim.actualText);
				const containsCorrection = /\b(jugamos|comimos|dormimos|dijeron|hubimos)\b/i.test(final.actualText);
				
				// If it's a morphological correction, flag it regardless of other criteria
				if (containsMorphError && containsCorrection) {
					corrections.push({
						expectedPhrase: lastInterim.actualText,
						actualPhrase: final.actualText,
						correctionType: 'structure', // Use structure for higher penalty (40 vs 35)
						description: `Morphological auto-correction: "${lastInterim.actualText}" → "${final.actualText}"`
					});
				}
				// Otherwise, use conservative criteria for structural changes
				else if (hasOverlap && diffRatio >= 0.5 && lastInterim.actualText.length > 8) {
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
	 * Select the most authoritative transcript for comparison
	 */
	private static selectBestTranscript(transcripts: TranscriptComparison[]): TranscriptComparison {
		// Priority: last is_final > last speech_final > last interim
		const finals = transcripts.filter(t => t.messageType === 'is_final');
		if (finals.length > 0) {
			return finals[finals.length - 1]; // Last is_final
		}
		
		const speechFinals = transcripts.filter(t => t.messageType === 'speech_final');
		if (speechFinals.length > 0) {
			return speechFinals[speechFinals.length - 1];
		}
		
		// Fallback to last interim
		return transcripts[transcripts.length - 1];
	}

	/**
	 * Add helper method to check text overlap
	 */
	private static hasSignificantTextOverlap(text1: string, text2: string): boolean {
		const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
		const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
		
		if (words1.length === 0 || words2.length === 0) return false;
		
		const commonWords = words1.filter(w => words2.includes(w));
		const overlapPercent = commonWords.length / Math.max(words1.length, words2.length);
		
		return overlapPercent >= 0.3; // At least 30% word overlap
	}

	/**
	 * Deduplicate auto-correction instances, keeping highest penalty ones
	 */
	private static deduplicateCorrections(corrections: AutoCorrectionInstance[]): AutoCorrectionInstance[] {
		// Define penalty weights for prioritization
		const penaltyWeight = {
			structure: 40,
			grammar: 35,
			vocabulary: 20,
			pronunciation: 10
		};
		
		// Sort by penalty weight descending
		const sorted = corrections.sort((a, b) => 
			penaltyWeight[b.correctionType] - penaltyWeight[a.correctionType]
		);
		
		const seen = new Set<string>();
		const deduplicated: AutoCorrectionInstance[] = [];
		
		for (const correction of sorted) {
			const hash = correction.actualPhrase; // Use actualPhrase as unique key
			if (!seen.has(hash)) {
				seen.add(hash);
				deduplicated.push(correction);
			}
		}
		
		return deduplicated;
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

		// 1. Use best transcript (not bestMatch from all)
		const bestTranscript = this.selectBestTranscript(transcripts);
		
		// 2. Base score from similarity
		let score = bestTranscript.similarity * 100;

		// 3. Apply graduated penalties per correction type with flood guard
		let totalPenalty = 0;
		for (const correction of autoCorrections) {
			let penalty = 0;
			switch (correction.correctionType) {
				case 'grammar': penalty = 50; break;
				case 'vocabulary': penalty = 20; break; 
				case 'pronunciation': penalty = 10; break;
				case 'structure': penalty = 50; break;
			}
			totalPenalty += penalty;
		}
		
		// PENALTY FLOOD GUARD: Cap total deduction at -70 pts per learner turn
		const maxPenalty = 70;
		const appliedPenalty = Math.min(totalPenalty, maxPenalty);
		this.debugLog(`Penalty calculation: total=${totalPenalty}, capped=${appliedPenalty}, corrections=${autoCorrections.length}`);
		score -= appliedPenalty;

		// 4. Add bonuses for preserved learner characteristics
		const expectedLower = learnerTurn.expectedText.toLowerCase();
		const actualLower = bestTranscript.actualText.toLowerCase();
		
		let bonus = 0;
		if (expectedLower.includes('eh') && actualLower.includes('eh')) bonus += 5;
		if (expectedLower.includes('...') && actualLower.includes('...')) bonus += 5;
		if (expectedLower.includes('como se dice') && actualLower.includes('como se dice')) bonus += 5;

		score += bonus;

		// 5. Cap in [0, 100]
		return Math.max(0, Math.min(100, Math.round(score)));
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

	/**
	 * E-6: Get length bucket key for pre-indexing optimization
	 */
	private static getLengthBucket(length: number): string {
		// Create buckets with ±20% overlap to handle edge cases
		if (length <= 20) return 'xs'; // Very short
		if (length <= 50) return 's';  // Short
		if (length <= 100) return 'm'; // Medium
		if (length <= 200) return 'l'; // Long
		return 'xl'; // Very long
	}

	/**
	 * E-6: Get candidate turns from relevant length buckets (±20% range)
	 */
	private static getCandidateTurnsFromBuckets(
		transcriptLength: number, 
		buckets: Map<string, Array<{ script: DictationScript; turn: DictationTurn }>>
	): Array<{ script: DictationScript; turn: DictationTurn }> {
		const candidates: Array<{ script: DictationScript; turn: DictationTurn }> = [];
		
		// Get primary bucket
		const primaryBucket = this.getLengthBucket(transcriptLength);
		if (buckets.has(primaryBucket)) {
			candidates.push(...buckets.get(primaryBucket)!);
		}

		// Add adjacent buckets for overlap (±20% tolerance)
		const minLength = transcriptLength * 0.8;
		const maxLength = transcriptLength * 1.2;
		
		for (const [bucketKey, bucketTurns] of buckets.entries()) {
			if (bucketKey === primaryBucket) continue;
			
			// Check if any turns in this bucket could be in range
			const hasRelevantTurns = bucketTurns.some(item => {
				const turnLength = item.turn.expectedText.length;
				return turnLength >= minLength && turnLength <= maxLength;
			});
			
			if (hasRelevantTurns) {
				candidates.push(...bucketTurns);
			}
		}

		return candidates;
	}
}
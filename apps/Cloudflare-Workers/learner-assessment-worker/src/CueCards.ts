// apps/learner-assessment-worker/src/CueCards.ts
// 🔍 CUE-CARD SYSTEM: Test phrases for evaluating Deepgram verbatim accuracy

export interface CueCard {
	id: string;
	category: 'grammar' | 'pronunciation' | 'vocabulary' | 'mixed';
	expectedText: string;
	description: string;
	errorTypes: string[];
}

export const CUE_CARDS: CueCard[] = [
	// Grammar errors
	{
		id: 'gram-001',
		category: 'grammar',
		expectedText: 'Yo estar muy feliz hoy',
		description: 'Incorrect verb conjugation (estar instead of estoy)',
		errorTypes: ['verb_conjugation']
	},
	{
		id: 'gram-002', 
		category: 'grammar',
		expectedText: 'Ella no sabe nada de nada',
		description: 'Double negative (grammatically incorrect but commonly used)',
		errorTypes: ['double_negative']
	},
	{
		id: 'gram-003',
		category: 'grammar',
		expectedText: 'Quiero que tu vienes conmigo',
		description: 'Incorrect subjunctive (vienes instead of vengas)',
		errorTypes: ['subjunctive_error']
	},
	{
		id: 'gram-004',
		category: 'grammar',
		expectedText: 'Los niños está jugando',
		description: 'Subject-verb disagreement (está instead of están)',
		errorTypes: ['subject_verb_disagreement']
	},

	// Pronunciation artifacts that might be auto-corrected
	{
		id: 'pron-001',
		category: 'pronunciation',
		expectedText: 'Eh... como se dice... eh... la palabra',
		description: 'Hesitation markers and fillers',
		errorTypes: ['hesitation_markers', 'fillers']
	},
	{
		id: 'pron-002',
		category: 'pronunciation',
		expectedText: 'Necesito ir al... al... al banco',
		description: 'Stuttering and repetition',
		errorTypes: ['stuttering', 'repetition']
	},
	{
		id: 'pron-003',
		category: 'pronunciation',
		expectedText: 'La computadora... computador... computadora',
		description: 'Self-correction attempts',
		errorTypes: ['self_correction']
	},

	// Vocabulary mistakes
	{
		id: 'vocab-001',
		category: 'vocabulary',
		expectedText: 'Estoy muy embarazada por la situación',
		description: 'False friend usage (embarazada = pregnant, not embarrassed)',
		errorTypes: ['false_friend']
	},
	{
		id: 'vocab-002',
		category: 'vocabulary',
		expectedText: 'Necesito realizar que tengo hambre',
		description: 'Anglicism (realizar instead of darme cuenta)',
		errorTypes: ['anglicism']
	},
	{
		id: 'vocab-003',
		category: 'vocabulary',
		expectedText: 'Voy a aplicar para el trabajo',
		description: 'Direct translation (aplicar instead of solicitar)',
		errorTypes: ['direct_translation']
	},

	// Mixed errors (complex cases)
	{
		id: 'mixed-001',
		category: 'mixed',
		expectedText: 'Eh... yo no... no puedo... como se dice... hacer esto',
		description: 'Multiple error types combined',
		errorTypes: ['hesitation_markers', 'double_negative', 'fillers']
	},
	{
		id: 'mixed-002',
		category: 'mixed',
		expectedText: 'Los estudiante... estudiantes está muy confundido',
		description: 'Grammar + self-correction + verb disagreement',
		errorTypes: ['self_correction', 'subject_verb_disagreement']
	},

	// Test Deepgram's handling of common Spanish phonetic challenges
	{
		id: 'phon-001',
		category: 'pronunciation',
		expectedText: 'La erre española es muy difícil para mi',
		description: 'Rolling R pronunciation issues',
		errorTypes: ['phonetic_difficulty']
	},
	{
		id: 'phon-002',
		category: 'pronunciation',
		expectedText: 'Dis... dislexia... di-sle-xi-a',
		description: 'Syllable breakdown for difficult words',
		errorTypes: ['syllable_breakdown']
	}
];

// Helper functions for cue-card management
export function getCueCardById(id: string): CueCard | undefined {
	return CUE_CARDS.find(card => card.id === id);
}

export function getCueCardsByCategory(category: CueCard['category']): CueCard[] {
	return CUE_CARDS.filter(card => card.category === category);
}

export function getRandomCueCard(): CueCard {
	return CUE_CARDS[Math.floor(Math.random() * CUE_CARDS.length)];
}

export function getCueCardsByErrorType(errorType: string): CueCard[] {
	return CUE_CARDS.filter(card => card.errorTypes.includes(errorType));
}
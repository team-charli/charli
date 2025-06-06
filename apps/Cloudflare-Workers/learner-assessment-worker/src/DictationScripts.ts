// apps/learner-assessment-worker/src/DictationScripts.ts
// 🔍 DICTATION SCRIPT SYSTEM: Test conversations for evaluating Deepgram verbatim accuracy

export interface CueCard {
	id: string;
	category: 'grammar' | 'pronunciation' | 'vocabulary' | 'mixed';
	expectedText: string;
	description: string;
	errorTypes: string[];
}

export interface DictationTurn {
	turnNumber: number;
	speaker: 'learner' | 'teacher';
	expectedText: string;
	description: string;
	errorTypes: string[];
}

export interface DictationScript {
	id: string;
	title: string;
	description: string;
	category: 'conversation' | 'extended_narrative';
	turns: DictationTurn[];
}


// 🔍 DICTATION SCRIPTS: Systematic testing based on Deepgram assessment document
// Tests 4 key areas: Tense Usage (SAFE), Vocabulary (SAFE), Grammar Structure (MOSTLY SAFE), Morphological (VULNERABLE)
export const DICTATION_SCRIPTS: DictationScript[] = [
	{
		id: 'morphological-test-001',
		title: 'CRITICAL: Morphological Error Preservation Test',
		description: 'Tests if Deepgram auto-corrects malformed verb conjugations that should be preserved for assessment',
		category: 'conversation',
		turns: [
			{
				turnNumber: 1,
				speaker: 'learner',
				expectedText: 'Hola, yo jugimos fútbol ayer con mis amigos',
				description: 'CRITICAL: Tests "jugimos" (malformed) vs "jugamos" (correct) - should NOT be auto-corrected',
				errorTypes: ['morphological_verb_error', 'malformed_conjugation']
			},
			{
				turnNumber: 2,
				speaker: 'teacher',
				expectedText: '¡Qué divertido! ¿Dónde jugaron?',
				description: 'Natural response that models correct conjugation',
				errorTypes: []
			},
			{
				turnNumber: 3,
				speaker: 'learner',
				expectedText: 'En el parque. Mis hermanos comiómos pizza después del partido',
				description: 'CRITICAL: Tests "comiómos" vs "comimos" - malformed verb ending preservation',
				errorTypes: ['morphological_verb_error', 'accent_placement_error']
			},
			{
				turnNumber: 4,
				speaker: 'teacher',
				expectedText: 'Perfecto, qué buena combinación - deporte y comida.',
				description: 'Continues conversation naturally',
				errorTypes: []
			},
			{
				turnNumber: 5,
				speaker: 'learner',
				expectedText: 'Sí, y después nosotros dormímos muy bien por la noche',
				description: 'CRITICAL: Tests "dormímos" vs "dormimos" - stress placement in morphology',
				errorTypes: ['morphological_verb_error', 'stress_placement_error']
			},
			{
				turnNumber: 6,
				speaker: 'teacher',
				expectedText: 'Claro, después de tanto ejercicio es normal tener sueño.',
				description: 'Supportive response maintaining conversation flow',
				errorTypes: []
			}
		]
	},
	{
		id: 'tense-vocabulary-test-002',
		title: 'SAFE ZONE: Tense Usage + Vocabulary Errors',
		description: 'Tests errors that should be PRESERVED (per assessment: zero impact expected)',
		category: 'conversation',
		turns: [
			{
				turnNumber: 1,
				speaker: 'learner',
				expectedText: 'He ido al supermercado ayer para comprar comida',
				description: 'SAFE: Wrong tense (present perfect vs preterite) - contextually inappropriate but grammatically valid',
				errorTypes: ['tense_usage_error', 'contextual_tense_mismatch']
			},
			{
				turnNumber: 2,
				speaker: 'teacher',
				expectedText: '¿Qué compraste? ¿Encontraste todo lo que necesitabas?',
				description: 'Models correct past tense usage',
				errorTypes: []
			},
			{
				turnNumber: 3,
				speaker: 'learner',
				expectedText: 'Estoy muy embarazada por la situación en la tienda, había muchas personas',
				description: 'SAFE: False cognate - "embarazada" (pregnant) used incorrectly for "embarrassed"',
				errorTypes: ['false_cognate', 'vocabulary_error']
			},
			{
				turnNumber: 4,
				speaker: 'teacher',
				expectedText: 'Ah, entiendo que te sentiste incómoda con tanta gente.',
				description: 'Acknowledges meaning while modeling correct vocabulary',
				errorTypes: []
			},
			{
				turnNumber: 5,
				speaker: 'learner',
				expectedText: 'Sí, y después intenté realizar que necesitaba hacer ejercicio',
				description: 'SAFE: Anglicism - "realizar" (to carry out) vs "darme cuenta" (to realize)',
				errorTypes: ['anglicism', 'vocabulary_error', 'direct_translation']
			},
			{
				turnNumber: 6,
				speaker: 'teacher',
				expectedText: 'Es bueno darse cuenta de la importancia del ejercicio.',
				description: 'Models correct usage of "darse cuenta"',
				errorTypes: []
			}
		]
	},
	{
		id: 'grammar-structure-test-003',
		title: 'MOSTLY SAFE: Grammar Structure Preservation',
		description: 'Tests structural errors that should survive transcription (per assessment: minimal impact)',
		category: 'conversation',
		turns: [
			{
				turnNumber: 1,
				speaker: 'learner',
				expectedText: 'La problema con mi carro es muy grande hoy',
				description: 'MOSTLY SAFE: Gender agreement error - "la problema" vs "el problema"',
				errorTypes: ['gender_agreement_error', 'article_mismatch']
			},
			{
				turnNumber: 2,
				speaker: 'teacher',
				expectedText: '¿Qué tipo de problema tiene el carro?',
				description: 'Models correct gender agreement',
				errorTypes: []
			},
			{
				turnNumber: 3,
				speaker: 'learner',
				expectedText: 'Los estudiantes está muy confundidos porque no entienden la lección',
				description: 'MOSTLY SAFE: Subject-verb disagreement - "estudiantes está" vs "estudiantes están"',
				errorTypes: ['subject_verb_disagreement', 'number_agreement_error']
			},
			{
				turnNumber: 4,
				speaker: 'teacher',
				expectedText: 'Es normal que los estudiantes tengan preguntas sobre temas difíciles.',
				description: 'Models correct subject-verb agreement',
				errorTypes: []
			},
			{
				turnNumber: 5,
				speaker: 'learner',
				expectedText: 'Lo vi a ella en la biblioteca leyendo un libro muy interesante',
				description: 'MOSTLY SAFE: Redundant object pronoun - "lo vi a ella" (doubled object)',
				errorTypes: ['pronoun_redundancy', 'object_doubling']
			},
			{
				turnNumber: 6,
				speaker: 'teacher',
				expectedText: 'Qué bueno que ella esté estudiando. ¿Sabes qué libro era?',
				description: 'Continues conversation while modeling correct pronoun usage',
				errorTypes: []
			}
		]
	},
	{
		id: 'comprehensive-test-004',
		title: 'COMPREHENSIVE: All Error Types Mixed',
		description: 'Mixed test combining all 4 categories to compare preservation rates',
		category: 'extended_narrative',
		turns: [
			{
				turnNumber: 1,
				speaker: 'learner',
				expectedText: 'Ayer yo comimos en un restaurante muy bueno con mi familia',
				description: 'CRITICAL: Morphological "comimos" + subject-verb "yo...comimos"',
				errorTypes: ['morphological_verb_error', 'subject_verb_disagreement']
			},
			{
				turnNumber: 2,
				speaker: 'teacher',
				expectedText: '¡Qué bien! ¿Cómo estuvo la comida?',
				description: 'Natural response',
				errorTypes: []
			},
			{
				turnNumber: 3,
				speaker: 'learner',
				expectedText: 'He pedido la paella porque siempre he querido probar la comida española ayer',
				description: 'SAFE: Tense usage error - present perfect with "ayer" (past time)',
				errorTypes: ['tense_usage_error', 'temporal_tense_mismatch']
			},
			{
				turnNumber: 4,
				speaker: 'teacher',
				expectedText: 'La paella es deliciosa. ¿Te gustó?',
				description: 'Continues conversation',
				errorTypes: []
			},
			{
				turnNumber: 5,
				speaker: 'learner',
				expectedText: 'Sí, pero estaba muy embarazada porque no sabía usar los tenedores correctamente',
				description: 'SAFE: False cognate "embarazada" for embarrassed',
				errorTypes: ['false_cognate', 'vocabulary_error']
			},
			{
				turnNumber: 6,
				speaker: 'teacher',
				expectedText: 'No te preocupes, es normal necesitar práctica con diferentes cubiertos.',
				description: 'Supportive response',
				errorTypes: []
			},
			{
				turnNumber: 7,
				speaker: 'learner',
				expectedText: 'Los camareros está muy amables y me ayudaron mucho durante la comida',
				description: 'MOSTLY SAFE: Subject-verb disagreement "camareros está"',
				errorTypes: ['subject_verb_disagreement', 'number_agreement_error']
			},
			{
				turnNumber: 8,
				speaker: 'teacher',
				expectedText: 'Qué maravilloso tener un servicio tan atento. Es importante sentirse cómodo.',
				description: 'Positive reinforcement',
				errorTypes: []
			}
		]
	},
	{
		id: 'morphological-stress-test-005',
		title: 'STRESS-TEST: Edge-Case Morphology & Accent Errors',
		description: 'Pushes Deepgram on accent-only malformations, rare conjugations, intra-word pauses, and rapid self-corrections.',
		category: 'conversation',
		turns: [
			{
				turnNumber: 1,
				speaker: 'learner',
				expectedText: 'Buenas tardes, ayer hubímos—digo, hubimos—terminado el proyecto',
				description: 'Accent-only malformed “hubímos” plus immediate self-correction; tests if interim catches both forms.',
				errorTypes: ['morphological_verb_error', 'accent_placement_error', 'self_correction']
			},
			{
				turnNumber: 2,
				speaker: 'teacher',
				expectedText: 'Entiendo, ¿cuánto tiempo les tomó?',
				description: 'Natural reply with correct preterite “tomó”',
				errorTypes: []
			},
			{
				turnNumber: 3,
				speaker: 'learner',
				expectedText: 'Uh… eh… andábam… andábamos muy cansados al final',
				description: 'In-word pause “andábam…” simulates hesitation splitting the malformed root.',
				errorTypes: ['morphological_verb_error', 'hesitation_split']
			},
			{
				turnNumber: 4,
				speaker: 'teacher',
				expectedText: 'Me imagino. ¿Descansaron después?',
				description: 'Keeps flow',
				errorTypes: []
			},
			{
				turnNumber: 5,
				speaker: 'learner',
				expectedText: 'Sí, pero mis amigos dijieron—perdón, dijeron—que aún faltaba algo',
				description: 'Non-standard “dijieron” plus self-correction; auto-correct prone because sound is close.',
				errorTypes: ['morphological_verb_error', 'self_correction']
			},
			{
				turnNumber: 6,
				speaker: 'teacher',
				expectedText: '¿Qué faltaba exactamente?',
				description: 'Probe',
				errorTypes: []
			},
			{
				turnNumber: 7,
				speaker: 'learner',
				expectedText: 'Vos podés creer que olvidé el archivo final en casa',
				description: 'Uses “vos podés” to test low-frequency pronoun + accent; Nova-2 sometimes normalises to “tú puedes”.',
				errorTypes: ['pronoun_variant', 'accent_placement_error']
			},
			{
				turnNumber: 8,
				speaker: 'teacher',
				expectedText: '¡Vaya! Eso pasa. ¿Lo enviaste luego?',
				description: 'Wrap-up',
				errorTypes: []
			}
		]
	}
];

// Helper functions for dictation scripts
export function getDictationScriptById(id: string): DictationScript | undefined {
	return DICTATION_SCRIPTS.find(script => script.id === id);
}

export function getDictationScriptsByCategory(category: DictationScript['category']): DictationScript[] {
	return DICTATION_SCRIPTS.filter(script => script.category === category);
}

export function getRandomDictationScript(): DictationScript {
	return DICTATION_SCRIPTS[Math.floor(Math.random() * DICTATION_SCRIPTS.length)];
}

// Get the default dictation script for QA mode
export function getDefaultQADictationScript(): DictationScript {
	return DICTATION_SCRIPTS[0]; // Use the first script as default
}

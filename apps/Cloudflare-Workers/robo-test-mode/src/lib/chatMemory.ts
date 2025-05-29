/**
 * Chat memory utilities for RoboTestDO conversation continuity
 */

export interface Msg {
	role: 'user' | 'assistant';
	content: string;
}

/**
 * Load conversation history from Durable Object storage
 */
export async function loadHistory(state: DurableObjectState): Promise<Msg[]> {
	return (await state.storage.get<Msg[]>('history')) ?? [];
}

/**
 * Save conversation history to Durable Object storage
 */
export async function saveHistory(state: DurableObjectState, history: Msg[]): Promise<void> {
	await state.storage.put('history', history);
}

/**
 * Trim conversation history to the most recent N messages
 * Keeps system context while respecting token limits
 */
export function trimHistory(history: Msg[], maxMessages = 30): Msg[] {
	if (history.length <= maxMessages) {
		return history;
	}
	return history.slice(-maxMessages);
}

/**
 * System prompt for conversation continuity
 */
export const SYSTEM_PROMPT = `Eres un hablante nativo de español de México ayudando a probar un sistema de reconocimiento de voz.

CONTEXTO: Tu interlocutor está probando la tecnología de procesamiento de pausas en el habla. Necesitas hacer preguntas que naturalmente requieran respuestas largas y contemplativas.

INSTRUCCIONES ESTRICTAS:
— Haz SOLO UNA pregunta profunda por turno que requiera reflexión
— SIEMPRE construye sobre las respuestas previas del usuario para crear continuidad conversacional
— Profundiza en temas específicos que el usuario mencione antes de cambiar de tema
— NO corrijas errores gramaticales (el sistema los detectará automáticamente)
— Mantén TUS respuestas cortas (1-2 frases)
— Haz preguntas que naturalmente causen pausas largas mientras el usuario piensa
— Acepta cualquier respuesta sin juzgar
— Si menciona "testing", confirma brevemente y haz otra pregunta reflexiva

ESTRATEGIA DE SEGUIMIENTO:
— Si mencionan algo específico (ej: "Mexicanos ganando $300 pesos/hora"), profundiza en esa idea
— Si hablan de desafíos, explora las emociones o decisiones detrás de esos momentos
— Si mencionan características técnicas, pregunta por el impacto en usuarios
— Si describen usuarios objetivo, explora motivaciones o validación del mercado

EJEMPLOS DE PREGUNTAS REFLEXIVAS:
— "¿Cuál ha sido el mayor desafío técnico en el sprint final de tu aplicación?"
— "¿Qué aspecto de tu app de idiomas te emociona más al lanzarla?"
— "¿Cómo ha influido vivir en México en el diseño de tu aplicación?"
— "¿Qué decisión de arquitectura fue la más difícil durante las 4,000 horas de desarrollo?"
— "¿Cuál fue el momento más frustrante de tu maratón de desarrollo solo?"
— "¿Qué funcionalidad de tu app crees que será más impactante para los usuarios?"
— "¿Cómo cambió tu enfoque de desarrollo entre el inicio y este sprint final?"
— "¿Qué aprendiste sobre ti mismo durante este largo ciclo de desarrollo?"
— "¿Cuál fue el momento en que supiste que tu idea de app realmente funcionaría?"

El objetivo es que el usuario pause y reflexione antes de responder extensamente.`;

/**
 * Build chat messages array for Llama-3 with system prompt + history
 */
export function buildChatMessages(history: Msg[]): Array<{ role: string; content: string }> {
	return [
		{ role: 'system', content: SYSTEM_PROMPT },
		...history.map((msg) => ({ role: msg.role, content: msg.content })),
	];
}
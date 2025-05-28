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
export const SYSTEM_PROMPT = `Eres un hablante nativo de español de Mexico.
Tu interlocutor es un estudiante de nivel intermedio que ha vivido en México.
— Responde en un tono amistoso y natural.
— NO corrijas errores; deja que pasen.
— Enfócate en preguntas sobre tres temas principales:
  1. Su experiencia viviendo en México (ciudades, cultura, diferencias culturales, luchas personales viviendo en México, impacto positivo en su vida)
  2. México en general (tradiciones, comida, historia, lugares)
  3. Su aplicación Charli (desarrollo, funcionalidades, experiencias construyéndola)
— Haz al menos una pregunta abierta en cada turno relacionada con estos temas.
— Mantén las respuestas cortas (1-3 frases).`;

/**
 * Build chat messages array for Llama-3 with system prompt + history
 */
export function buildChatMessages(history: Msg[]): Array<{ role: string; content: string }> {
	return [
		{ role: 'system', content: SYSTEM_PROMPT },
		...history.map((msg) => ({ role: msg.role, content: msg.content })),
	];
}
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
export const SYSTEM_PROMPT = `Eres "Robo-Teacher", un hablante nativo de español muy amigable.
• Solo saluda al inicio de la sesión.
• Basa cada respuesta en lo que dijo el alumno antes.
• Haz preguntas de seguimiento concretas.
• Mantén cada respuesta ≤ 20 palabras para que el TTS sea rápido.`;

/**
 * Build chat messages array for Llama-3 with system prompt + history
 */
export function buildChatMessages(history: Msg[]): Array<{ role: string; content: string }> {
	return [
		{ role: 'system', content: SYSTEM_PROMPT },
		...history.map((msg) => ({ role: msg.role, content: msg.content })),
	];
}
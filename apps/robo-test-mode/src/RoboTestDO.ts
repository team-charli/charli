// apps/robo-test-mode/src/RoboTestDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

export class RoboTestDO extends DurableObject<Env> {
	private app = new Hono();

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);

		this.app.post('/robo-teacher-reply', async (c) => {
			const { userText, roomId } = await c.req.json();

			// 🔁 Step 1: Generate Robo Text (LLM)
			const llamaRes = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
				messages: [
					{ role: 'system', content: 'You are a friendly native Spanish speaker. Keep your replies short and conversational.' },
					{ role: 'user', content: userText }
				],
				max_tokens: 100,
				temperature: 0.7,
			}) as { response: string };

			const aiText = llamaRes.response.trim();
			console.log('[RoboTestDO] LLM generated reply:', aiText);

			// 🔁 Step 2: TTS to MP3
			const ttsRes = await this.env.AI.run('@cf/myshell-ai/melotts', {
				prompt: aiText,
				lang: 'es'
			}) as { audio: string }; // base64 MP3

			const mp3Buffer = Uint8Array.from(atob(ttsRes.audio), c => c.charCodeAt(0));

			// 🔁 Step 3: Decode MP3 -> PCM
			const decoderEndpoint = 'http://<HETZNER_IP>:3000/decode';
			const form = new FormData();
			form.append('file', new Blob([mp3Buffer], { type: 'audio/mpeg' }), 'audio.mp3');

			const decodeRes = await fetch(decoderEndpoint, {
				method: 'POST',
				body: form,
			});

			if (!decodeRes.ok) {
				throw new Error(`[RoboTestDO] MP3 decoder failed: ${await decodeRes.text()}`);
			}

			const pcmBuffer = new Uint8Array(await decodeRes.arrayBuffer());

			// 🔁 Step 4: POST PCM chunks to learner-assessment-worker
			const chunkSize = 131072;
			for (let i = 0; i < pcmBuffer.length; i += chunkSize) {
				const chunk = pcmBuffer.slice(i, i + chunkSize);
				await fetch(`https://learner-assessment-worker.charli.chat/audio/${roomId}?peerId=simulated-teacher&role=teacher`, {
					method: 'POST',
					body: chunk,
				});
			}

			// ✨ Step 4.5: Broadcast PCM for real-time playback
			const pcmBase64 = btoa(String.fromCharCode(...pcmBuffer));

			const relayDO = this.env.MESSAGE_RELAY_DO.get(
				this.env.MESSAGE_RELAY_DO.idFromName(roomId)
			);

			await relayDO.fetch(`http://message-relay/broadcast/${roomId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'roboPcmBase64',
					pcmBase64,
				}),
			});

			// ✨ Step 5: Return normal JSON
			return c.json({
				responseText: aiText,
				pcmBase64,
			});
		});
	}

	async fetch(request: Request) {
		return this.app.fetch(request);
	}
}

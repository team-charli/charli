// apps/robo-test-mode/src/RoboTestDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

export class RoboTestDO extends DurableObject<Env> {
	private app = new Hono();

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);

		this.app.post('/generate-pcm-reply', async (c) => {
			const { userText } = await c.req.json();
			const pcmBuffer = await this.buildPcmReply(userText);
			return new Response(pcmBuffer, {
				headers: { 'Content-Type': 'application/octet-stream' }
			});
		});
	}

	async fetch(request: Request) {
		return this.app.fetch(request);
	}

	private async buildPcmReply(userText: string): Promise<Uint8Array> {
		const replyText = await this.generateRoboReplyText(userText);
		const mp3Audio = await this.convertTextToSpeech(replyText);
		const pcmAudio = await this.decodeMp3ToPcm(mp3Audio);
		return pcmAudio;
	}

	private async generateRoboReplyText(userText: string): Promise<string> {
		try {
			const llamaRes = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
				messages: [
					{ role: 'system', content: 'You are a friendly native Spanish speaker. Keep your replies short and conversational.' },
					{ role: 'user', content: userText }
				],
				max_tokens: 100,
				temperature: 0.7,
			}) as { response: string };

			const aiText = llamaRes.response.trim();
			console.log('[RoboTestDO] Generated reply text:', aiText);
			return aiText;
		} catch (err) {
			console.error('[RoboTestDO] Error generating reply text:', err);
			throw new Error('Failed to generate Robo reply text');
		}
	}

	private async convertTextToSpeech(text: string): Promise<Uint8Array> {
		try {
			const ttsRes = await this.env.AI.run('@cf/myshell-ai/melotts', {
				prompt: text,
				lang: 'es'
			}) as { audio: string };

			const mp3Buffer = Uint8Array.from(atob(ttsRes.audio), c => c.charCodeAt(0));
			return mp3Buffer;
		} catch (err) {
			console.error('[RoboTestDO] Error during TTS generation:', err);
			throw new Error('Failed to convert text to speech');
		}
	}

	private async decodeMp3ToPcm(mp3Buffer: Uint8Array): Promise<Uint8Array> {
		try {
			const form = new FormData();
			form.append('file', new Blob([mp3Buffer], { type: 'audio/mpeg' }), 'audio.mp3');

			const decodeRes = await fetch('https://mp3-to-pcm.charli.chat/decode', {
				method: 'POST',
				body: form,
			});

			if (!decodeRes.ok) {
				const errText = await decodeRes.text();
				console.error('[RoboTestDO] MP3 decode error response:', errText);
				throw new Error('MP3 decode HTTP failure');
			}

			const pcmBuffer = new Uint8Array(await decodeRes.arrayBuffer());
			return pcmBuffer;
		} catch (err) {
			console.error('[RoboTestDO] Error decoding MP3 to PCM:', err);
			throw new Error('Failed to decode MP3 to PCM');
		}
	}
}

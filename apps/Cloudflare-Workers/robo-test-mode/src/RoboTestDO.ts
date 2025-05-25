/* eslint-disable @typescript-eslint/ban-ts-comment */
import { DurableObject }          from 'cloudflare:workers';
import { Hono }                   from 'hono';
import { Env }                    from './env';

function cleanForEleven(text: string): string {
	// 1. collapse Windows / mac newlines → space
	let out = text.replace(/\r?\n+/g, " ");

	// 2. trim excess whitespace
	out = out.replace(/\s{2,}/g, " ").trim();

	// 3. ElevenLabs hard limit ≈ 2 500 chars per call
	return out.slice(0, 2500);
}

function u8ToBase64(u8: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
	return btoa(bin);
}


export class RoboTestDO extends DurableObject<Env> {
	private app = new Hono();

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);

		/* compatibility QA route ---------------------------------------- */
		this.app.post('/generate-pcm-reply', async c => {
			const { userText } = await c.req.json();
			const pcm = await this.buildPcmReply(userText);
			return new Response(pcm, { headers: { 'Content-Type': 'audio/wav' } });
		});

		/* main JSON API -------------------------------------------------- */
		this.app.post('/robo-teacher-reply', async c => {
			try {
				const { userText, roomId } = await c.req.json();

				/* 1 · generate Spanish sentence ----------------------------- */
				const replyText = await this.generateRoboReplyText(userText);

				/* 2 · TTS → MP3 bytes --------------------------------------- */
				const mp3Bytes  = await this.convertTextToSpeech(replyText);

				/* 3 · base-64 encode for transport -------------------------- */
				const mp3Base64 = u8ToBase64(mp3Bytes);

				console.log('[RoboTestDO] Reply for', roomId, '→', replyText);
				return c.json({ status: 'success', replyText, mp3Base64 });
			} catch (err) {
				console.error('[RoboTestDO] Error:', err);
				return c.json({ status: 'error', message: String(err) }, 500);
			}
		});
	}

	fetch(req: Request) { return this.app.fetch(req); }

	/* ───────────────── pipeline pieces ───────────────────────── */

	private async buildPcmReply(text: string) {
		const mp3 = await this.convertTextToSpeech(text);
		return this.decodeMp3ToPcm(mp3);        // legacy only
	}

	private async generateRoboReplyText(userText: string): Promise<string> {
		const { response } = await this.env.AI.run(
			'@cf/meta/llama-3.1-8b-instruct',
			{
				messages: [
					{ role: 'system',
						content: 'You are a friendly native Spanish speaker. ' +
							'Keep replies short and conversational.' },
					{ role: 'user', content: userText }
				],
				max_tokens : 100,
				temperature: 0.7
			}
		) as { response: string };

		return response.trim();
	}

	/** -------------------------------------------------------------------
 *  Spanish TTS - ElevenLabs Flash v2.5 (“es_mx_002”)
 *  - returns Uint8Array MP3 so the caller can base64-encode as today
 * ------------------------------------------------------------------ */
	private async convertTextToSpeech(text: string): Promise<Uint8Array> {
		const safePrompt = cleanForEleven(text);

		const VOICE_ID = "ay4iqk10DLwc8KGSrf2t";   // robo-teacher – es-MX female

		const res = await fetch(
			`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
			{
				method : "POST",
				headers: {
					"Content-Type": "application/json",
					"xi-api-key" : this.env.ELEVEN_API_KEY      // <<< new secret
				},
				body: JSON.stringify({
					text        : safePrompt,
					model_id    : "eleven_multilingual_v2",     // Flash v2.5
					output_format: "mp3_44100_128"
				})
			}
		);

		if (!res.ok) {
			const msg = await res.text();
			throw new Error(`ElevenLabs TTS error ${res.status}: ${msg}`);
		}

		/* mp3 stream → Uint8Array (same type your code already expects) */
		return new Uint8Array(await res.arrayBuffer());
	}

	/* legacy QA helper — remove if unused ----------------------------- */
	private async decodeMp3ToPcm(mp3: Uint8Array): Promise<Uint8Array> {
		const form = new FormData();
		form.append('file', new Blob([mp3], { type: 'audio/mpeg' }), 'audio.mp3');

		const r = await fetch('https://mp3-to-pcm.charli.chat/decode',
			{ method: 'POST', body: form });

		if (!r.ok) throw new Error(`MP3 decode failed (${r.status})`);
		return new Uint8Array(await r.arrayBuffer());
	}
}

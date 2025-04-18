// apps/learner-assessment-worker/src/LearnerAssessmentDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

interface TranscribedSegment {
	peerId: string;
	role: string;
	text: string;
	// start time in seconds offset from the first chunk's serverTime
	// If you want sub-second alignment, we store chunk timestamps in DO
	start: number;
}

export class LearnerAssessmentDO extends DurableObject<Env> {
	private app = new Hono();
	protected state: DurableObjectState;

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
		this.state = state;

		this.app.post('/audio/:roomId', async (c) => {
			const roomId = c.req.param('roomId');
			const action = c.req.query('action');
			if (action === 'end-session') {
				console.log('[LearnerAssessmentDO] End-session triggered');
				await this.transcribeAndDiarizeAll(roomId);
				return c.json({ status: 'transcription completed' });
			}

			const role = c.req.query('role') ?? 'unknown';
			const peerId = c.req.query('peerId') ?? 'unknown';
			const chunk = new Uint8Array(await c.req.arrayBuffer());
			if (chunk.length === 0) {
				return c.text('No audio data', 400);
			}
			console.log(`[LearnerAssessmentDO] Received PCM chunk from peerId=${peerId}, role=${role}, size=${chunk.length}`);

			if (chunk.length > 131072) {
				console.error(`[LearnerAssessmentDO] Chunk size ${chunk.length} > 131072`);
				return c.text('Chunk too large', 400);
			}

			const peerChunkCounterKey = `chunkCounter:${peerId}`;
			let chunkCounter = (await this.state.storage.get<number>(peerChunkCounterKey)) || 0;
			const pcmKey = `${roomId}/${peerId}/pcm/${chunkCounter}.pcm`;
			await this.env.AUDIO_BUCKET.put(pcmKey, chunk.buffer);
			const serverTimestamp = Date.now();
			await this.state.storage.put(`${pcmKey}:timestamp`, serverTimestamp);
			await this.state.storage.put(`${pcmKey}:role`, role);
			await this.state.storage.put(`${pcmKey}:peerId`, peerId);
			chunkCounter++;
			await this.state.storage.put(peerChunkCounterKey, chunkCounter);

			const batchSize = 87;
			const justStoredIndex = chunkCounter - 1;
			if (justStoredIndex % batchSize === batchSize - 1 || justStoredIndex === 0) {
				const startChunk = Math.floor(justStoredIndex / batchSize) * batchSize;
				const endChunk = justStoredIndex;
				try {
					const wavKey = await this.convertPcmBatchToWav(roomId, peerId, startChunk, endChunk);
					console.log(`[LearnerAssessmentDO] Generated partial WAV: ${wavKey}`);
					const wavKeysKey = `wavKeys:${peerId}`;
					const existingWavKeys = (await this.state.storage.get<string[]>(wavKeysKey)) || [];
					existingWavKeys.push(wavKey);
					await this.state.storage.put(wavKeysKey, existingWavKeys);
				} catch (err) {
					console.error(`[LearnerAssessmentDO] Partial conversion failed for peerId=${peerId}, ${startChunk}-${endChunk}`, err);
				}
			}

			return c.text('chunk received', 200);
		});
	}

	async fetch(request: Request) {
		return this.app.fetch(request);
	}

	private async transcribeAndDiarizeAll(roomId: string) {
		const counters = await this.state.storage.list<number>({ prefix: 'chunkCounter:' });
		const peerIds = Array.from(counters.keys()).map(k => k.replace('chunkCounter:', ''));
		if (peerIds.length === 0) {
			console.log('[LearnerAssessmentDO] No peers found, nothing to transcribe');
			await this.broadcastToRoom(roomId, 'transcription-complete', { text: '', scorecard: null });
			return;
		}

		const allPeerTranscripts: TranscribedSegment[] = [];
		for (const peerId of peerIds) {
			const chunkCounter = counters.get(`chunkCounter:${peerId}`) ?? 0;
			if (chunkCounter === 0) {
				console.log(`[LearnerAssessmentDO] Peer ${peerId} had zero chunks, skipping`);
				continue;
			}
			const lastFullBatchEnd = Math.floor((chunkCounter - 1) / 87) * 87 - 1;
			if (chunkCounter - 1 > lastFullBatchEnd) {
				const startChunk = lastFullBatchEnd + 1;
				const endChunk = chunkCounter - 1;
				try {
					const finalWavKey = await this.convertPcmBatchToWav(roomId, peerId, startChunk, endChunk);
					console.log(`[LearnerAssessmentDO] Final leftover WAV for peerId=${peerId}: ${finalWavKey}`);
					const wavKeysKey = `wavKeys:${peerId}`;
					const existingWavKeys = (await this.state.storage.get<string[]>(wavKeysKey)) || [];
					existingWavKeys.push(finalWavKey);
					await this.state.storage.put(wavKeysKey, existingWavKeys);
				} catch (err) {
					console.error(`[LearnerAssessmentDO] Final leftover batch conversion failed for peer ${peerId}`, err);
				}
			}

			const peerSegments = await this.transcribePeerWavs(roomId, peerId);
			allPeerTranscripts.push(...peerSegments);
		}

		const mergedText = await this.mergePeerTranscripts(allPeerTranscripts);
		console.log('[LearnerAssessmentDO] Merged transcript:\n', mergedText);

		// Generate scorecard for the learner
		const scorecard = await this.generateLearnerScorecard(roomId, allPeerTranscripts);
		console.log('[LearnerAssessmentDO] Generated scorecard:\n', JSON.stringify(scorecard, null, 2));

		// Store scorecard temporarily
		await this.state.storage.put(`scorecard:${roomId}`, scorecard);

		// Broadcast transcript and scorecard
		await this.broadcastToRoom(roomId, 'transcription-complete', { text: mergedText, scorecard });

		// Cleanup
		await this.cleanupAll(roomId, peerIds);
	}

	private async convertPcmBatchToWav(roomId: string, peerId: string, startChunk: number, endChunk: number) {
		const body = JSON.stringify({ roomId, startChunk, endChunk });
		const response = await this.env.PCM_TO_WAV_WORKER.fetch(`http://pcm-to-wav-worker/convert/${roomId}`, {
			method: 'POST',
			body
		});
		if (!response.ok) {
			const errText = await response.text();
			throw new Error(`PCM->WAV conversion error: ${errText}`);
		}
		return await response.text();
	}

	private async transcribePeerWavs(roomId: string, peerId: string): Promise<TranscribedSegment[]> {
		const wavKeysKey = `wavKeys:${peerId}`;
		const wavKeys = (await this.state.storage.get<string[]>(wavKeysKey)) || [];
		if (wavKeys.length === 0) {
			console.log(`[transcribePeerWavs] No wavKeys for peerId=${peerId}`);
			return [];
		}

		const role = await this.getPeerRole(roomId, peerId);
		const segments: TranscribedSegment[] = [];
		for (const wavKey of wavKeys) {
			const asrSegments = await this.runAsrOnWav(roomId, wavKey, peerId, role);
			segments.push(...asrSegments);
		}
		return segments;
	}

	private async getPeerRole(roomId: string, peerId: string): Promise<string> {
		const firstChunkKey = `${roomId}/${peerId}/pcm/0.pcm:role`;
		const role = (await this.state.storage.get<string>(firstChunkKey)) || "unknown";
		return role;
	}

	private async runAsrOnWav(roomId: string, wavKey: string, peerId: string, role: string): Promise<TranscribedSegment[]> {
		const wavObject = await this.env.AUDIO_BUCKET.get(wavKey);
		if (!wavObject) throw new Error(`WAV not found: ${wavKey}`);
		const wavData = await wavObject.arrayBuffer();

		const provider = this.env.TRANSCRIBE_PROVIDER || 'aws';
		const awsEndpoint = (provider === 'huggingface')
			? 'https://router.huggingface.co/hf-inference/models/facebook/wav2vec2-large-xlsr-53-spanish'
			: 'http://<aws-spot-ip>:5000/transcribe';

		const headers: Record<string, string> = { 'Content-Type': 'audio/wav' };
		if (provider === 'huggingface') {
			headers['Authorization'] = `Bearer ${this.env.LEARNER_ASSESSMENT_TRANSCRIBE_TOKEN}`;
		}

		const res = await fetch(awsEndpoint, { method: 'POST', headers, body: wavData });
		if (!res.ok) {
			const errorText = await res.text();
			throw new Error(`Transcription failed: ${errorText}`);
		}

		const json = await res.json<{
			text?: string;
			segments?: Array<{ start: number; end: number; text: string }>;
		}>();

		if (!json.segments || json.segments.length === 0) {
			const text = json.text || "";
			return [{ peerId, role, start: 0, text }];
		}

		return json.segments.map(s => ({
			peerId,
			role,
			start: s.start,
			text: s.text,
		}));
	}

	private async mergePeerTranscripts(allSegments: TranscribedSegment[]): Promise<string> {
		allSegments.sort((a, b) => a.start - b.start);
		const lines = allSegments.map(seg => {
			const time = seg.start.toFixed(2).padStart(5, '0');
			return `[${time}] ${seg.role}: "${seg.text}"`;
		});
		return lines.join('\n');
	}

	private async generateLearnerScorecard(roomId: string, segments: TranscribedSegment[]): Promise<Scorecard | null> {
		const learnerSegments = segments.filter(seg => seg.role === 'learner');
		if (learnerSegments.length === 0) {
			console.log('[generateLearnerScorecard] No learner segments found');
			return null;
		}

		const transcript = learnerSegments
		.map(seg => `[${seg.start.toFixed(2)}] ${seg.text}`)
		.join('\n');
		const prompt = `
You are a language learning assistant analyzing a learner's Spanish transcript. The transcript is derived from diarized ASR segments. Focus **only** on grammar and vocabulary errors. Do **not** evaluate pronunciation, intonation, or fluency.

---

### Scoring Criteria

1. conversationDifficulty (1–10): Evaluate based on lexical variety, topic complexity, and syntactic range.
2. languageAccuracy (0–100%): Deterministically calculate as:
- Count total utterances (each timestamped segment = 1 utterance).
- Count number of utterances containing at least one grammar or vocabulary error.
- Compute:

((total utterances – incorrect utterances) / total utterances) × 100

Round to nearest integer. If no utterances, return 0.
3. mistakes: For each utterance with errors, return:
- text: the original utterance (verbatim)
- correction: the corrected version
- type: one of the allowed error types below

---

### Allowed Error Types

Choose exactly one per mistake. If none apply, use: uncategorized

Conjugation errors must use the format:
Conjugation Error: <Tense>
Example: Conjugation Error: Future Perfect

The following are the valid types with examples:

${[
'present tense conjugation: Yo tener un coche → Yo tengo un coche',
'preterite tense conjugation: Ella hablió con él → Ella habló con él',
'imperfect tense conjugation: Nosotros iba al parque → Nosotros íbamos al parque',
'future tense conjugation: Mañana yo iré a comprar → Mañana iré a comprar',
'conditional tense conjugation: Yo comería si tenía hambre → Yo comería si tuviera hambre',

'present perfect tense conjugation: He visto la película ayer → Vi la película ayer',
'past perfect tense conjugation: Había hecho eso esta mañana → Hice eso esta mañana',
'future perfect tense conjugation: Habré terminado antes de llegar → Habré terminado antes de que llegues',
'conditional perfect tense conjugation: Habría ido si tenía tiempo → Habría ido si hubiera tenido tiempo',

'informal future construction (ir a + infinitive): Voy comer → Voy a comer',

'present subjunctive conjugation: Quiero que tú vas → Quiero que tú vayas',
'imperfect subjunctive conjugation: Si tendría dinero → Si tuviera dinero',
'present perfect subjunctive conjugation: Espero que has venido → Espero que hayas venido',

'imperative mood conjugation: Hablas tú → Habla tú',

'gender agreement: La problema es serio → El problema es serio',
'number agreement: Los casa son grandes → Las casas son grandes',
'subject-verb agreement: Ellos viene mañana → Ellos vienen mañana',

'incorrect article (definite/indefinite): Una agua fría → Un agua fría',

'direct object pronoun misuse: Lo vi a ella → La vi',
'indirect object pronoun misuse: Le dije a Juan el secreto → Se lo dije a Juan',
'omitted clitic pronoun: Voy a dar un regalo → Le voy a dar un regalo',

'reflexive pronoun misuse: Se ducho cada día → Me ducho cada día',

'para/por misuse: Gracias para todo → Gracias por todo',
'preposition misuse: Pensar en que vienes → Pensar que vienes',

'ser/estar misuse: Soy cansado → Estoy cansado',

'word order error: La casa blanca muy → La casa muy blanca',
'negation error: No tengo no nada → No tengo nada',

'vocabulary misuse: Estoy embarazada → Estoy avergonzado (if speaker is male)',
'false cognate: Realizar una tarea → Hacer una tarea',
'lexical calque: Casa de campo → Campo house (incorrect borrowing)',
'discourse connector misuse: Pero entonces sin embargo → Sin embargo',

'uncategorized: Error type unclear or not listed above'
].join('\n')}

---

### Output Format (JSON)

Return only valid JSON in this format:

{
"conversationDifficulty": number,
"languageAccuracy": number,
"mistakes": [
{ "text": string, "correction": string, "type": string }
]
}

---

Transcript:
${transcript}
`;

		try {
			const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
				messages: [
					{ role: 'system', content: 'You are a language learning assistant.' },
					{ role: 'user', content: prompt }
				],
				max_tokens: 1000,
				response_format: { type: "json_object" },
				temperature: 0.1 // Minimize variability

			}) as { response: string };

			const scorecard: Scorecard = JSON.parse(response.response);
			if (
				!scorecard.conversationDifficulty ||
					!scorecard.languageAccuracy ||
					!Array.isArray(scorecard.mistakes)
			) {
				throw new Error('Invalid scorecard format');
			}

			// Validate languageAccuracy to ensure it matches the formula
			const totalUtterances = learnerSegments.length;
			const incorrectUtterances = scorecard.mistakes.length;
			const expectedAccuracy = totalUtterances === 0 ? 0 : Math.round(((totalUtterances - incorrectUtterances) / totalUtterances) * 100);
			if (scorecard.languageAccuracy !== expectedAccuracy) {
				console.warn(`[generateLearnerScorecard] Adjusting languageAccuracy from ${scorecard.languageAccuracy} to ${expectedAccuracy}`);
				scorecard.languageAccuracy = expectedAccuracy;
			}

			return scorecard;
		} catch (err) {
			console.error('[generateLearnerScorecard] Failed to generate scorecard:', err);
			return null;
		}
	}

	private async cleanupAll(roomId: string, peerIds: string[]) {
		for (const peerId of peerIds) {
			const chunkCounter = (await this.state.storage.get<number>(`chunkCounter:${peerId}`)) || 0;
			const wavKeysKey = `wavKeys:${peerId}`;
			let wavKeys = (await this.state.storage.get<string[]>(wavKeysKey)) || [];
			let finalWavKey: string | undefined;
			if (wavKeys.length > 0) {
				finalWavKey = wavKeys.pop();
			}

			for (const wavKey of wavKeys) {
				await this.env.AUDIO_BUCKET.delete(wavKey);
			}

			for (let i = 0; i < chunkCounter; i++) {
				const pcmPath = `${roomId}/${peerId}/pcm/${i}.pcm`;
				await this.env.AUDIO_BUCKET.delete(pcmPath);
			}

			if (finalWavKey) {
				console.log(`[LearnerAssessmentDO] Preserved final WAV for peer=${peerId}: ${finalWavKey}`);
			}
		}

		await this.state.storage.deleteAll();
	}

	private async broadcastToRoom(roomId: string, type: string, data: any) {
		const relayDO = this.env.MESSAGE_RELAY_DO.get(
			this.env.MESSAGE_RELAY_DO.idFromName(roomId)
		);
		await relayDO.fetch(`http://relay/broadcast/${roomId}`, {
			method: 'POST',
			body: JSON.stringify({ type, data }),
		});
	}
}

export interface Scorecard {
	conversationDifficulty: number; // 1-10
	languageAccuracy: number; // 0-100%
	mistakes: Array<{
		text: string; // Incorrect utterance
		correction: string; // Corrected version
		type: string; // e.g., "grammar", "pronunciation", "vocabulary"
	}>;
}

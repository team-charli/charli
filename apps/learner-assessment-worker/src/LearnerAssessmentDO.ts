// apps/learner-assessment-worker/src/LearnerAssessmentDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
			const sessionId = c.req.param('sessionId');
			const learnerId = c.req.param('learnerId');

			if (sessionId && learnerId) {
				await this.state.storage.put('sessionId', Number(sessionId));
				await this.state.storage.put('learnerId', Number(learnerId));
			}
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

		const learnerSegments = allPeerTranscripts.filter(seg => seg.role === 'learner');


		// Only send the (start, text) fields to ScorecardOrchestratorDO
		const simplifiedLearnerSegments = learnerSegments.map(seg => ({
			start: seg.start,
			text: seg.text,
		}));

		const session_id = await this.state.storage.get<number>('sessionId');
		const learner_id = await this.state.storage.get<number>('learnerId');
		if (!session_id || !learner_id) {
			throw new Error('Missing sessionId or learnerId in storage.');
		}

		const orchestratorDO = this.env.SCORECARD_ORCHESTRATOR_DO.get(this.env.SCORECARD_ORCHESTRATOR_DO.idFromName(roomId));
		const res = await orchestratorDO.fetch(`http://scorecard-orchestrator/scorecard/${roomId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				learnerSegments: simplifiedLearnerSegments,
				session_id,
				learner_id
			})
		});

		const { scorecard } = await res.json() as any;
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


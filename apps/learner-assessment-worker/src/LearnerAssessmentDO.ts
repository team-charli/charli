// apps/learner-assessment-worker/src/LearnerAssessmentDO.ts

import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

interface TranscribedSegment {
	peerId: string;
	role: string;
	text: string;
	start: number;
}

export class LearnerAssessmentDO extends DurableObject<Env> {
	private app = new Hono();
	protected state: DurableObjectState;
	private learnerDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private currentUtteranceChunks: Uint8Array[] = [];

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
			const roboMode = c.req.query('roboMode') === 'true';
			const chunk = new Uint8Array(await c.req.arrayBuffer());
			if (chunk.length === 0) return c.text('No audio data', 400);
			if (chunk.length > 131072) {
				console.error(`[LearnerAssessmentDO] Chunk size ${chunk.length} > 131072`);
				return c.text('Chunk too large', 400);
			}

			console.log(`[LearnerAssessmentDO] Received PCM chunk from peerId=${peerId}, role=${role}, size=${chunk.length}`);

			if (role === 'learner') {
				await this.handleFirstLearnerChunk(peerId, roboMode);
			}

			if (!roboMode) {
				await this.handleStandardLearnerChunk(roomId, peerId, role, chunk);
			} else {
				await this.handleRoboModeLearnerChunk(roomId, peerId, role, chunk);
			}

			return c.text('chunk received', 200);
		});
	}

	async fetch(request: Request) {
		return this.app.fetch(request);
	}

	private async handleFirstLearnerChunk(peerId: string, roboMode: boolean) {
		const peerChunkCounterKey = `chunkCounter:${peerId}`;
		const chunkCounter = (await this.state.storage.get<number>(peerChunkCounterKey)) || 0;

		if (chunkCounter === 0) {
			const alreadyInitialized = await this.state.storage.get<boolean>('roboInitialized');
			if (!alreadyInitialized) {
				await this.state.storage.put('roboMode', roboMode);
				await this.state.storage.put('roboInitialized', true);
			}
		}
	}

	private async handleStandardLearnerChunk(roomId: string, peerId: string, role: string, chunk: Uint8Array) {
		await this.saveLearnerChunk(roomId, peerId, role, chunk);
	}

	private async handleRoboModeLearnerChunk(roomId: string, peerId: string, role: string, chunk: Uint8Array) {
		await this.saveLearnerChunk(roomId, peerId, role, chunk);

		// ✅ Append chunk to current utterance buffer
		this.currentUtteranceChunks.push(chunk);

		// ✅ Reset the 4000ms debounce timer
		if (this.learnerDebounceTimer) clearTimeout(this.learnerDebounceTimer);

		this.learnerDebounceTimer = setTimeout(async () => {
			console.log('[LearnerAssessmentDO] Detected learner silence — triggering Robo reply.');

			try {
				const isRoboMode = await this.state.storage.get<boolean>('roboMode');
				if (isRoboMode && this.currentUtteranceChunks.length > 0) {
					const utteranceBuffer = this.concatChunks(this.currentUtteranceChunks);

					// 🧠 Transcribe the full utterance
					const learnerText = await this.transcribeLearnerUtterance(utteranceBuffer);

					if (learnerText) {
						const roboDO = this.env.ROBO_TEST_DO.get(this.env.ROBO_TEST_DO.idFromName(roomId));
						await roboDO.fetch(`http://robo-test-mode/robo-teacher-reply`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ userText: learnerText, roomId }),
						});
						console.log('[LearnerAssessmentDO] Robo reply triggered with learner utterance.');
					}
				}
			} catch (err) {
				console.error('[LearnerAssessmentDO] Error triggering Robo reply:', err);
			} finally {
				// ✅ Always clear the buffer after a turn
				this.currentUtteranceChunks = [];
			}
		}, 4000);
	}

	private concatChunks(chunks: Uint8Array[]): Uint8Array {
		const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
		const result = new Uint8Array(totalLength);
		let offset = 0;
		for (const chunk of chunks) {
			result.set(chunk, offset);
			offset += chunk.length;
		}
		return result;
	}

	private async transcribeLearnerUtterance(utteranceBuffer: Uint8Array): Promise<string> {
		try {
			const res = await fetch('http://<your-fast-asr-endpoint>', {
				method: 'POST',
				headers: { 'Content-Type': 'audio/pcm' },
				body: utteranceBuffer
			});

			if (!res.ok) {
				console.error('[LearnerAssessmentDO] Fast ASR service error:', await res.text());
				return '';
			}

			const { text } = await res.json<{ text: string }>();
			console.log('[LearnerAssessmentDO] Full learner utterance transcript:', text);
			return text || '';
		} catch (err) {
			console.error('[LearnerAssessmentDO] Error during utterance transcription:', err);
			return '';
		}
	}

	private async saveLearnerChunk(roomId: string, peerId: string, role: string, chunk: Uint8Array) {
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
		// const scorecard = await this.generateLearnerScorecard(roomId, allPeerTranscripts);
		// console.log('[LearnerAssessmentDO] Generated scorecard:\n', JSON.stringify(scorecard, null, 2));

		// const session = await this.fetchSessionByRoomId(roomId); // implement this separately
		// if (scorecard) {
		// 	const enrichedMistakes = await this.enrichMistakesWithFingerprints(scorecard.mistakes);
		// 	await this.persistScorecardToSupabase(session.session_id, session.learner_id, {
		// 		...scorecard,
		// 		mistakes: enrichedMistakes
		// 	});
		// }

		// Store scorecard temporarily
		// await this.state.storage.put(`scorecard:${roomId}`, scorecard);

		// Broadcast transcript and scorecard
		// await this.broadcastToRoom(roomId, 'transcription-complete', { text: mergedText, scorecard });

		// Cleanup
		await this.cleanupAll(roomId, peerIds);
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

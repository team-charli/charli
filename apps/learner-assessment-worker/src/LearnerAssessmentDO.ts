// apps/learner-assessment-worker/src/LearnerAssessmentDO.ts
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { Env } from './env';

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
				await this.transcribeAllChunks(roomId);
				return c.json({ status: 'transcription completed' });
			}

			const chunk = new Uint8Array(await c.req.arrayBuffer());
			console.log(`[LearnerAssessmentDO] Received PCM chunk. Size: ${chunk.length} bytes`);
			console.log(
				`[LearnerAssessmentDO] First 10 bytes:`,
				Array.from(chunk.slice(0, 10))
			);

			if (chunk.length > 131072) {
				console.error(
					`[LearnerAssessmentDO] Chunk size ${chunk.length} exceeds 131072-byte limit`
				);
				return c.text('Chunk too large', 400);
			}

			const chunkCounter = (await this.state.storage.get<number>('chunkCounter')) || 0;
			const pcmKey = `${roomId}/pcm/${chunkCounter}.pcm`;
			await this.env.AUDIO_BUCKET.put(pcmKey, chunk.buffer);
			await this.state.storage.put('chunkCounter', chunkCounter + 1);

			const batchSize = 87;
			if (chunkCounter % batchSize === batchSize - 1 || chunkCounter === 0) {
				// Generate WAV for the previous batch (or first chunk)
				const startChunk = Math.floor(chunkCounter / batchSize) * batchSize;
				const endChunk = chunkCounter;
				try {
					const response = await this.env.PCM_TO_WAV_WORKER.fetch(
						`http://pcm-to-wav-worker/convert/${roomId}`,
						{
							method: 'POST',
							body: JSON.stringify({ roomId, startChunk, endChunk }),
						}
					);
					if (!response.ok) throw new Error('Conversion failed');
					const wavKey = await response.text();
					console.log(`[LearnerAssessmentDO] Generated WAV: ${wavKey}`);

					// NEW: Store the generated wavKey so it can be tracked and cleaned up later.
					const existingWavKeys = (await this.state.storage.get<string[]>('wavKeys')) || [];
					existingWavKeys.push(wavKey);
					await this.state.storage.put('wavKeys', existingWavKeys);
				} catch (err) {
					console.error(
						`[LearnerAssessmentDO] Batch conversion failed for ${startChunk}-${endChunk}:`,
						err
					);
				}
			}

			return c.text('chunk received', 200);
		});
	}

	async fetch(request: Request) {
		return this.app.fetch(request);
	}

	private async transcribeAllChunks(roomId: string) {
		const chunkCounter = (await this.state.storage.get<number>('chunkCounter')) || 0;
		// Retrieve stored WAV keys from DO storage
		let wavKeys = (await this.state.storage.get<string[]>('wavKeys')) || [];

		if (chunkCounter > 0) {
			const batchSize = 87;
			// Generate WAV for any remaining partial batch
			const lastFullBatchEnd = Math.floor((chunkCounter - 1) / batchSize) * batchSize - 1;
			if (chunkCounter - 1 > lastFullBatchEnd) {
				const startChunk = lastFullBatchEnd + 1;
				const endChunk = chunkCounter - 1;
				try {
					const response = await this.env.PCM_TO_WAV_WORKER.fetch(
						`http://pcm-to-wav-worker/convert/${roomId}`,
						{
							method: 'POST',
							body: JSON.stringify({ roomId, startChunk, endChunk }),
						}
					);
					if (!response.ok) throw new Error('Conversion failed');
					const finalWavKey = await response.text();
					wavKeys.push(finalWavKey);
					console.log(`[LearnerAssessmentDO] Generated final WAV: ${finalWavKey}`);
				} catch (err) {
					console.error(
						`[LearnerAssessmentDO] Final batch conversion failed for ${startChunk}-${endChunk}:`,
						err
					);
				}
			}
		}

		if (wavKeys.length === 0) {
			console.log('[LearnerAssessmentDO] No WAVs to transcribe');
			await this.broadcastToRoom(roomId, 'transcription-complete', { text: '' });
		} else {
			console.log(
				`[LearnerAssessmentDO] Transcribing ${wavKeys.length} WAV batches: ${JSON.stringify(
					wavKeys
				)}`
			);
			const transcriptions: string[] = [];
			try {
				const provider = this.env.TRANSCRIBE_PROVIDER || 'aws';
				const awsEndpoint =
					provider === 'huggingface'
						? 'https://router.huggingface.co/hf-inference/models/facebook/wav2vec2-large-xlsr-53-spanish'
						: 'http://<aws-spot-ip>:5000/transcribe';

				for (const wavKey of wavKeys) {
					const wavObject = await this.env.AUDIO_BUCKET.get(wavKey);
					if (!wavObject) throw new Error(`WAV not found: ${wavKey}`);
					const wavData = await wavObject.arrayBuffer();

					const headers: Record<string, string> = { 'Content-Type': 'audio/wav' };
					if (provider === 'huggingface') {
						headers['Authorization'] = `Bearer ${this.env.LEARNER_ASSESSMENT_TRANSCRIBE_TOKEN}`;
					}

					const res = await fetch(awsEndpoint, {
						method: 'POST',
						headers,
						body: wavData,
					});

					if (!res.ok) {
						const errorText = await res.text();
						throw new Error(`Transcription failed: ${errorText}`);
					}

					const responseData = await res.json();
					const text = responseData.text || '';
					transcriptions.push(text);
				}

				const fullTranscript = transcriptions.join(' ');
				console.log('[LearnerAssessmentDO] Full transcript:', fullTranscript);
				await this.broadcastToRoom(roomId, 'transcription-complete', { text: fullTranscript });
			} catch (err) {
				console.error('[LearnerAssessmentDO] Transcription error:', err);
				await this.broadcastToRoom(roomId, 'transcription-error', { error: err.message });
			}
		}

		// Cleanup:
		// 1) Clear storage so the next run starts fresh.
		await this.state.storage.deleteAll();

		// 2) Remove the last (final) WAV key from the list so it is preserved.
		let finalWavKey: string | undefined;
		if (wavKeys.length > 0) {
			finalWavKey = wavKeys.pop();
		}

		// 3) Delete all other generated WAV files.
		for (const wavKey of wavKeys) {
			await this.env.AUDIO_BUCKET.delete(wavKey);
		}

		// 4) Delete the original PCM files.
		for (let i = 0; i < chunkCounter; i++) {
			await this.env.AUDIO_BUCKET.delete(`${roomId}/pcm/${i}.pcm`);
		}

		if (finalWavKey) {
			console.log('[LearnerAssessmentDO] Preserved final WAV:', finalWavKey);
		}
	}

	private async broadcastToRoom(roomId: string, type: string, data: any) {
		const relayDO = this.env.MESSAGE_RELAY_DO.get(this.env.MESSAGE_RELAY_DO.idFromName(roomId));
		await relayDO.fetch(`http://relay/broadcast/${roomId}`, {
			method: 'POST',
			body: JSON.stringify({ type, data }),
		});
	}
}

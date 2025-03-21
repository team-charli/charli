import { Hono } from 'hono';

export interface Env {}

const app = new Hono<Env>();

// Endpoint for converting Opus to WAV
app.post('/convert', async (c) => {
	const opusData = new Uint8Array(await c.req.arrayBuffer());

	// Dynamically import the WASM converter module
	const { opus_to_wav } = await import('../public/audio_converter.js');
	const wavData = opus_to_wav(opusData);

	return new Response(wavData, {
		headers: {
			'Content-Type': 'audio/wav',
			'Content-Disposition': 'attachment; filename="output.wav"',
		},
	});
});

// Default handler (optional)
app.get('/', (c) => c.text('Opus-to-WAV Worker is running!'));

export default app;

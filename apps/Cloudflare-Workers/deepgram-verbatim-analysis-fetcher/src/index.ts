import { Hono } from 'hono'
import { Env } from './env'

const app = new Hono<{ Bindings: Env }>()

// GET /latest - Returns latest analysis report as markdown
app.get('/latest', async (c) => {
	try {
		console.log('[ANALYSIS-FETCHER] Fetching latest analysis report from R2');
		
		// List all objects in the bucket to find the latest one
		const listed = await c.env.VERBATIM_REPORTS_BUCKET.list({
			prefix: 'verbatim-analysis-'
		});
		
		if (!listed.objects || listed.objects.length === 0) {
			return c.text('No analysis reports found', 404);
		}
		
		// Sort by uploaded timestamp to get the latest
		const latestObject = listed.objects.sort((a, b) => 
			new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime()
		)[0];
		
		console.log(`[ANALYSIS-FETCHER] Found latest report: ${latestObject.key}`);
		
		// Fetch the actual content
		const object = await c.env.VERBATIM_REPORTS_BUCKET.get(latestObject.key);
		
		if (!object) {
			return c.text('Report not found', 404);
		}
		
		const content = await object.text();
		
		return new Response(content, {
			headers: {
				'Content-Type': 'text/markdown',
				'Content-Length': content.length.toString(),
				'X-Report-Name': latestObject.key,
				'X-Report-Size': latestObject.size.toString(),
				'X-Report-Uploaded': latestObject.uploaded
			}
		});
		
	} catch (error) {
		console.error('[ANALYSIS-FETCHER] Error fetching latest report:', error);
		return c.text('Internal server error', 500);
	}
});

// GET /list - Returns list of available reports
app.get('/list', async (c) => {
	try {
		console.log('[ANALYSIS-FETCHER] Listing all analysis reports');
		
		const listed = await c.env.VERBATIM_REPORTS_BUCKET.list({
			prefix: 'verbatim-analysis-'
		});
		
		if (!listed.objects || listed.objects.length === 0) {
			return c.json({ reports: [], total: 0 });
		}
		
		// Sort by uploaded timestamp (newest first)
		const sortedObjects = listed.objects.sort((a, b) => 
			new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime()
		);
		
		const reports = sortedObjects.map(obj => ({
			key: obj.key,
			size: obj.size,
			uploaded: obj.uploaded,
			sessionId: obj.customMetadata?.sessionId,
			roomId: obj.customMetadata?.roomId,
			generatedAt: obj.customMetadata?.generatedAt,
			cueCardId: obj.customMetadata?.cueCardId,
			transcriptCount: obj.customMetadata?.transcriptCount
		}));
		
		return c.json({
			reports,
			total: reports.length,
			latest: reports[0]?.key
		});
		
	} catch (error) {
		console.error('[ANALYSIS-FETCHER] Error listing reports:', error);
		return c.text('Internal server error', 500);
	}
});

// GET /report/:key - Returns specific report by key
app.get('/report/:key', async (c) => {
	try {
		const key = c.req.param('key');
		console.log(`[ANALYSIS-FETCHER] Fetching specific report: ${key}`);
		
		const object = await c.env.VERBATIM_REPORTS_BUCKET.get(key);
		
		if (!object) {
			return c.text('Report not found', 404);
		}
		
		const content = await object.text();
		
		return new Response(content, {
			headers: {
				'Content-Type': 'text/markdown',
				'Content-Length': content.length.toString(),
				'X-Report-Name': key,
				'X-Report-Size': object.size?.toString() || 'unknown',
				'X-Report-Uploaded': object.uploaded || 'unknown'
			}
		});
		
	} catch (error) {
		console.error('[ANALYSIS-FETCHER] Error fetching report:', error);
		return c.text('Internal server error', 500);
	}
});

// Root endpoint
app.get('/', async (c) => {
	return c.json({
		service: 'Deepgram Verbatim Analysis Fetcher',
		endpoints: {
			'/latest': 'Get latest analysis report (markdown)',
			'/list': 'List all available reports (json)',
			'/report/:key': 'Get specific report by key (markdown)'
		}
	});
});

export default app

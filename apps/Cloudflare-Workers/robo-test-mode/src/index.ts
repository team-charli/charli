import { Hono } from 'hono';
import { Env } from './env';
import { RoboTestDO } from './RoboTestDO';

const app = new Hono<{ Bindings: Env }>();
// Route requests to RoboTestDO
app.post('/robo-teacher-reply', async (c) => {
	// Clone request to read body without consuming it
	const clonedReq = c.req.raw.clone();
	const { roomId } = await clonedReq.json();
	const roboTestDO = c.env.ROBO_TEST_DO.get(
		c.env.ROBO_TEST_DO.idFromName(roomId || 'robo-session')
	)
	// Forward the original request to the DO
	return roboTestDO.fetch(c.req.raw)
});
app.get('/', (c) => c.text('Robo Test Mode Ready'));

export default app;
export { RoboTestDO };
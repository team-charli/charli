import { Hono } from 'hono';
import { Env } from './env';
import { RoboTestDO } from './RoboTestDO';

const app = new Hono<{ Bindings: Env }>();
// Route requests to RoboTestDO
app.post('/robo-teacher-reply', (c) => {
	// Use a default room ID since this is called via service binding
	const roomId = 'robo-session'
	const roboTestDO = c.env.ROBO_TEST_DO.get(
		c.env.ROBO_TEST_DO.idFromName(roomId)
	)
	return roboTestDO.fetch(c.req.raw)
});
app.get('/', (c) => c.text('Robo Test Mode Ready'));

export default app;
export { RoboTestDO };
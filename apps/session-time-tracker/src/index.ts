import { Hono, Env } from 'hono';

// Extend the Env type to include your environment variables
interface CustomContext extends Env {
  TIMER_OBJECT: DurableObjectNamespace;
  SESSION_STATE: DurableObjectNamespace;
}

const app = new Hono<CustomContext>();

// Define route for submitting signature via POST
app.post('/submitSignature', async (c) => {
  if (c.env && c.env.SESSION_STATE) {
    const sessionStateId = (c.env.SESSION_STATE as DurableObjectNamespace).idFromName("uniqueSessionName");
    const sessionStateStub = (c.env.SESSION_STATE as DurableObjectNamespace).get(sessionStateId);
    return await sessionStateStub.fetch(c.req.raw);
  }
  return c.text("SESSION_STATE not found in environment", 500);
});

// Define route for WebSocket upgrade requests to the TimerObject
app.get('/timer', async (c) => {
  if (c.req.header('Upgrade') === 'websocket') {
    if (c.env && c.env.TIMER_OBJECT) {
      const id = (c.env.TIMER_OBJECT as DurableObjectNamespace).idFromName("uniqueTimerName");
      const timerStub = (c.env.TIMER_OBJECT as DurableObjectNamespace).get(id);
      return await timerStub.fetch(c.req.raw);
    }
    return c.text("TIMER_OBJECT not found in environment", 500);
  }
  return c.text("Invalid request", 400);
});

export default {
  fetch: app.fetch,
};

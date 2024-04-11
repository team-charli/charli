import { Hono, Env } from 'hono';
export { TimerObject } from './timerObject';
export { SessionState } from './sessionState';
export { DisconnectionManager } from './disconnectionManager';
interface CustomContext extends Env {
  TIMER_OBJECT: DurableObjectNamespace;
  SESSION_STATE: DurableObjectNamespace;
}


export const app = new Hono<CustomContext>();

app.post('/submitSignature', async (c) => {
  if (c.env && c.env.SESSION_STATE) {
    const sessionStateId = (c.env.SESSION_STATE as DurableObjectNamespace).idFromName("uniqueSessionName");
    const sessionStateStub = (c.env.SESSION_STATE as DurableObjectNamespace).get(sessionStateId);
    return await sessionStateStub.fetch(c.req.raw);
  }
  return c.text("SESSION_STATE not found in environment", 500);
});

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
;
export default {
  fetch: app.fetch,
};

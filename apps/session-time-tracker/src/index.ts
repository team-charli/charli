import { Hono, Env } from 'hono';
export const app = new Hono<CustomContext>();

app.get('/connect', async (c) => {
  if (c.req.header('Upgrade') === 'websocket') {
    if (c.env && c.env.CONNECTION_MANAGER) {
      const sessionId = c.req.query('sessionId');
      if (!sessionId) {
        return c.text("Session ID is required", 400);
      }
      const connectionManagerId = (c.env.CONNECTION_MANAGER as DurableObjectNamespace).idFromName(sessionId);
      const connectionManagerStub = (c.env.CONNECTION_MANAGER as DurableObjectNamespace).get(connectionManagerId);
      return await connectionManagerStub.fetch(c.req.raw);
    }
    return c.text("CONNECTION_MANAGER not found in environment", 500);
  }
  return c.text("Invalid request", 400);
});

export default {
  fetch: app.fetch,
};
interface CustomContext extends Env {
  CONNECTION_MANAGER: DurableObjectNamespace;
}


//index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebhookReceiver } from "@huddle01/server-sdk/webhooks";
import { ConnectionManager } from './connectionManager';
import {SessionManager} from './sessionManager';
import { SessionTimer } from './sessionTimer';
import { MessageRelay} from './messageRelay';

// Define environment type for the main worker
const app = new Hono<Env>();

// Session initialization endpoint
app.post('/init', async (c) => {
  try {
    const data = await c.req.json();
    const { clientSideRoomId, sessionDuration } = data;

    const sessionManager = c.env.SESSION_MANAGER.get(
      c.env.SESSION_MANAGER.idFromName(clientSideRoomId)
    );

    const response = await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    // If session init successful, set up WebSocket connection
    if (response.ok) {
      const messageRelay = c.env.MESSAGE_RELAY.get(
        c.env.MESSAGE_RELAY.idFromName(clientSideRoomId)
      );

      await messageRelay.fetch('http://message-relay/connect/' + clientSideRoomId, {
        method: 'GET'
      });
    }
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
    });
  } catch (error) {
    if (error.message === "User address doesn't match teacher or learner address") {
      return c.json({
        status: 'error',
        message: error.message
      }, 403);
    }
    throw error;
  }
});

// Webhook handler
app.post('/webhook', async (c) => {
  const signatureHeader = c.req.header("huddle01-signature");
  if (!signatureHeader) {
    return c.text("Missing signature", 401);
  }

  const receiver = new WebhookReceiver({ apiKey: c.env.HUDDLE_API_KEY });
  const data = await c.req.text();

  try {
    const event = receiver.receive(data, signatureHeader);
    let roomId: string | undefined;

    if (['meeting:started', 'meeting:ended', 'peer:joined', 'peer:left'].includes(event.event)) {
      const typedData = receiver.createTypedWebhookData(event.event, event.payload);
      roomId = (typedData.data as { roomId: string }).roomId;
    } else {
      return c.json({
        status: 'error',
        message: 'Unsupported event type'
      }, 400);
    }

    if (roomId) {
      const sessionManager = c.env.SESSION_MANAGER.get(
        c.env.SESSION_MANAGER.idFromName(roomId)
      );

      await sessionManager.fetch('http://session-manager/webhook', {
        method: 'POST',
        body: JSON.stringify({ event })
      });
    }

    return c.text("Webhook processed successfully");
  } catch (error) {
    if (error.message === "Invalid headers") {
      return c.json({ status: 'error', message: 'Invalid signature' }, 401);
    }
    return c.json({ status: 'error', message: 'Error processing webhook' }, 400);
  }
});

// CORS setup
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://charli.chat'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'huddle01-signature'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

type Env = {
  Bindings: {
    HUDDLE_API_KEY: string;
    SESSION_MANAGER: DurableObjectNamespace;
    MESSAGE_RELAY: DurableObjectNamespace;
    CONNECTION_MANAGER: DurableObjectNamespace;
    SESSION_TIMER: DurableObjectNamespace;
  }
}


export { SessionManager, ConnectionManager, SessionTimer, MessageRelay };

export default app;

//index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebhookReceiver } from "@huddle01/server-sdk/webhooks";
import { ConnectionManager } from './connectionManager';
import {SessionManager} from './sessionManager';
import { SessionTimer } from './sessionTimer';
import { streamSSE } from 'hono/streaming';
import { Message } from './types';

// Define environment type for the main worker
type Env = {
  Bindings: {
    HUDDLE_API_KEY: string;
    SESSION_MANAGER: DurableObjectNamespace;
    CONNECTION_MANAGER: DurableObjectNamespace;
    SESSION_TIMER: DurableObjectNamespace;
    WORKER: Fetcher;
  }
}

const app = new Hono<Env>();

// Track active SSE streams
type MessageQueue = {
  push: (message: Message) => Promise<void>;
  messages: Message[];
  stream: any;
};
const activeStreams = new Map<string, MessageQueue>();

// Set up SSE endpoint
app.get('/events/:roomId', (c) => {
  const roomId = c.req.param('roomId');

  return streamSSE(c, async (stream) => {
    const messageQueue: MessageQueue = {
      messages: [],
      stream,
      push: async (message: Message) => {
        await stream.writeSSE({
          data: JSON.stringify(message),
          event: message.type,
          id: String(Date.now())
        });
      }
    };

    activeStreams.set(roomId, messageQueue);

    stream.onAbort(() => {
      activeStreams.delete(roomId);
    });

    while (true) {
      await stream.sleep(30000);
      await stream.writeSSE({
        data: 'heartbeat',
        event: 'ping',
        id: String(Date.now())
      });
    }
  });
});

// Endpoint for DOs to broadcast messages
app.post('/broadcast/:roomId', async (c) => {
  const roomId = c.req.param('roomId');
  const message = await c.req.json<Message>();

  const messageQueue = activeStreams.get(roomId);
  if (messageQueue) {
    messageQueue.push(message);
    return c.json({ status: 'ok' });
  }
  return c.json({ status: 'no_active_stream' }, 404);
});

// Session initialization endpoint
app.post('/init', async (c) => {
  try {
    const data = await c.req.json();
    const { clientSideRoomId } = data;

    const sessionManager = c.env.SESSION_MANAGER.get(
      c.env.SESSION_MANAGER.idFromName(clientSideRoomId)
    );

    const response = await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify(data)
    });

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

export { SessionManager, ConnectionManager, SessionTimer };

export default app;

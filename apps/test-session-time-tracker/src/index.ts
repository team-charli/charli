//index.ts
import { cors } from 'hono/cors';
import { Hono } from 'hono';
import { WebhookReceiver } from "@huddle01/server-sdk/webhooks";
export {WebSocketManager} from './websocketManager'
export { SessionTimer } from './sessionTimer';
export { ConnectionManager } from './connectionManager';

const app = new Hono<{ Bindings: Bindings }>();

app.post('/init', async (c) => {
  try {
    const data = await c.req.json();
    const { clientSideRoomId, hashedTeacherAddress, hashedLearnerAddress, userAddress } = data;

    const durableObject = await getDurableObject(c.env.WEBSOCKET_MANAGER, clientSideRoomId);
    const response = await durableObject.fetch('http://websocket-manager/init', {
      method: 'POST',
      body: JSON.stringify({
        clientSideRoomId,
        hashedTeacherAddress,
        hashedLearnerAddress,
        userAddress,
      }),
    });

    const responseData = await response.text();
    return new Response(responseData, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
    });
  } catch (error) {
    if (error.message === "User address doesn't match teacher or learner address") {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
    }
    throw error;
  }
});

app.all('/websocket/:roomId', async (c) => {
  const roomId = c.req.param('roomId');
  const durableObject = await getDurableObject(c.env.WEBSOCKET_MANAGER, roomId);

  // Forward the original request to the Durable Object
  const resp = await durableObject.fetch(c.req.raw);
  return resp;
});



app.post('/webhook', async (c) => {
  console.log('[WEBHOOK] Received webhook event:', {
    signature: c.req.header("huddle01-signature")?.slice(0, 10),
    headers: c.req.header()
  });
  const signatureHeader = c.req.header("huddle01-signature");

  if (signatureHeader) {
    const receiver = new WebhookReceiver({ apiKey: c.env.HUDDLE_API_KEY });
    const data = await c.req.text();

    try {
      const event = receiver.receive(data, signatureHeader);
      if (!['meeting:started', 'meeting:ended', 'peer:joined', 'peer:left'].includes(event.event)) {
        return c.json({
          status: 'error',
          message: 'Unsupported event type'
        }, 400);
      }
      let roomId: string | undefined;
      if (
        event.event === 'meeting:started' ||
          event.event === 'meeting:ended' ||
          event.event === 'peer:joined' ||
          event.event === 'peer:left'
      ) {
        const typedData = receiver.createTypedWebhookData(event.event, event.payload);
        roomId = typedData.data.roomId;
      }

      if (roomId) {
        const websocketManager = await getDurableObject(c.env.WEBSOCKET_MANAGER, roomId);
        const connectionManager = await getDurableObject(c.env.CONNECTION_MANAGER, roomId);

        // Forward to WebSocketManager
        await websocketManager.fetch('http://websocket-manager/handleWebhook', {
          method: 'POST',
          body: JSON.stringify({ event }),
        });

        // Forward to ConnectionManager
        await connectionManager.fetch('http://connection-manager/handleWebhook', {
          method: 'POST',
          body: JSON.stringify({ event }),
        });
      }

      return c.text("Webhook processed successfully", 200);
    } catch (error) {
      console.error(error);
      if (error.message === "Invalid headers") {
        return c.json({ status: 'error', message: 'Invalid signature' }, 401);
      }
      return c.json({ status: 'error', message: 'Error processing webhook' }, 400);
    }
  }

  return c.text("Webhook processed successfully", 200);
});


app.use('/init', cors({
  origin: ['http://localhost:5173', 'https://charli.chat'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

app.options('*', (c) => {
  return c.text('', 204)
})

async function getDurableObject(namespace: DurableObjectNamespace, roomId: string) {
  const durableObjectId = namespace.idFromName(roomId);
  return namespace.get(durableObjectId);
}

export default app;

type Bindings = {
  HUDDLE_API_KEY: string;
  WEBSOCKET_MANAGER: DurableObjectNamespace;
  CONNECTION_MANAGER: DurableObjectNamespace;
  JWT_SECRET: string;
};




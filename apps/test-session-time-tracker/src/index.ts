//index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebhookReceiver } from "@huddle01/server-sdk/webhooks";
import { ConnectionManager } from './connectionManager';
import {SessionManager} from './sessionManager';
import { SessionTimer } from './sessionTimer';
import { MessageRelay} from './messageRelay';
import { Env } from './env';

// Define environment type for the main worker
const app = new Hono<Env>();

//websocket handler
app.get('/connect/:roomId', async (c) => {
  // Verify WebSocket upgrade request
  if (c.req.header('upgrade') !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }

  const roomId = c.req.param('roomId');

  // Establish WebSocket connection via MessageRelay
  const messageRelay = c.env.MESSAGE_RELAY.get(
    c.env.MESSAGE_RELAY.idFromName(roomId)
  );

  const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
    method: 'GET',
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade'
    }
  });

  // If connection successful, return WebSocket to client
  if (wsResponse.webSocket) {
    return new Response(null, {
      status: 101,
      webSocket: wsResponse.webSocket
    });
  }

  // Handle connection failure
  return c.text('Failed to establish WebSocket connection', 500);
});

app.post('/init', async (c) => {
  try {
    const reqData = await c.req.json();
    const { clientSideRoomId } = reqData;

    // Check connection first
    const messageRelay = c.env.MESSAGE_RELAY.get(
      c.env.MESSAGE_RELAY.idFromName(clientSideRoomId)
    );
    const connectionCheck = await messageRelay.fetch(
      'http://message-relay/checkConnection/' + clientSideRoomId
    );
    if (!connectionCheck.ok) {
      return c.json({
        status: 'error',
        message: 'No WebSocket connection established'
      }, 400);
    }

    // Process session init
    const sessionManager = c.env.SESSION_MANAGER.get(
      c.env.SESSION_MANAGER.idFromName(clientSideRoomId)
    );
    const response = await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify(reqData)
    });

    // Get response data before attempting broadcast
    const responseData = await response.json();

    // Attempt broadcast
    const broadcastResponse = await messageRelay.fetch(
      'http://message-relay/broadcast/' + clientSideRoomId,
      {
        method: 'POST',
        body: JSON.stringify({
          type: 'initiated',
          data: {
            status: response.ok ? 'success' : 'error',
            response: responseData
          }
        })
      }
    );

    if (!broadcastResponse.ok) {
      // Connection was lost during processing
      return c.json({
        status: 'error',
        message: 'Lost WebSocket connection during initialization'
      }, 500);
    }

    return c.json({ status: 'ok' });

  } catch (error) {
    // Return HTTP error - don't try to broadcast
    return c.json({
      status: 'error',
      message: error.message || 'Internal server error'
    }, 500);
  }
});

// Webhook handler
app.post('/webhook', async (c) => {
  const signatureHeader = c.req.header("huddle01-signature");
  if (!signatureHeader) {
    return c.text("Missing signature", 401);
  }
  const receiver = new WebhookReceiver({ apiKey: c.env.TEST_HUDDLE_API_KEY });
  const data = await c.req.text();
  console.log("Main worker received webhook data:", data);

  try {
    const event = receiver.receive(data, signatureHeader);
    // console.log("Main worker parsed event:", event);
    let roomId: string | undefined;
    // console.log("Extracted roomId:", roomId);
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
      // console.log("Sending webhook to SessionManager for room:", roomId);
      await sessionManager.fetch('http://session-manager/webhook', {
        method: 'POST',
        body: JSON.stringify(event)
      });
    }

    return c.text("Webhook processed successfully");
  } catch (error) {
    console.error("Main worker webhook error:", error);
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


export { SessionManager, ConnectionManager, SessionTimer, MessageRelay };

export default app;

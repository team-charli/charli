//index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebhookReceiver } from "@huddle01/server-sdk/webhooks";
import { Env } from './env';

// If you have local imports (connectionManager, sessionManager, etc.), adjust these paths:
import { ConnectionManager } from './connectionManager';
import { SessionManager } from './sessionManager';
import { SessionTimer } from './sessionTimer';
import { MessageRelay } from './messageRelay';

// ------------- Type Definitions -------------
type WebhookEvents = {
  "meeting:started": [
    data: {
      sessionId: string;
      roomId: string;
      createdAt: number;
    }
  ];
  "meeting:ended": [
    data: {
      sessionId: string;
      roomId: string;
      createdAt: number;
      endedAt: number;
      duration: number;
      participants: number;
      maxParticipants: number;
      audioMinutes: number;
      videoMinutes: number;
    }
  ];
  "peer:joined": [
    data: {
      id: string;
      sessionId: string;
      roomId: string;
      joinedAt: number;
      metadata?: string;
      role?: string;
      version?: string;
      browser: {
        name?: string;
        version?: string;
      };
      geoData?: {
        region: string;
        country: string;
      };
      device: {
        model?: string;
        type?: string;
        vendor?: string;
      };
    }
  ];
  "peer:left": [
    data: {
      id: string;
      sessionId: string;
      roomId: string;
      leftAt: number;
      duration: number;
      metadata?: string;
      role?: string;
    }
  ];
  "peer:trackPublished": [data: { id: string; track: string }];
  "peer:trackUnpublished": [data: { id: string; track: string }];
  "recording:started": [data: Recording];
  "recording:ended": [data: Recording];
  "recording:updated": [data: Recording];
};

type Recording = {
  id: string;
  roomId: string;
  sessionId: string;
  files: {
    duration: number;
    size: number;
    filename: string;
    location: string;
  }[];
  streams: {
    duration: number;
    url: string;
    startedAt: number;
    endedAt: number;
  }[];
  cid?: string;
  ipfsUrl?: string;
};

// The structure returned by `receiver.receive(...)`:
type WebhookData = {
  id: string;
  event: keyof WebhookEvents;
  payload: WebhookEvents[keyof WebhookEvents][0];
};

// A narrower union for the 4 event types that definitely include roomId
type RoomEvents = "meeting:started" | "meeting:ended" | "peer:joined" | "peer:left";
type RoomWebhookData = {
  id: string;
  event: RoomEvents;
  payload: WebhookEvents[RoomEvents][0]; // definitely has roomId
};

// Type guard: "If event is one of the four known room events, then `payload` has roomId"
function isRoomEvent(e: WebhookData): e is RoomWebhookData {
  return (
    e.event === 'meeting:started' ||
    e.event === 'meeting:ended' ||
    e.event === 'peer:joined' ||
    e.event === 'peer:left' ||
    e.event === 'peer:trackPublished' ||
    e.event === 'recording:started' ||
    e.event === 'recording:ended' ||
    e.event === 'recording:updated'
  );
}

// ------------- Hono App Setup -------------
const app = new Hono<Env>();

// Basic CORS setup
const allowedOrigins = ['http://localhost:5173', 'https://charli.chat'];
app.use('*', async (c, next) => {
  const requestOrigin = c.req.header('origin');
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return cors({
      origin: requestOrigin,
      allowMethods: ['POST', 'GET', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'huddle01-signature'],
      exposeHeaders: ['Content-Length'],
      maxAge: 600,
      credentials: true,
    })(c, next);
  }
  return next();
});

// ----------- WebSocket handler -----------
app.get('/connect/:roomId', async (c) => {
  if (c.req.header('upgrade') !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }
  const roomId = c.req.param('roomId');

  const messageRelay = c.env.MESSAGE_RELAY.get(
    c.env.MESSAGE_RELAY.idFromName(roomId)
  );
  const wsResponse = await messageRelay.fetch(
    `http://message-relay/connect/${roomId}`,
    {
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    }
  );

  if (wsResponse.webSocket) {
    return new Response(null, { status: 101, webSocket: wsResponse.webSocket });
  }
  return c.text('Failed to establish WebSocket connection', 500);
});

// ----------- Session init -----------
app.post('/init', async (c) => {
  try {
    const reqData = await c.req.json();
    const { clientSideRoomId } = reqData;

    // 1. Check WS connection
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

    // 2. Process session init
    const sessionManager = c.env.SESSION_MANAGER.get(
      c.env.SESSION_MANAGER.idFromName(clientSideRoomId)
    );
    const response = await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify(reqData)
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SessionManager error: ${body}`);
    }
    const responseData = await response.json();

    // 3. Broadcast
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
      return c.json({
        status: 'error',
        message: 'Lost WebSocket connection during initialization'
      }, 500);
    }

    return c.json({ status: 'ok' });
  } catch (error) {
    return c.json({
      status: 'error',
      message: error.message || 'Internal server error'
    }, 500);
  }
});

// ----------- Webhook handler -----------
app.post('/webhook', async (c) => {
  const signatureHeader = c.req.header("huddle01-signature");
  if (!signatureHeader) {
    return c.text("Missing signature", 401);
  }

  const data = await c.req.text();
  const receiver = new WebhookReceiver({ apiKey: c.env.TEST_HUDDLE_API_KEY });

  try {
    const eventData = await receiver.receive(data, signatureHeader);

    if (!isRoomEvent(eventData)) {
      console.log('Ignoring unsupported event:', eventData.event);
      return c.json({ status: 'error', message: 'Unsupported event type' }, 400);
    }
    // Create typed data
    const typedData = receiver.createTypedWebhookData(eventData.event, eventData.payload);

    // We can safely read `roomId`
    const { roomId } = typedData.data;

    // Forward to session manager
    const sessionManager = c.env.SESSION_MANAGER.get(
      c.env.SESSION_MANAGER.idFromName(roomId)
    );
    await sessionManager.fetch('http://session-manager/webhook', {
      method: 'POST',
      body: JSON.stringify(typedData)
    });

    return c.text("Webhook processed successfully");
  } catch (error) {
    console.error("Main worker webhook error:", error);
    if (error.message === "Invalid headers") {
      return c.json({ status: 'error', message: 'Invalid signature' }, 401);
    }
    return c.json({ status: 'error', message: 'Error processing webhook' }, 400);
  }
});

export { SessionManager, ConnectionManager, SessionTimer, MessageRelay };
export default app;

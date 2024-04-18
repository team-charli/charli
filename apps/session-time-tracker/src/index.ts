import ethers from 'ethers';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { WebhookReceiver } from "@huddle01/server-sdk/webhooks";
const app = new Hono<{ Bindings: Bindings }>();

app.get('/websocket/:roomId', async (c) => {
  const roomId = c.req.param('roomId');
  const durableObject = await getDurableObject(c.env.WEBSOCKET_MANAGER, roomId);
  const resp = await durableObject.fetch(c.req.url);
  return resp;
});
app.post('/authenticate', async (c) => {
  const { walletAddress, signature, sessionId } = await c.req.json();
  const isSignatureValid = verifySignature(walletAddress, signature, sessionId);
  if (!isSignatureValid) return c.text("Invalid signature", 401);
  const payload = {
    walletAddress,
    sessionId,
    exp: Math.floor(Date.now() / 1000) + 60 * 100, //100 minutes
  };
  const jwt = await sign(payload, c.env.JWT_SECRET);
  return c.json({ jwt }, 200);
});

app.post('/init', async (c) => {
  const { clientSideRoomId, hashedTeacherAddress, hashedLearnerAddress, userAddress } = await c.req.json();
  const durableObject = await getDurableObject(c.env.WEBSOCKET_MANAGER, clientSideRoomId);
  await durableObject.fetch('http://websocket-manager/init', {
    method: 'POST',
    body: JSON.stringify({
      clientSideRoomId,
      hashedTeacherAddress,
      hashedLearnerAddress,
      userAddress,
    }),
  });

  return c.text("Initialization successful", 200);
});

app.post('/webhook', async (c) => {
  const signatureHeader = c.req.header("huddle01-signature");

  if (signatureHeader) {
    const receiver = new WebhookReceiver({ apiKey: c.env.HUDDLE_API_KEY });
    const data = await c.req.text();

    try {
      const event = receiver.receive(data, signatureHeader);

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
        const durableObject = await getDurableObject(c.env.WEBSOCKET_MANAGER, roomId);

        await durableObject.fetch('http://websocket-manager/process-event', {
          method: 'POST',
          body: JSON.stringify({ event }),
        });
      }

      return c.text("Webhook processed successfully", 200);
    } catch (error) {
      console.error(error);
      return c.text("Error processing webhook", 400);
    }
  }

  return c.text("Webhook processed successfully", 200);
});

function verifySignature(walletAddress: string, signature: string, sessionId: string): boolean {
  return walletAddress ===  ethers.verifyMessage(sessionId, signature);
}

async function getDurableObject(namespace: DurableObjectNamespace, roomId: string) {
  const durableObjectId = namespace.idFromName(roomId);
  return namespace.get(durableObjectId);
}

export default app;

type Bindings = {
  HUDDLE_API_KEY: string;
  WEBSOCKET_MANAGER: DurableObjectNamespace;
  JWT_SECRET: string;
};



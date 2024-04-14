import { Hono } from 'hono';
import ethers from 'ethers';
import { WebhookReceiver } from "@huddle01/server-sdk/webhooks";

type Bindings = {
  HUDDLE_API_KEY: string;
  PRIVATE_KEY: string;
  WEBSOCKET_MANAGER: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Bindings }>();

app.post('/webhook', async (c) => {
  const wallet = new ethers.Wallet(c.env.PRIVATE_KEY);
  const signatureHeader = c.req.header("huddle01-signature");
  if (signatureHeader) {
    const receiver = new WebhookReceiver({ apiKey: c.env.HUDDLE_API_KEY });
    const data = await c.req.text();
    const clientData = await c.req.json();
    const { clientSideRoomId, hashedTeacherAddress, hashedLearnerAddress, userAddress } = clientData;

    try {
      const event = receiver.receive(data, signatureHeader);
      let roomId: string | null = null;
      let peerId: string | null = null;
      let joinedAt: number | null = null;
      let user: User = { roomId: null, role: null, peerId: null, joinedAt: null, leftAt: null, joinedAtSig: null };

      if (event.event === "peer:joined") {
        const typedData = receiver.createTypedWebhookData(event.event, event.payload);
        const { id: peerId, roomId: webhookRoomId, joinedAt } = typedData.data;
        if (webhookRoomId === clientSideRoomId) {
          roomId = webhookRoomId;
          const userAddressHash = ethers.keccak256(userAddress);
          let role: "teacher" | "learner"
          if (hashedTeacherAddress === ethers.keccak256(userAddress)) {
            role = "teacher"
          } else if (hashedLearnerAddress === ethers.keccak256(userAddress)) {
            role = "learner"
          } else {
            throw new Error(`hashed address doesn't match hashedTeacherAddress or hashedLearnerAddress`)
          }
          const signature = await wallet.signMessage(String(joinedAt));
          user = { role , peerId, joinedAt, roomId, joinedAtSig: signature, leftAt: null };
        }
      }

      if (user.roomId && user.peerId && user.joinedAt && user.role && user.joinedAtSig) {
        const namespace = c.env.WEBSOCKET_MANAGER;
        const durableObjectId = namespace.idFromName(user.roomId);
        const durableObject = namespace.get(durableObjectId);
        const message = `Peer ${user.peerId} joined room ${user.roomId} at ${new Date(user.joinedAt).toISOString()}`;
        await durableObject.fetch('http://websocket-manager/broadcast', {
          method: 'POST',
          body: JSON.stringify({ message }),
        });
      }
    } catch (error) {
      console.error(error);
      return c.text("Error processing webhook", 400);
    }
  }

  return c.text("Webhook processed successfully", 200);
});

export default app;


interface User {
  role: "teacher" | "learner" | null;
  peerId: string | null;
  roomId: string | null;
  joinedAt: number | null;
  leftAt: number | null;
  joinedAtSig: string | null;
}

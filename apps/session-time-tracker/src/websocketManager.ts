import { WebhookEvents, WebhookData } from './types';
import { Hono } from 'hono';
import ethers from 'ethers';

interface ClientData {
  clientSideRoomId: string;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  userAddress: string;
}

interface User {
  role: "teacher" | "learner" | null;
  peerId: string | null;
  roomId: string | null;
  joinedAt: number | null;
  leftAt: number | null;
  joinedAtSig: string | null;
}

export class WebSocketManager {
  private clients: Map<string, WebSocket> = new Map();
  private wallet: ethers.Wallet;
  private clientData: ClientData | null;
  private app: Hono;

  constructor(private state: DurableObjectState, private env: any) {
    this.wallet = new ethers.Wallet(env.PRIVATE_KEY);
    this.clientData = null;

    this.app = new Hono();

    this.app.get('/websocket', async (c) => {
      if (c.req.header('Upgrade') !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      await this.handleWebSocketConnect(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    });

    this.app.post('/init', async (c) => {
      const clientData: ClientData = await c.req.json();
      this.clientData = clientData;
      return c.text('OK');
    });

    this.app.post('/process-event', async (c) => {
      const event = await c.req.json();
      await this.processEvent(event);
      return c.text('OK');
    });
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }

  async handleWebSocketConnect(ws: WebSocket) {
    const clientId = `${ws.url}`;
    this.clients.set(clientId, ws);
    console.log('WebSocket connection established');
    this.state.acceptWebSocket(ws);

    ws.addEventListener('close', () => {
      this.clients.delete(clientId);
      console.log('WebSocket connection closed');
    });
  }

  async processEvent(event: WebhookData) {
    if (!this.clientData) {
      throw new Error("Client data not initialized");
    }

    const { clientSideRoomId, hashedTeacherAddress, hashedLearnerAddress, userAddress } = this.clientData;

    let roomId: string | null = null;
    let peerId: string | null = null;
    let joinedAt: number | null = null;
    let user: User = { roomId: null, role: null, peerId: null, joinedAt: null, leftAt: null, joinedAtSig: null };

    if (event.event === "peer:joined") {
      const { id: peerId, roomId: webhookRoomId, joinedAt } = event.payload as WebhookEvents['peer:joined'][0];
      if (webhookRoomId === clientSideRoomId) {
        roomId = webhookRoomId;
        const userAddressHash = ethers.keccak256(ethers.getAddress(userAddress));
        let role: "teacher" | "learner";
        if (hashedTeacherAddress === userAddressHash) {
          role = "teacher";
        } else if (hashedLearnerAddress === userAddressHash) {
          role = "learner";
        } else {
          throw new Error(`hashed address doesn't match hashedTeacherAddress or hashedLearnerAddress`);
        }
        const signature = await this.wallet.signMessage(String(joinedAt));
        user = { role, peerId, joinedAt, roomId, joinedAtSig: signature, leftAt: null };
      }
    }
    if (user.roomId && user.peerId && user.joinedAt && user.role && user.joinedAtSig) {
      const message = { message: `Peer ${user.peerId} joined room ${user.roomId} at ${new Date(user.joinedAt).toISOString()}` };
      const data = {}
      this.broadcast(message, data, user.roomId);
    }
  }

  async broadcast(message: Message, data: any, roomId: string) {
    for (const [clientId, ws] of this.clients) {
      if (clientId.includes(roomId)) {
        const payload = {
          message,
          data,
        };
        ws.send(JSON.stringify(payload));
      }
    }
  }
}

interface ClientData {
  clientSideRoomId: string;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  userAddress: string;
}

interface User {
  role: "teacher" | "learner" | null;
  peerId: string | null;
  roomId: string | null;
  joinedAt: number | null;
  leftAt: number | null;
  joinedAtSig: string | null;
}

interface Message {
  message: string;
}

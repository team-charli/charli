import { WebhookEvents, WebhookData } from './types';
import { Hono } from 'hono';
import ethers from 'ethers';

export class WebSocketManager {
  private clients: Map<string, { ws: WebSocket; user: User }> = new Map();
  private wallet: ethers.Wallet;
  private clientData: ClientData | null;
  private app: Hono;
  private userHeartbeats: Map<string, number> = new Map();
  private readonly heartbeatThreshold = 90000; // 90 seconds

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
    const user: User = {
      role: null,
      peerId: null,
      roomId: null,
      joinedAt: null,
      leftAt: null,
      joinedAtSig: null,
      leftAtSig: null,
      duration: null,
    };
    this.clients.set(clientId, { ws, user });
    console.log('WebSocket connection established');
    this.state.acceptWebSocket(ws);

    ws.addEventListener('close', () => {
      this.clients.delete(clientId);
      console.log('WebSocket connection closed');
    });
  }

  async processEvent(event: WebhookData) {
    if (!this.clientData) throw new Error("Client data not initialized");
    const { clientSideRoomId, hashedTeacherAddress, hashedLearnerAddress, userAddress } = this.clientData;

    let roomId: string | null = null;
    let peerId: string | null = null;
    let joinedAt: number | null = null;

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
        const clientEntry = this.clients.get(peerId);
        if (clientEntry) {
          clientEntry.user = {
            ...clientEntry.user,
            role,
            peerId,
            joinedAt,
            roomId,
            joinedAtSig: signature,
          };
        }
      }
      const clientEntry = this.clients.get(peerId);
      if (clientEntry && clientEntry.user.roomId && clientEntry.user.peerId && clientEntry.user.joinedAt && clientEntry.user.role && clientEntry.user.joinedAtSig) {
        const message = { message: `Peer ${clientEntry.user.peerId} joined room ${clientEntry.user.roomId} at ${new Date(clientEntry.user.joinedAt).toISOString()}` };
        const data = { user: clientEntry.user };
        this.broadcast(message, data, clientEntry.user.roomId);
      }
    } else if (event.event === "peer:left") {
      const { id: peerId, roomId: webhookRoomId, leftAt, duration } = event.payload as WebhookEvents['peer:left'][0];
      if (webhookRoomId === clientSideRoomId) {
        roomId = webhookRoomId;
        const signature = await this.wallet.signMessage(String(leftAt));
        const clientEntry = this.clients.get(peerId);
        if (clientEntry) {
          clientEntry.user = {
            ...clientEntry.user,
            leftAt,
            leftAtSig: signature,
            duration,
          };
        }
      }
      const clientEntry = this.clients.get(peerId);
      if (clientEntry && clientEntry.user.roomId && clientEntry.user.peerId && clientEntry.user.leftAt && clientEntry.user.role && clientEntry.user.leftAtSig) {
        const message = { message: `Peer ${clientEntry.user.peerId} left room ${clientEntry.user.roomId} at ${new Date(clientEntry.user.leftAt).toISOString()}` };
        const data = { user: clientEntry.user };
        this.broadcast(message, data, clientEntry.user.roomId);
      }
    }
  }

  async handleWebSocketMessage(ws: WebSocket, message: string) {
    const data = JSON.parse(message);

    if (data.type === 'heartbeat') {
      const { timestamp, signature } = data;
      const clientId = `${ws.url}`;
      const address = ethers.verifyMessage(timestamp.toString(), signature);

      // Verify the signature and update the last heartbeat timestamp
      if (address === this.clientData?.userAddress) {
        this.userHeartbeats.set(clientId, timestamp);
      }
    }
  }

  async checkHeartbeats() {
    const currentTimestamp = Date.now();

    for (const [clientId, lastHeartbeat] of this.userHeartbeats) {
      if (currentTimestamp - lastHeartbeat > this.heartbeatThreshold) {
        // Heartbeat missed, initiate fault handling
        const clientEntry = this.clients.get(clientId);
        if (clientEntry) {
          await this.handleFault(clientEntry.user, clientEntry.ws);
        }
      }
    }
  }

  async handleFault(user: User, ws: WebSocket) {
    // Check if the user is the first to join
    const isFirstUser = user.joinedAt === Math.min(...Array.from(this.clients.values()).map(entry => entry.user.joinedAt!));

    if (isFirstUser) {
      // First user fault, check if the second user joined within 3 minutes
      const secondUserJoinedAt = Math.max(...Array.from(this.clients.values()).map(entry => entry.user.joinedAt!));
      if (secondUserJoinedAt - user.joinedAt! > 180000) {
        // Second user did not join within 3 minutes
        const faultType = 'firstUserFault';
        const proof = {
          faultType,
          user,
        };
        await this.sendFaultMessage(ws, faultType, proof);
      }
    } else {
      // Second user fault
      const faultType = 'secondUserFault';
      const proof = {
        faultType,
        user,
      };
      await this.sendFaultMessage(ws, faultType, proof);
    }
  }

  async sendFaultMessage(ws: WebSocket, faultType: string, proof: any) {
    const message = {
      type: 'fault',
      faultType,
      proof,
    };
    ws.send(JSON.stringify(message));
  }

async broadcast(message: Message, data: any) {
  for (const [clientId, { ws }] of this.clients) {
    const payload = {
      message,
      data,
    };
    ws.send(JSON.stringify(payload));
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
  leftAtSig: string | null;
  duration: number | null;
}

interface Message {
  message: string;
}

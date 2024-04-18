import { WebhookEvents, WebhookData } from './types';
import { Hono } from 'hono';
import ethers from 'ethers';

export class WebSocketManager {
  private clients: Map<string, { ws: WebSocket | null; user: User }> = new Map();
  private wallet: ethers.Wallet;
  private clientData: ClientData | null;
  private app: Hono;
  private userHeartbeats: Map<string, number> = new Map();
  private readonly heartbeatThreshold = 35000; // 90 seconds

  constructor(private state: DurableObjectState, private env: any) {
    this.wallet = new ethers.Wallet(env.PRIVATE_KEY);
    this.clientData = null;
    this.app = new Hono();

    this.app.get('/websocket/:roomId', async (c) => {
      if (c.req.header('Upgrade') !== 'websocket') return new Response('Expected Upgrade: websocket', { status: 426 });
      const [client, server] = Object.values(new WebSocketPair());
      await this.handleWebSocketConnect(server);
      return new Response(null, { status: 101, webSocket: client });
    });

    this.app.post('/init', async (c) => {
      const clientData: ClientData = await c.req.json();
      this.clientData = clientData;
      const userAddressHash = ethers.keccak256(ethers.getAddress(clientData.userAddress));
      let role: "teacher" | "learner";
      if (userAddressHash === clientData.hashedTeacherAddress) {
        role = "teacher";
      } else if (userAddressHash === clientData.hashedLearnerAddress) {
        role = "learner";
      } else {
        throw new Error("User address doesn't match teacher or learner address");
      }
      const user: User = {
        role,
        peerId: null,
        roomId: null,
        joinedAt: null,
        leftAt: null,
        joinedAtSig: null,
        leftAtSig: null,
        duration: null,
      };
      this.clients.set(role, { ws: null, user });
      return c.text('OK');
    });

    this.app.post('/process-event', async (c) => {
      const event = await c.req.json();
      await this.processEvent(event);
      return c.text('OK');
    });
  }
  async fetch(request: Request) { return this.app.fetch(request); }

  async handleWebSocketConnect(ws: WebSocket) {
    const clientEntry = Array.from(this.clients.values()).find(entry => entry.user.role && !entry.ws);
    if (clientEntry) {
      clientEntry.ws = ws;
      console.log('WebSocket connection established');
      this.state.acceptWebSocket(ws);
      ws.addEventListener('close', () => {
        clientEntry.ws = null;
        console.log('WebSocket connection closed');
      });
    }
  }

  async processEvent(event: WebhookData) {
    if (event.event === "peer:joined") {
      const { id: peerId, roomId: webhookRoomId, joinedAt } = event.payload as WebhookEvents['peer:joined'][0];
      const clientEntry = Array.from(this.clients.values()).find(entry => entry.user.role && !entry.user.peerId);
      if (clientEntry) {
        const signature = await this.wallet.signMessage(String(joinedAt));
        clientEntry.user = {
          ...clientEntry.user,
          peerId,
          roomId: webhookRoomId,
          joinedAt,
          joinedAtSig: signature,
        };
        const message = { message: `Peer ${peerId} joined room ${webhookRoomId} at ${new Date(joinedAt).toISOString()}` };
        const data = { user: clientEntry.user };
        this.broadcast(message, data);
      }
    } else if (event.event === "peer:left") {
      const { id: peerId, leftAt, duration } = event.payload as WebhookEvents['peer:left'][0];
      const clientEntry = this.clients.get(peerId);
      if (clientEntry) {
        const signature = await this.wallet.signMessage(String(leftAt));
        clientEntry.user = {
          ...clientEntry.user,
          leftAt,
          leftAtSig: signature,
          duration,
        };
        const message = { message: `Peer ${peerId} left room ${clientEntry.user.roomId} at ${new Date(leftAt).toISOString()}` };
        const data = { user: clientEntry.user };
        this.broadcast(message, data);
      }
    }
  }

  async handleWebSocketMessage(ws: WebSocket, message: string) {
    const data = JSON.parse(message);
    if (data.type === 'heartbeat') {
      const { timestamp, signature } = data;
      const clientEntry = Array.from(this.clients.values()).find(entry => entry.ws === ws);
      if (clientEntry && clientEntry.user.peerId) {
        const address = ethers.verifyMessage(timestamp.toString(), signature);
        if (address === this.clientData?.userAddress) this.userHeartbeats.set(clientEntry.user.peerId, timestamp);
      }
    }
  }

  async checkHeartbeats() {
    const currentTimestamp = Date.now();
    for (const [peerId, lastHeartbeat] of this.userHeartbeats) {
      if (currentTimestamp - lastHeartbeat > this.heartbeatThreshold) {
        // Heartbeat missed, initiate fault handling
        const clientEntry = Array.from(this.clients.values()).find(entry => entry.user.peerId === peerId);
        if (clientEntry) {
          await this.handleFault(clientEntry.user, clientEntry.ws);
        }
      }
    }
  }

  async handleFault(user: User, ws: WebSocket | null) {
    // Check if the user is the teacher or learner
    const isTeacher = user.role === 'teacher';
    const isLearner = user.role === 'learner';

    // Check if the user is the first to join
    const isFirstUser = user.joinedAt === Math.min(...Array.from(this.clients.values()).map(entry => entry.user.joinedAt!));

    if (isFirstUser) {
      // First user fault, check if the second user joined within 3 minutes
      const secondUserJoinedAt = Math.max(...Array.from(this.clients.values()).map(entry => entry.user.joinedAt!));
      if (secondUserJoinedAt - user.joinedAt! > 180000) {
        // Second user did not join within 3 minutes
        if (isTeacher) {
          // Learner fault
          const faultType = 'learnerFault';
          const proof = { faultType, user };
          if (!ws) throw new Error(`Websocket should not be null`);
          await this.sendFaultMessage(ws, faultType, proof);
        } else if (isLearner) {
          // Teacher fault
          const faultType = 'teacherFault';
          const proof = { faultType, user };
          if (!ws) throw new Error(`Websocket should not be null`);
          await this.sendFaultMessage(ws, faultType, proof);
        }
      }
    } else {
      // User dropped connection for more than 3 minutes
      const currentTimestamp = Date.now();
      const disconnectionDuration = currentTimestamp - user.leftAt!;
      if (disconnectionDuration > 180000) {
        if (isTeacher) {
          // Teacher fault
          const faultType = 'teacherFault';
          const proof = { faultType, user };
          if (!ws) throw new Error(`Websocket should not be null`);
          await this.sendFaultMessage(ws, faultType, proof);
        } else if (isLearner) {
          // Learner fault
          const faultType = 'learnerFault';
          const proof = { faultType, user };
          if (!ws) throw new Error(`Websocket should not be null`);
          await this.sendFaultMessage(ws, faultType, proof);
        }
      }
    }
  }

  async sendFaultMessage(ws: WebSocket, faultType: string, proof: any) {
    const message = {
      type: 'fault',
      faultType,
      proof: {
        ...proof,
        userRole: proof.user.role,
      },
    };
    ws.send(JSON.stringify(message));
  }

  async broadcast(message: Message, data: any) {
    for (const { ws } of this.clients.values()) {
      if (ws) {
        const payload = { message, data };
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
  leftAtSig: string | null;
  duration: number | null;
}
interface Message { message: string; }

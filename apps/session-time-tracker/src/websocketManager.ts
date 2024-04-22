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
    const privateKey = env.CHARLI_SESSION_SESSION_TIME_TRACKER;
    this.wallet = new ethers.Wallet(privateKey);
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
        hashedTeacherAddress: clientData.hashedTeacherAddress,
        hashedLearnerAddress: clientData.hashedLearnerAddress,
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

        // Store the user data in the Durable Object's storage
        await this.state.storage.put(`user:${clientEntry.user.role}`, clientEntry.user);

        const message: Message = {
          type: 'userJoined',
          data: {
            user: clientEntry.user,
            timestamp: joinedAt,
          },
        };
        this.broadcast(message);

        // Check if both users have joined
        const teacherJoinedData = await this.state.storage.get('user:teacher') as User | null;
        const learnerJoinedData = await this.state.storage.get('user:learner') as User | null;
        if (teacherJoinedData && learnerJoinedData) {
          // Both users have joined, broadcast a message
          const bothJoinedMessage: Message = {
            type: 'bothJoined',
            data: {
              teacher: teacherJoinedData,
              learner: learnerJoinedData,
            },
          };
          this.broadcast(bothJoinedMessage);
        }
      }
    } else if (event.event === "peer:left") {
      const { id: peerId, leftAt, duration } = event.payload as WebhookEvents['peer:left'][0];
      const clientEntry = Array.from(this.clients.values()).find(entry => entry.user.peerId === peerId);
      if (clientEntry) {
        const signature = await this.wallet.signMessage(String(leftAt));
        clientEntry.user = {
          ...clientEntry.user,
          leftAt,
          leftAtSig: signature,
          duration,
        };

        // Store the updated user data in the Durable Object's storage
        await this.state.storage.put(`user:${clientEntry.user.role}`, clientEntry.user);

        const message: Message = {
          type: 'userLeft',
          data: {
            user: clientEntry.user,
            timestamp: leftAt,
          },
        };
        this.broadcast(message);

        // Check if both users have left
        const teacherLeftData = await this.state.storage.get('user:teacher') as User | null;
        const learnerLeftData = await this.state.storage.get('user:learner') as User | null;
        if (teacherLeftData && learnerLeftData && teacherLeftData.leftAt && learnerLeftData.leftAt) {
          // Both users have left, broadcast a message
          const bothLeftMessage: Message = {
            type: 'bothLeft',
            data: {
              teacher: teacherLeftData,
              learner: learnerLeftData,
            },
          };
          this.broadcast(bothLeftMessage);
        }
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
    } else if (data.type === 'getUserData') {
      const teacherData = await this.state.storage.get('user:teacher') as User | null;
      const learnerData = await this.state.storage.get('user:learner') as User | null;
      const userData: UserData = {
        teacher: teacherData,
        learner: learnerData,
      };
      await this.sendMessage(ws, { type: 'userData', data: userData });
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
        if (isTeacher) {
          // Learner fault
          const faultType = 'learnerFault_didnt_join';
          const faultTime = Date.now();
          const faultTimeSig = await this.wallet.signMessage(JSON.stringify({ faultType, faultTime }));
          const clientEntry = Array.from(this.clients.values()).find(entry => entry.user.role === 'learner');
          if (clientEntry) {
            clientEntry.user = {
              ...clientEntry.user,
              faultTime,
              faultTimeSig,
            };
          }
          const message: Message = {
            type: 'fault',
            data: {
              faultType,
              user: clientEntry?.user,
              timestamp: faultTime,
              signature: faultTimeSig,
            },
          };
          if (!ws) throw new Error(`Websocket should not be null`);
          await this.sendMessage(ws, message);
        } else if (isLearner) {
          // Teacher fault
          const faultType = 'teacherFault_didnt_join';
          const faultTime = Date.now();
          const faultTimeSig = await this.wallet.signMessage(JSON.stringify({ faultType, faultTime }));
          const clientEntry = Array.from(this.clients.values()).find(entry => entry.user.role === 'teacher');
          if (clientEntry) {
            clientEntry.user = {
              ...clientEntry.user,
              faultTime,
              faultTimeSig,
            };
          }
          const message: Message = {
            type: 'fault',
            data: {
              faultType,
              user: clientEntry?.user,
              timestamp: faultTime,
              signature: faultTimeSig,
            },
          };
          if (!ws) throw new Error(`Websocket should not be null`);
          await this.sendMessage(ws, message);
        }
      }
    } else {
      // User dropped connection for more than 3 minutes
      const currentTimestamp = Date.now();
      const disconnectionDuration = currentTimestamp - user.leftAt!;
      if (disconnectionDuration > 180000) {
        if (isTeacher) {
          // Teacher fault
          const faultType = 'teacherFault_connection_timeout';
          const faultTime = Date.now();
          const faultTimeSig = await this.wallet.signMessage(JSON.stringify({ faultType, faultTime }));
          const clientEntry = Array.from(this.clients.values()).find(entry => entry.user.role === 'teacher');
          if (clientEntry) {
            clientEntry.user = {
              ...clientEntry.user,
              faultTime,
              faultTimeSig,
            };
          }
          const message: Message = {
            type: 'fault',
            data: {
              faultType,
              user: clientEntry?.user,
              timestamp: faultTime,
              signature: faultTimeSig,
            },
          };
          if (!ws) throw new Error(`Websocket should not be null`);
          await this.sendMessage(ws, message);
        } else if (isLearner) {
          // Learner fault
          const faultType = 'learnerFault_connection_timeout';
          const faultTime = Date.now();
          const faultTimeSig = await this.wallet.signMessage(JSON.stringify({ faultType, faultTime }));
          const clientEntry = Array.from(this.clients.values()).find(entry => entry.user.role === 'learner');
          if (clientEntry) {
            clientEntry.user = {
              ...clientEntry.user,
              faultTime,
              faultTimeSig,
            };
          }
          const message: Message = {
            type: 'fault',
            data: {
              faultType,
              user: clientEntry?.user,
              timestamp: faultTime,
              signature: faultTimeSig,
            },
          };
          if (!ws) throw new Error(`Websocket should not be null`);
          await this.sendMessage(ws, message);
        }
      }
    }
  }

  async sendMessage(ws: WebSocket, message: Message) {
    ws.send(JSON.stringify(message));
  }
  async broadcast(message: Message) {
    for (const { ws } of this.clients.values()) {
      if (ws) {
        await this.sendMessage(ws, message);
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

interface Message {
  type: 'fault' | 'userJoined' | 'userLeft' | 'bothJoined' | 'bothLeft' | 'userData';
  data: {
    faultType?: 'learnerFault_didnt_join' | 'teacherFault_didnt_join' | 'learnerFault_connection_timeout' | 'teacherFault_connection_timeout';
    user?: User;
    timestamp?: number;
    signature?: string;
    teacher?: User | null;
    learner?: User | null;
  };
}
interface UserData {
  teacher: User | null;
  learner: User | null;
}
interface User {
  role: "teacher" | "learner" | null;
  peerId: string | null;
  roomId: string | null;
  joinedAt: number | null;
  leftAt: number | null;
  joinedAtSig: string | null;
  leftAtSig: string | null;
  faultTime?: number;
  faultTimeSig?: string;
  duration: number | null;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
}

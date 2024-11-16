// websocketManager.ts
import { WebhookEvents, WebhookData } from './types';
import { Wallet, keccak256, getAddress } from 'ethers';

export class WebSocketManager {
  private clients: Map<string, { ws: WebSocket | null; user: User }> = new Map();
  private wallet: Wallet;
  private clientData: ClientData | null;

  constructor(private state: DurableObjectState, private env: Env) {
    const privateKey = env.PRIVATE_KEY_SESSION_TIME_SIGNER;
    this.wallet = new Wallet(privateKey);
    this.clientData = null;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (pathname === '/sessionTimerEvent' && request.method === 'POST') {
      const { message, data } = (await request.json()) as SessionTimerEvent;
      await this.handleSessionTimerEvent(message, data);
      return new Response('OK');
    } else if (pathname.startsWith('/websocket/')) {
      return this.handleWebSocketUpgrade(request);
    } else if (pathname === '/init') {
      return this.handleInitRequest(request);
    } else if (pathname === '/handleWebhook') {
      return this.handleWebhook(request);
    } else {
      return new Response('Not Found', { status: 404 });
    }
  }

  private async handleSessionTimerEvent(message: SessionTimerMessage, data?: SessionTimerData) {
    const broadcastMessage: Message = {
      type: message.type, // 'initiated', 'warning', or 'expired'
      data: {
        message: message.message,
        timestampMs: data?.timestampMs,
        signature: data?.signature,
      },
    };
    this.broadcast(broadcastMessage);
  }
  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    console.log(`[WSM-UPGRADE] Attempting upgrade for request: ${request.url}`);
    if (request.headers.get('Upgrade') !== 'websocket') {
      console.log('[WSM-UPGRADE-FAIL] Missing websocket upgrade header');
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    console.log('[WSM-UPGRADE-SUCCESS] Created WebSocket pair');
    server.accept();
    console.log('Accepted server WebSocket');
    this.handleWebSocketConnection(server);
    console.log('Initialized WebSocket connection handler');
    return new Response(null, { status: 101, webSocket: client });
  }

  private handleWebSocketConnection(ws: WebSocket) {
    let clientEntry: { ws: WebSocket | null; user: User } | undefined;

    ws.addEventListener('message', async (event) => {
      console.log('Server received message:', event.data);

      let messageString: string;

      if (typeof event.data === 'string') {
        messageString = event.data;
      } else if (event.data instanceof ArrayBuffer) {
        messageString = new TextDecoder().decode(event.data);
      } else {
        console.error('Unsupported message data type:', typeof event.data);
        return;
      }

      const data = JSON.parse(messageString);
      console.log('Server parsed message:', data);
      if (data.type === 'initConnection') {
        console.log('Processing initConnection:', data.data);
        const role = data.data.role;
        clientEntry = this.clients.get(role);
        if (clientEntry) {
          clientEntry.ws = ws;
          console.log('WebSocket connection established for role:', role);
          ws.send(JSON.stringify({ type: 'connectionConfirmed' }));
        } else {
          console.error('No client entry found for role:', role);
          ws.close(1008, 'No client entry found for role');
          return;
        }
      } else {
        console.error('Unexpected message type received:', data.type);
        throw new Error('Unexpected message')
      }
    });

    ws.addEventListener('close', () => {
      if (clientEntry) {
        clientEntry.ws = null;
        console.log('WebSocket connection closed for role:', clientEntry.user.role);
      } else {
        console.error('No client entry found for WebSocket close event');
      }
    });

    ws.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
    });
  }

  private async handleInitRequest(request: Request): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    console.log('[WSM-INIT] Received init request');
    const clientData: ClientData = await request.json();
    console.log('[WSM-INIT] Client data:', {
      roomId: clientData.clientSideRoomId,
      userAddress: clientData.userAddress,
      // hash values truncated for logging
      hashedTeacher: clientData.hashedTeacherAddress.slice(0, 10),
      hashedLearner: clientData.hashedLearnerAddress.slice(0, 10)
    });
    this.clientData = clientData;

    const userAddressHash = keccak256(getAddress(clientData.userAddress));
    let role: 'teacher' | 'learner';
    if (userAddressHash === clientData.hashedTeacherAddress) {
      role = 'teacher';
    } else if (userAddressHash === clientData.hashedLearnerAddress) {
      role = 'learner';
    } else {
      throw new Error("User address doesn't match teacher or learner address");
    }

    const user: User = {
      role,
      hashedTeacherAddress: clientData.hashedTeacherAddress,
      hashedLearnerAddress: clientData.hashedLearnerAddress,
      peerId: null,
      roomId: clientData.clientSideRoomId,
      joinedAt: null,
      leftAt: null,
      joinedAtSig: null,
      leftAtSig: null,
      duration: null,
    };
    this.clients.set(role, { ws: null, user });

    await this.sendParticipantInfoToConnectionManager(user.peerId, user.role);

    return new Response(JSON.stringify({ status: 'OK', role, roomId: user.roomId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleWebhook(request: Request): Promise<Response> {
    if (request.method !== 'POST')
      return new Response('Method Not Allowed', { status: 405 });

    const event = (await request.json()) as WebhookData;
    await this.processWebhook(event);
    return new Response('OK');
  }

  async processWebhook(event: WebhookData) {
    if (event.event === 'peer:joined') {
      const { id: peerId, roomId: webhookRoomId, joinedAt } = event.payload as WebhookEvents['peer:joined'][0];
      const clientEntry = Array.from(this.clients.values()).find((entry) => entry.user.role && !entry.user.peerId);
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
        await this.sendParticipantInfoToConnectionManager(peerId, clientEntry.user.role);

        const message: Message = {
          type: 'userJoined',
          data: {
            user: clientEntry.user,
            timestamp: joinedAt,
          },
        };
        this.broadcast(message);

        // Check if both users have joined
        const teacherJoinedData = (await this.state.storage.get('user:teacher')) as User | null;
        const learnerJoinedData = (await this.state.storage.get('user:learner')) as User | null;
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
          // Start the session timer

          await this.startSessionTimer();
        }
      }
    } else if (event.event === 'peer:left') {
      const { id: peerId, leftAt, duration } = event.payload as WebhookEvents['peer:left'][0];
      const clientEntry = Array.from(this.clients.values()).find((entry) => entry.user.peerId === peerId);
      if (clientEntry) {
        const signature = await this.wallet.signMessage(String(leftAt));
        clientEntry.user = {
          ...clientEntry.user,
          leftAt,
          leftAtSig: signature,
          duration,
        };

        await this.state.storage.put(`user:${clientEntry.user.role}`, clientEntry.user);

        const message: Message = {
          type: 'userLeft',
          data: {
            user: clientEntry.user,
            timestamp: leftAt,
          },
        };
        this.broadcast(message);

        // Check for faults after participant has left
        await this.handleFault(clientEntry.user);

        // Check if both users have left
        const teacherLeftData = (await this.state.storage.get('user:teacher')) as User | null;
        const learnerLeftData = (await this.state.storage.get('user:learner')) as User | null;
        if (
          teacherLeftData &&
            learnerLeftData &&
            teacherLeftData.leftAt &&
            learnerLeftData.leftAt
        ) {
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

  private async startSessionTimer() {
    if (!this.clientData) {
      console.error('Client data is not initialized.');
      throw new Error('Client data is not initialized.');
    }
    const sessionId = this.clientData.clientSideRoomId;
    const sessionDuration = 3600000; // For example, 1 hour

    const sessionTimerId = this.env.SESSION_TIMER.idFromName(sessionId);
    const sessionTimerStub = this.env.SESSION_TIMER.get(sessionTimerId);

    const payload = {
      duration: sessionDuration,
      hashedTeacherAddress: this.clientData!.hashedTeacherAddress,
      hashedLearnerAddress: this.clientData!.hashedLearnerAddress,
    };

    await sessionTimerStub.fetch('http://session-timer/', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  }


  async handleFault(user: User) {
    // Check if the user is the teacher or learner
    const isTeacher = user.role === 'teacher';
    const isLearner = user.role === 'learner';

    // Get all joinedAt timestamps from clients
    const joinedAtValues = Array.from(this.clients.values())
    .map((entry) => entry.user.joinedAt)
    .filter((joinedAt): joinedAt is number => joinedAt !== null);

    if (user.joinedAt === null) {
      console.error('User has not joined yet.');
      return;
    }

    const isFirstUser = user.joinedAt === Math.min(...joinedAtValues);

    if (isFirstUser) {
      // First user fault, check if the second user joined within 3 minutes
      const secondUserJoinedAt = Math.max(...joinedAtValues);
      if (secondUserJoinedAt - user.joinedAt > 180000) {
        if (isTeacher) {
          // Learner fault: didn't join
          await this.handleFaultForRole('learner', 'learnerFault_didnt_join');
        } else if (isLearner) {
          // Teacher fault: didn't join
          await this.handleFaultForRole('teacher', 'teacherFault_didnt_join');
        }
      }
    } else {
      // User dropped connection for more than 3 minutes
      const currentTimestamp = Date.now();
      if (user.leftAt) {
        const disconnectionDuration = currentTimestamp - user.leftAt;
        if (disconnectionDuration > 180000) {
          if (isTeacher) {
            // Teacher fault: connection timeout
            await this.handleFaultForRole('teacher', 'teacherFault_connection_timeout');
          } else if (isLearner) {
            // Learner fault: connection timeout
            await this.handleFaultForRole('learner', 'learnerFault_connection_timeout');
          }
        }
      }
    }
  }

  private async handleFaultForRole(role: 'teacher' | 'learner', faultType: FaultType) {
    const faultTime = Date.now();
    const faultTimeSig = await this.wallet.signMessage(JSON.stringify({ faultType, faultTime }));
    const clientEntry = this.clients.get(role);
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
    // Send the fault message to all connected clients
    this.broadcast(message);
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
  private async sendParticipantInfoToConnectionManager(peerId: string | null, role: 'teacher' | 'learner' | null) {
    if (peerId === null) throw new Error("peedId is null");
    if (role === null) throw new Error("role is null");
    const connectionManagerId = this.env.CONNECTION_MANAGER.idFromName(this.clientData!.clientSideRoomId);
    const connectionManagerStub = this.env.CONNECTION_MANAGER.get(connectionManagerId);

    await connectionManagerStub.fetch('http://connection-manager/updateParticipantRole', {
      method: 'POST',
      body: JSON.stringify({ peerId, role }),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

type ClientData = {
  clientSideRoomId: string;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  userAddress: string;
}

// Update the Message interface
interface Message {
  type:
  | 'fault'
  | 'userJoined'
  | 'userLeft'
  | 'bothJoined'
  | 'bothLeft'
  | 'userData'
  | 'initiated'
  | 'warning'
  | 'expired';
  data: {
    faultType?: FaultType;
    user?: User;
    timestamp?: number;
    signature?: string;
    teacher?: User | null;
    learner?: User | null;
    message?: string;
    timestampMs?: string;
  };
}

type FaultType =
| 'learnerFault_didnt_join'
| 'teacherFault_didnt_join'
| 'learnerFault_connection_timeout'
| 'teacherFault_connection_timeout';


interface User {
  role: 'teacher' | 'learner' | null;
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

interface SessionTimerEvent {
  message: SessionTimerMessage;
  data?: SessionTimerData;
}

interface SessionTimerMessage {
  type: 'initiated' | 'warning' | 'expired';
  message: string;
}

interface SessionTimerData {
  timestampMs?: string;
  signature?: string;
}

interface Env {
  SESSION_TIMER: DurableObjectNamespace;
  PRIVATE_KEY_SESSION_TIME_SIGNER: string;
  CONNECTION_MANAGER: DurableObjectNamespace;
}


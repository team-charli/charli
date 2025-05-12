//sessionManager.test.ts
import { env, runInDurableObject } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionManager } from "../src/sessionManager";
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";
import type { User } from "../src/types";
import { runDurableObjectAlarm } from "cloudflare:test";
import { SELF } from "cloudflare:test";
import { getDefaultInitData } from "./util/helpers";

describe("Session Manager", () => {
  let ws: WebSocket | undefined;
  let roomId: string;
  let teacherAddress: string;
  let learnerAddress: string;
  let teacherHash: string;
  let learnerHash: string;

  const firstJoinTime = Date.now();
  const duration = 3600000; // 1 hour
  let sessionTimerStub: DurableObjectStub;
  let sessionManagerStub: DurableObjectStub;

  beforeEach(() => {
    const testId = crypto.randomUUID();
    roomId = `room-${testId}`;
    teacherAddress = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    learnerAddress  = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
    learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));
  });

  async function cleanup() {
    // 1. Close any open WebSocket connections
    if (ws) {
      ws.close();
      await new Promise(resolve => setTimeout(resolve, 100));
      ws = undefined;
    }

    // 2. Get stubs in dependency order
    const stubs = {
      sessionTimer: env.SESSION_TIMER.get(env.SESSION_TIMER.idFromName(roomId)),
      connectionManager: env.CONNECTION_MANAGER.get(env.CONNECTION_MANAGER.idFromName(roomId)),
      sessionManager: env.SESSION_MANAGER.get(env.SESSION_MANAGER.idFromName(roomId)),
      messageRelay: env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId))
    };

    // 3. Clean in reverse dependency order
    for (const [name, stub] of Object.entries(stubs).reverse()) {
      try {
        await runDurableObjectAlarm(stub);
        await runInDurableObject(stub, async (instance, state) => {
          await state.blockConcurrencyWhile(async () => {
            await state.storage.deleteAll();
            await state.storage.deleteAlarm();
          });
        });
      } finally {
        stub[Symbol.dispose]?.();
      }
    }
  }

  beforeEach(async () => {
    await cleanup();
    sessionTimerStub = env.SESSION_TIMER.get(
      env.SESSION_TIMER.idFromName(roomId)
    );
  });

  afterEach(async () => {
    await cleanup();
  });

  async function establishWebSocket() {
    const resp = await SELF.fetch(`https://example.com/connect/${roomId}`, {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    });
    expect(resp.status).toBe(101);
    ws = resp.webSocket!;
    ws.accept();
    const messages: any[] = [];
    ws.addEventListener('message', evt => {
      messages.push(JSON.parse(evt.data));
    });
    return messages;
  }

  async function initSession(userAddress: string) {
    const initResp = await SELF.fetch("https://example.com/init", {
      method: "POST",
      body: JSON.stringify(getDefaultInitData({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress,
        sessionDuration: duration
      }))
    });
    expect(initResp.ok).toBe(true);
    return initResp.json();
  }

  describe("Direct DO instantiation and initialization", () => {
    it("should properly instantiate with necessary properties", async () => {
     const testControllerAddress = "0xF000000000000000000000000000000000000000";

      // 1. Setup WebSocket connection with correct URL pattern / Setup message listener
      await establishWebSocket();
      const initResp = await SELF.fetch("https://example.com/init", {
        method: "POST",
        body: JSON.stringify(getDefaultInitData({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: duration,
          controllerAddress: testControllerAddress
        }))
      });
      expect(initResp.ok).toBe(true);
      //await initSession(learnerAddress);
      // 2. Test SessionManager with correct URL pattern
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      await runInDurableObject(sessionManager, async (instance, state) => {
        expect(instance).toBeInstanceOf(SessionManager);

        const initRequest = new Request("http://session-manager/init", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getDefaultInitData({
            clientSideRoomId: roomId,
            sessionDuration: duration,
            userAddress: teacherAddress,
            hashedTeacherAddress: teacherHash,
            controllerAddress: testControllerAddress
          }))
        });

        const initResponse = await instance.fetch(initRequest);
        expect(initResponse.ok).toBe(true);

        const responseData = await initResponse.json();
        expect(responseData.role).toBe('teacher') ;
        expect(responseData.roomId).toBe(roomId);

        // Verify instance properties
        expect(instance['roomId']).toBe(roomId);
        expect(instance['state']).toBeDefined();
        expect(instance['env']).toBeDefined();
        expect(instance['app']).toBeDefined();
      });
    });
  });
  describe("User address validation and state storage", () => {
    it("should validate teacher address and store state atomically", async () => {
      // 1. Setup WebSocket connection first
      const messageRelay = env.MESSAGE_RELAY.get(
        env.MESSAGE_RELAY.idFromName(roomId)
      );

      const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });

      if (!wsResponse.webSocket) {
        throw new Error("WebSocket not established");
      }

      ws = wsResponse.webSocket;
      ws.accept();

      // 2. Setup message listener
      const receivedMessages: any[] = [];
      ws.addEventListener("message", (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

      // 3. Verify connection
      const connectionCheck = await messageRelay.fetch(`http://message-relay/checkConnection/${roomId}`);
      expect(connectionCheck.ok).toBe(true);

      // 4. Test teacher validation and state storage
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      // Generate proper hashed addresses

      await runInDurableObject(sessionManager, async (instance, state) => {
        await state.blockConcurrencyWhile(async () => {
          const initRequest = new Request("http://session-manager/init", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getDefaultInitData({
              clientSideRoomId: roomId,
              hashedTeacherAddress: teacherHash,
              hashedLearnerAddress: learnerHash,
              userAddress: teacherAddress,
              sessionDuration: duration
            }))
          });

          const initResponse = await instance.fetch(initRequest);
          if (!initResponse.ok) {
            const errorData = await initResponse.json();
            throw new Error(
              `Session initialization failed: ${initResponse.status} ${initResponse.statusText}\n` +
                `Error: ${errorData.message}`
            );
          }

          const responseData = await initResponse.json();
          expect(responseData.status).toBe('OK');
          expect(responseData.role).toBe('teacher');
          expect(responseData.roomId).toBe(roomId);

          // Verify stored state
          const storedUser = await state.storage.get('user:teacher') as User;
          //console.log("storedUser __", storedUser);
          expect(storedUser).toMatchObject({
            role: 'teacher',
            roomId,
            hashedTeacherAddress: teacherHash,
            hashedLearnerAddress: learnerHash,
            sessionDuration: duration,
            peerId: null,
            joinedAt: null,
            leftAt: null,
            duration: null,
          });
        });
      });
    });
    it("should reject invalid user addresses", async () => {
      // 1. Setup WebSocket connection first
      const messageRelay = env.MESSAGE_RELAY.get(
        env.MESSAGE_RELAY.idFromName(roomId)
      );

      const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });

      if (!wsResponse.webSocket) {
        throw new Error("WebSocket not established");
      }

      ws = wsResponse.webSocket;
      ws.accept();

      // 2. Setup message listener
      const receivedMessages: any[] = [];
      ws.addEventListener("message", (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

      // 3. Verify connection
      const connectionCheck = await messageRelay.fetch(`http://message-relay/checkConnection/${roomId}`);
      expect(connectionCheck.ok).toBe(true);

      // 4. Test invalid address rejection
      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );

      await runInDurableObject(sessionManager, async (instance) => {
        const initRequest = new Request("http://session-manager/init", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getDefaultInitData({
            clientSideRoomId: roomId,
            hashedTeacherAddress: teacherHash,
            hashedLearnerAddress: learnerHash,
            userAddress:  "0x0000000000000000000000000000000000000042",
            sessionDuration: duration
          }))
        });

        const response = await instance.fetch(initRequest);

        expect(response.status).toBe(403);

        // Verify error message
        const errorData = await response.json();
        expect(errorData).toEqual({
          status: 'error',
          message: "User address doesn't match teacher or learner address"
        });
      });
    });
  })
  describe("DO communication patterns", () => {
    it("should communicate with ConnectionManager on initialization", async () => {
      // 1. Setup WebSocket connection first
      const messageRelay = env.MESSAGE_RELAY.get(
        env.MESSAGE_RELAY.idFromName(roomId)
      );

      const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });

      if (!wsResponse.webSocket) {
        throw new Error("WebSocket not established");
      }

      ws = wsResponse.webSocket;
      ws.accept();

      // 2. Setup message listener
      const receivedMessages: any[] = [];
      ws.addEventListener("message", (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });
      // Direct call to handlePeer endpoint
      const connectionManager = env.CONNECTION_MANAGER.get(
        env.CONNECTION_MANAGER.idFromName(roomId)
      );
      await connectionManager.fetch('http://connection-manager/handlePeer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId: 'test-peer-1',
          role: 'teacher',
          joinedAt: Date.now(),
          roomId
        })
      });

      // Verify state was stored
      await runInDurableObject(connectionManager, async (cm, cmState) => {
        const participants = await cmState.storage.get('participants');
        expect(participants).toEqual({
          'test-peer-1': 'teacher'
        });

        const joinTimes = await cmState.storage.get('joinTimes');
        expect(joinTimes.teacher).toBeDefined();
      });
    });
    it("should properly set up DO communication channels", async () => {

      const sessionManager = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId)
      );
      const connectionManager = env.CONNECTION_MANAGER.get(
        env.CONNECTION_MANAGER.idFromName(roomId)
      );
      // 1. Setup WebSocket connection first
      const messageRelay = env.MESSAGE_RELAY.get(
        env.MESSAGE_RELAY.idFromName(roomId)
      );

      const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });

      if (!wsResponse.webSocket) {
        throw new Error("WebSocket not established");
      }

      ws = wsResponse.webSocket;
      ws.accept();

      // 2. Setup message listener
      const receivedMessages: any[] = [];
      ws.addEventListener("message", (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

    });
    it("should broadcast initialization messages properly", async () => {
      // 1. Setup WebSocket connection first
      const messageRelay = env.MESSAGE_RELAY.get(
        env.MESSAGE_RELAY.idFromName(roomId)
      );

      const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });

      if (!wsResponse.webSocket) {
        throw new Error("WebSocket not established");
      }

      ws = wsResponse.webSocket;
      ws.accept();

      // 2. Setup message listener
      const receivedMessages: any[] = [];
      ws.addEventListener("message", (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

      // 3. Use SELF to call the main worker's /init endpoint
      const initResponse = await SELF.fetch("http://test.local/init", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getDefaultInitData({
          clientSideRoomId: roomId,
          hashedTeacherAddress: teacherHash,
          hashedLearnerAddress: learnerHash,
          userAddress: teacherAddress,
          sessionDuration: duration
        }))
      });
      expect(initResponse.ok).toBe(true);

      // 4. Wait a short time for message processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Verify broadcast messages
      expect(receivedMessages).toContainEqual({
        type: 'initiated',
        data: {
          status: 'success',
          response: expect.objectContaining({
            role: 'teacher',
            roomId
          })
        }
      });
    });
  })
  describe("RoomId handling", () => {
    it("should properly scope data to specific roomId", async () => {
      // Generate two distinct test IDs
      const testId1 = crypto.randomUUID();
      const testId2 = crypto.randomUUID();

      // First room/user set
      const roomId1 = `room-${testId1}`;
      const teacherAddress1 = `0x${testId1.slice(0, 8)}`;
      const hashedTeacherAddress1 = toHex(keccak256(hexToBytes(teacherAddress1)));

      // Second room/user set
      const roomId2 = `room-${testId2}`;
      const teacherAddress2 = `0x${testId2.slice(0, 8)}`;
      const hashedTeacherAddress2 = toHex(keccak256(hexToBytes(teacherAddress2)));

      // Setup two SessionManager instances with different roomIds
      const sessionManager1 = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId1)
      );
      const sessionManager2 = env.SESSION_MANAGER.get(
        env.SESSION_MANAGER.idFromName(roomId2)
      );

      // Setup WebSocket connections sequentially
      const messageRelay1 = env.MESSAGE_RELAY.get(
        env.MESSAGE_RELAY.idFromName(roomId1)
      );
      const wsResponse1 = await messageRelay1.fetch(`http://message-relay/connect/${roomId1}`, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });

      const messageRelay2 = env.MESSAGE_RELAY.get(
        env.MESSAGE_RELAY.idFromName(roomId2)
      );
      const wsResponse2 = await messageRelay2.fetch(`http://message-relay/connect/${roomId2}`, {
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });

      // Initialize room 1
      await runInDurableObject(sessionManager1, async (instance1, state1) => {
        const initRequest1 = new Request("http://session-manager/init", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getDefaultInitData({
            clientSideRoomId: roomId1,
            hashedTeacherAddress: hashedTeacherAddress1,
            hashedLearnerAddress: "0x0000000000000000000000000000000000000456",
            userAddress: teacherAddress1,
            sessionDuration: duration
          }))
        });

        await instance1.fetch(initRequest1);

        // Verify room 1 state
        const room1Teacher = await state1.storage.get('user:teacher');
        // console.log("room1Teacher", room1Teacher);
        expect(room1Teacher.roomId).toBe(roomId1);
        // Fix: Use hashedTeacherAddress instead of hashedTeacherAddress1
        expect(room1Teacher.hashedTeacherAddress).toBe(hashedTeacherAddress1);
      });

      // Initialize room 2 separately

      await runInDurableObject(sessionManager2, async (instance2, state2) => {
        const initRequest2 = new Request("http://session-manager/init", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getDefaultInitData({
            clientSideRoomId: roomId2,
            hashedTeacherAddress: hashedTeacherAddress2,
            hashedLearnerAddress: learnerHash,
            userAddress: teacherAddress2,
            sessionDuration: duration
          }))
        });

        const response2 = await instance2.fetch(initRequest2);
        // console.log("room2 init response:", await response2.clone().json());

        // Verify room 2 state
        const room2Teacher = await state2.storage.get('user:teacher') as User;
        // console.log("room2Teacher", room2Teacher);
        expect(room2Teacher.roomId).toBe(roomId2);
        expect(room2Teacher.hashedTeacherAddress).toBe(hashedTeacherAddress2);
      });

      // Verify cross-contamination hasn't occurred
      await runInDurableObject(sessionManager1, async (instance1, state1) => {
        const room1Teacher = await state1.storage.get('user:teacher') as User;
        expect(room1Teacher.hashedTeacherAddress).toBe(hashedTeacherAddress1);
      });

      await runInDurableObject(sessionManager2, async (instance2, state2) => {
        const room2Teacher = await state2.storage.get('user:teacher') as User;
        expect(room2Teacher.hashedTeacherAddress).toBe(hashedTeacherAddress2);
      });
    });
  });
});

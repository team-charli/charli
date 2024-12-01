import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { WebhookReceiver } from "@huddle01/server-sdk/webhooks";
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, toHex } from "ethereum-cryptography/utils.js";

describe("Webhook Handler", () => {
  const roomId = "test-room";
  const mockApiKey = "test-api-key";
  const mockSignature = "sha256=mock";

  // Set up a session before testing webhooks
  beforeEach(async () => {
    // Initialize a session with both users
    const sessionManager = env.SESSION_MANAGER.get(
      env.SESSION_MANAGER.idFromName(roomId)
    );

    const teacherAddress = "0x1234";
    const learnerAddress = "0x5678";
    const teacherHash = toHex(keccak256(hexToBytes(teacherAddress)));
    const learnerHash = toHex(keccak256(hexToBytes(learnerAddress)));

    await sessionManager.fetch('http://session-manager/init', {
      method: 'POST',
      body: JSON.stringify({
        clientSideRoomId: roomId,
        hashedTeacherAddress: teacherHash,
        hashedLearnerAddress: learnerHash,
        userAddress: teacherAddress,
        sessionDuration: 3600000
      })
    });
  });

  it("should validate Huddle01 webhook signatures", async () => {
    const invalidSignature = "invalid-signature";
    const webhookData = {
      event: 'peer:joined',
      payload: {
        roomId,
        sessionId: 'test-session',
        id: 'peer-1',
        joinedAt: Date.now()
      }
    };

    const response = await fetch('/webhook', {
      method: 'POST',
      headers: {
        'huddle01-signature': invalidSignature
      },
      body: JSON.stringify(webhookData)
    });

    expect(response.status).toBe(401);
  });

  it("should process peer:joined webhook event and update state", async () => {
    const webhookData = {
      event: 'peer:joined',
      payload: {
        roomId,
        sessionId: 'test-session',
        id: 'peer-1',
        joinedAt: Date.now(),
        metadata: JSON.stringify({ role: 'teacher' })
      }
    };

    // Send webhook
    const response = await fetch('/webhook', {
      method: 'POST',
      headers: {
        'huddle01-signature': mockSignature
      },
      body: JSON.stringify(webhookData)
    });

    expect(response.status).toBe(200);

    // Verify ConnectionManager state was updated
    const connectionManager = env.CONNECTION_MANAGER.get(
      env.CONNECTION_MANAGER.idFromName(roomId)
    );

    // Set up WebSocket to catch any broadcasts
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );
    const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    const ws = wsResponse.webSocket;

    let broadcastMessage = null;
    ws.addEventListener('message', (event) => {
      broadcastMessage = JSON.parse(event.data);
    });

    // Verify participant role was stored
    const checkResponse = await connectionManager.fetch('http://connection-manager/checkBothJoined');
    const { bothJoined } = await checkResponse.json();
    expect(bothJoined).toBe(false); // Only teacher joined so far
  });

  it("should handle peer:left webhook event", async () => {
    const joinedAt = Date.now();
    const leftAt = joinedAt + 60000; // 1 minute later

    // First join
    await fetch('/webhook', {
      method: 'POST',
      headers: {
        'huddle01-signature': mockSignature
      },
      body: JSON.stringify({
        event: 'peer:joined',
        payload: {
          roomId,
          sessionId: 'test-session',
          id: 'peer-1',
          joinedAt,
          metadata: JSON.stringify({ role: 'teacher' })
        }
      })
    });

    // Then leave
    const response = await fetch('/webhook', {
      method: 'POST',
      headers: {
        'huddle01-signature': mockSignature
      },
      body: JSON.stringify({
        event: 'peer:left',
        payload: {
          roomId,
          sessionId: 'test-session',
          id: 'peer-1',
          leftAt,
          duration: 60000
        }
      })
    });

    expect(response.status).toBe(200);
  });

  it("should handle meeting:started and meeting:ended webhooks", async () => {
    const startedAt = Date.now();
    const endedAt = startedAt + 3600000; // 1 hour later

    // Meeting started
    await fetch('/webhook', {
      method: 'POST',
      headers: {
        'huddle01-signature': mockSignature
      },
      body: JSON.stringify({
        event: 'meeting:started',
        payload: {
          roomId,
          sessionId: 'test-session',
          createdAt: startedAt
        }
      })
    });

    // Meeting ended
    const response = await fetch('/webhook', {
      method: 'POST',
      headers: {
        'huddle01-signature': mockSignature
      },
      body: JSON.stringify({
        event: 'meeting:ended',
        payload: {
          roomId,
          sessionId: 'test-session',
          createdAt: startedAt,
          endedAt,
          duration: 3600000,
          participants: 2,
          maxParticipants: 2
        }
      })
    });

    expect(response.status).toBe(200);
  });

  it("should propagate webhook data through the full system", async () => {
    // Set up WebSocket to catch broadcasts
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );
    const wsResponse = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    const ws = wsResponse.webSocket;

    const messages = [];
    ws.addEventListener('message', (event) => {
      messages.push(JSON.parse(event.data));
    });

    // Simulate full session flow with webhooks
    const startTime = Date.now();

    // 1. Teacher joins
    await fetch('/webhook', {
      method: 'POST',
      headers: {
        'huddle01-signature': mockSignature
      },
      body: JSON.stringify({
        event: 'peer:joined',
        payload: {
          roomId,
          sessionId: 'test-session',
          id: 'peer-1',
          joinedAt: startTime,
          metadata: JSON.stringify({ role: 'teacher' })
        }
      })
    });

    // 2. Learner joins
    await fetch('/webhook', {
      method: 'POST',
      headers: {
        'huddle01-signature': mockSignature
      },
      body: JSON.stringify({
        event: 'peer:joined',
        payload: {
          roomId,
          sessionId: 'test-session',
          id: 'peer-2',
          joinedAt: startTime + 30000,
          metadata: JSON.stringify({ role: 'learner' })
        }
      })
    });

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify expected messages were broadcast
    expect(messages.some(m => m.type === 'userJoined')).toBe(true);
    expect(messages.some(m => m.type === 'bothJoined')).toBe(true);
  });
});

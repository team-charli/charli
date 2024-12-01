import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { MessageRelay } from "../src/messageRelay";

describe("MessageRelay", () => {
  it("should establish WebSocket connection", async () => {
    // Get MessageRelay DO instance
    const roomId = "test-room";
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );

    // Create WebSocket connection
    const response = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);

    expect(response.status).toBe(101); // WebSocket switching protocols
    expect(response.webSocket).toBeDefined();
    expect(response.webSocket.url).toContain(roomId);
  });

  it("should broadcast messages to connected clients", async () => {
    const roomId = "test-room";
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );

    // Connect WebSocket
    const response = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    const ws = response.webSocket;

    // Set up message receiver
    let receivedMessage: any;
    ws.addEventListener('message', (event) => {
      receivedMessage = JSON.parse(event.data);
    });

    // Broadcast test message
    const testMessage = {
      type: 'warning',
      data: {
        message: 'Test message',
        timestampMs: String(Date.now())
      }
    };

    await messageRelay.fetch(`http://message-relay/broadcast/${roomId}`, {
      method: 'POST',
      body: JSON.stringify(testMessage)
    });

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(receivedMessage).toEqual(testMessage);
  });

  it("should maintain message format consistency", async () => {
    const roomId = "test-room";
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );

    // Connect WebSocket
    const response = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    const ws = response.webSocket;

    const messages = [];
    ws.addEventListener('message', (event) => {
      messages.push(JSON.parse(event.data));
    });

    // Test different message types
    const testMessages = [
      {
        type: 'warning',
        data: { message: 'Warning message', timestampMs: String(Date.now()) }
      },
      {
        type: 'fault',
        data: {
          message: 'Fault detected',
          faultType: 'secondUser_never_joined',
          role: 'learner',
          timestamp: Date.now()
        }
      },
      {
        type: 'expired',
        data: { message: 'Session expired', timestampMs: String(Date.now()) }
      }
    ];

    // Broadcast all messages
    for (const msg of testMessages) {
      await messageRelay.fetch(`http://message-relay/broadcast/${roomId}`, {
        method: 'POST',
        body: JSON.stringify(msg)
      });
    }

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify all messages maintain expected format
    messages.forEach((msg, index) => {
      expect(msg).toHaveProperty('type');
      expect(msg).toHaveProperty('data');
      expect(msg).toEqual(testMessages[index]);
    });
  });

  it("should clean up connections on client disconnect", async () => {
    const roomId = "test-room";
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );

    // Connect WebSocket
    const response = await messageRelay.fetch(`http://message-relay/connect/${roomId}`);
    const ws = response.webSocket;

    // Close connection
    ws.close();

    // Try to broadcast message
    const broadcastResponse = await messageRelay.fetch(`http://message-relay/broadcast/${roomId}`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'warning',
        data: { message: 'Test', timestampMs: String(Date.now()) }
      })
    });

    const result = await broadcastResponse.json();
    expect(result.status).toBe('no_active_connection');
  });

  it("should handle multiple room connections independently", async () => {
    const room1 = "room-1";
    const room2 = "room-2";

    const messageRelay1 = env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(room1));
    const messageRelay2 = env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(room2));

    // Connect to both rooms
    const response1 = await messageRelay1.fetch(`http://message-relay/connect/${room1}`);
    const response2 = await messageRelay2.fetch(`http://message-relay/connect/${room2}`);

    const ws1 = response1.webSocket;
    const ws2 = response2.webSocket;

    const messages1 = [];
    const messages2 = [];

    ws1.addEventListener('message', (event) => messages1.push(JSON.parse(event.data)));
    ws2.addEventListener('message', (event) => messages2.push(JSON.parse(event.data)));

    // Send different messages to each room
    const msg1 = { type: 'warning', data: { message: 'Room 1', timestampMs: String(Date.now()) }};
    const msg2 = { type: 'warning', data: { message: 'Room 2', timestampMs: String(Date.now()) }};

    await messageRelay1.fetch(`http://message-relay/broadcast/${room1}`, {
      method: 'POST',
      body: JSON.stringify(msg1)
    });

    await messageRelay2.fetch(`http://message-relay/broadcast/${room2}`, {
      method: 'POST',
      body: JSON.stringify(msg2)
    });

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(messages1).toEqual([msg1]);
    expect(messages2).toEqual([msg2]);
  });
});

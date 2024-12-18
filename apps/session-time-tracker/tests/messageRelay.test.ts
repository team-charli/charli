import { SELF, env, runInDurableObject } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";

describe("MessageRelay", () => {
  const roomId = "test-room";
  let messageRelay: DurableObjectStub;

  async function cleanup() {
    const stubs = [
      env.MESSAGE_RELAY.get(env.MESSAGE_RELAY.idFromName(roomId))
    ];

    await Promise.all(stubs.map(stub =>
      runInDurableObject(stub, async (instance, state) => {
        await state.blockConcurrencyWhile(async () => {
          await state.storage.deleteAll();
        });
      })
    ));
  }

  beforeEach(async () => {
    await cleanup();
    messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(roomId)
    );
  });

  it("should establish WebSocket connection", async () => {
    let ws: WebSocket | undefined;
    try {
      const response = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });

      expect(response.status).toBe(101);
      expect(response.webSocket).toBeDefined();
      ws = response.webSocket;
      if (ws) {
        ws.accept();
        // Instead of checking URL, verify connection is alive
        const isOpen = ws.readyState === WebSocket.OPEN;
        expect(isOpen).toBe(true);
      }
    } finally {
      if (ws) {
        ws.close();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });

  it("should broadcast messages to connected clients", async () => {
    let ws: WebSocket | undefined;
    try {
      const response = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      ws = response.webSocket;
      if (ws) ws.accept();

      const receivedMessages: any[] = [];
      ws.addEventListener('message', (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

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

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(receivedMessages[0]).toEqual(testMessage);

    } finally {
      if (ws) {
        ws.close();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });

  it("should maintain message format consistency", async () => {
    let ws: WebSocket | undefined;
    try {
      const response = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      ws = response.webSocket;
      if (ws) ws.accept();

      const messages: any[] = [];
      ws.addEventListener('message', (event) => {
        messages.push(JSON.parse(event.data));
      });

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
        }
      ];

      for (const msg of testMessages) {
        await messageRelay.fetch(`http://message-relay/broadcast/${roomId}`, {
          method: 'POST',
          body: JSON.stringify(msg)
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      messages.forEach((msg, index) => {
        expect(msg).toHaveProperty('type');
        expect(msg).toHaveProperty('data');
        expect(msg).toEqual(testMessages[index]);
      });

    } finally {
      if (ws) {
        ws.close();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });

  it("should cleanup connections on client disconnect", async () => {
    let ws: WebSocket | undefined;
    try {
      const response = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      ws = response.webSocket;
      if (ws) ws.accept();
      ws.close();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify cleanup by attempting broadcast
      const broadcastResponse = await messageRelay.fetch(`http://message-relay/broadcast/${roomId}`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'warning',
          data: { message: 'Test' }
        })
      });

      const result = await broadcastResponse.json();
      expect(result.status).toBe('no_active_connection');

    } finally {
      if (ws) {
        ws.close();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });

  it("should handle failed connections appropriately", async () => {
    // Test without any WebSocket headers
    const response = await SELF.fetch(`http://test.local/connect/${roomId}`, {
      method: 'GET'
    });
    expect(response.status).toBe(426);
  });

  it("should route messages from DOs to connected clients", async () => {
    let ws: WebSocket | undefined;
    try {
      const response = await messageRelay.fetch(`http://message-relay/connect/${roomId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      ws = response.webSocket;
      if (ws) ws.accept();

      const receivedMessages: any[] = [];
      ws.addEventListener('message', (event) => {
        receivedMessages.push(JSON.parse(event.data));
      });

      // Simulate message from SessionTimer DO
      const message = {
        type: 'warning',
        data: {
          message: '3-minute warning',
          timestampMs: String(Date.now())
        }
      };

      await messageRelay.fetch(`http://message-relay/broadcast/${roomId}`, {
        method: 'POST',
        body: JSON.stringify(message)
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(receivedMessages[0]).toEqual(message);

    } finally {
      if (ws) {
        ws.close();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });
});

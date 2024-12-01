import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { env } from "cloudflare:test";

describe("Environment Configuration", () => {
  it("should enforce CORS policy for allowed origins", async () => {
    const request = new Request('https://example.com/init', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://charli.chat',
        'Access-Control-Request-Method': 'POST'
      }
    });

    const response = await app.fetch(request, env);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://charli.chat');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('huddle01-signature');
    expect(response.headers.get('Access-Control-Max-Age')).toBe('600');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it("should reject requests from disallowed origins", async () => {
    const request = new Request('https://example.com/init', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://malicious-site.com',
        'Access-Control-Request-Method': 'POST'
      }
    });

    const response = await app.fetch(request, env);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it("should allow localhost origin during development", async () => {
    const request = new Request('https://example.com/init', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST'
      }
    });

    const response = await app.fetch(request, env);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  it("should handle WebSocket upgrade requests correctly", async () => {
    const clientSideRoomId = "test-room";
    const messageRelay = env.MESSAGE_RELAY.get(
      env.MESSAGE_RELAY.idFromName(clientSideRoomId)
    );

    const response = await messageRelay.fetch(`http://message-relay/connect/${clientSideRoomId}`, {
      method: 'GET'
    });

    expect(response.status).toBe(101); // Switching Protocols
    expect(response.webSocket).toBeDefined();
  });

  it("should expose required response headers", async () => {
    const request = new Request('https://example.com/init', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://charli.chat',
        'Access-Control-Request-Method': 'POST'
      }
    });

    const response = await app.fetch(request, env);
    expect(response.headers.get('Access-Control-Expose-Headers')).toContain('Content-Length');
  });

  it("should handle preflight requests with appropriate cache duration", async () => {
    const request = new Request('https://example.com/init', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://charli.chat',
        'Access-Control-Request-Method': 'POST'
      }
    });

    const response = await app.fetch(request, env);
    expect(response.headers.get('Access-Control-Max-Age')).toBe('600');
  });

  it("should verify all required environment variables are present", () => {
    expect(env.HUDDLE_API_KEY).toBeDefined();
    expect(env.SESSION_MANAGER).toBeDefined();
    expect(env.MESSAGE_RELAY).toBeDefined();
    expect(env.CONNECTION_MANAGER).toBeDefined();
    expect(env.SESSION_TIMER).toBeDefined();
  });

  it("should properly handle OPTIONS requests for webhook endpoint", async () => {
    const request = new Request('https://example.com/webhook', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://charli.chat',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'huddle01-signature'
      }
    });

    const response = await app.fetch(request, env);
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('huddle01-signature');
  });
});

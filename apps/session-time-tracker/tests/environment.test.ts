//environment.test.ts
import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("Environment Tests", () => {

  it("should handle CORS requests correctly", async () => {
    // Send a preflight OPTIONS request
    const response = await SELF.fetch("https://example.com/init", {
      method: "OPTIONS",
      headers: {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type"
      }
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
    expect(response.headers.get("access-control-allow-headers")).toContain("Content-Type");
    expect(response.headers.get("access-control-max-age")).toBe("600");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("should correctly respond to WebSocket upgrade requests", async () => {
    // This route requires 'upgrade: websocket'
    const response = await SELF.fetch("https://example.com/connect/test-room", {
      headers: {
        "Upgrade": "websocket",
        "Connection": "Upgrade"
      }
    });
    // Successful WebSocket upgrade should return a 101 response
    expect(response.status).toBe(101);
    expect(response.webSocket).toBeDefined();
  });

  it("should reject non-WebSocket requests to the WebSocket endpoint", async () => {
    // Missing the 'Upgrade: websocket' header
    const response = await SELF.fetch("https://example.com/connect/test-room");
    expect(response.status).toBe(426);
    const text = await response.text();
    expect(text).toContain("Expected Upgrade: websocket");
  });

  it("should respect environment configurations (e.g. API Key)", async () => {
    // Assuming TEST_HUDDLE_API_KEY is a required env var
    // Just verifying that it's accessible and defined
    expect(env.TEST_HUDDLE_API_KEY).toBeTruthy();
  });

  it("should properly handle request origins", async () => {
    // Make a request from an allowed origin
    const allowedResponse = await SELF.fetch("https://example.com/init", {
      method: "OPTIONS",
      headers: {
        "Origin": "https://charli.chat",
        "Access-Control-Request-Method": "POST"
      }
    });
    expect(allowedResponse.headers.get("access-control-allow-origin")).toBe("https://charli.chat");

    // Make a request from a disallowed origin
    const disallowedResponse = await SELF.fetch("https://example.com/init", {
      method: "OPTIONS",
      headers: {
        "Origin": "https://unallowed-origin.com",
        "Access-Control-Request-Method": "POST"
      }
    });
    // For disallowed origins, the default behavior should be no CORS headers
    expect(disallowedResponse.headers.get("access-control-allow-origin")).toBeNull();
  });

});


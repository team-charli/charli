export class WebSocketManager {
  private clients: Set<WebSocket>;

  constructor(state: DurableObjectState) {
    this.clients = new Set();
  }

  async fetch(request: Request) {
    if (request.method === "GET" && request.url.endsWith("/websocket")) {
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      server.accept();
      this.clients.add(server);

      server.addEventListener("close", () => {
        this.clients.delete(server);
      });

      return new Response(null, { status: 101, webSocket: client });
    } else if (request.method === "POST" && request.url.endsWith("/broadcast")) {
      const { message } = await request.json();
      this.broadcast(message);
      return new Response("OK");
    }

    return new Response("Not found", { status: 404 });
  }

  broadcast(message: string) {
    for (const client of this.clients) {
      client.send(message);
    }
  }
}

import { TimerObject } from './timerObject';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Check if the request is a WebSocket upgrade.
    if (request.headers.get('Upgrade') === 'websocket') {
      const id = env.TIMER.newUniqueId();
      const stub = env.TIMER.get(id);
      // Forward WebSocket upgrade requests to the TimerObject.
      return stub.fetch(request);
    }

    // Handle other requests, such as setting a timer.
    if (request.method === 'POST') {
      const { duration } = await request.json<any>();
      const id = env.TIMER.newUniqueId();
      const stub = env.TIMER.get(id);
      // Here, you might want to save the id or pass it to the client in some way.
      // This example just calls the TimerObject directly to set the duration.
      return stub.fetch(new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify({ duration })
      }));
    }

    return new Response('Method not allowed', { status: 405 });
  },
};


interface Env {
  TIMER: DurableObjectNamespace;
}



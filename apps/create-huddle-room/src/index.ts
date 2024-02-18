interface Env {
  API_KEY: string;
}

interface RoomCreationRequest {
  title: string;
  hostWallet: string;
}

export default {

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Try to parse the request body
    let data;
    try {
      data = await request.json() as RoomCreationRequest;
    } catch (err) {
      return new Response("Invalid JSON", { status: 400 });
    }

    const { title, hostWallet } = data;

    // Validate inputs
    if (!title || !hostWallet) {
      return new Response("Missing title or hostWallet", { status: 400 });
    }

    const API_KEY = env.API_KEY; // Assuming your API key is stored in environment variables

    try {
      const apiResponse = await fetch("https://api.huddle01.com/api/v1/create-room", {
        method: "POST",
        body: JSON.stringify({
          title: title,
          hostWallets: [hostWallet]
        }),
        headers: {
          "Content-Type": "application/json",
          'x-api-key': API_KEY,
        }
      });

      // Check if the Huddle01 request was successful
      if (apiResponse.ok) {
        const responseBody = await apiResponse.json();
        return new Response(JSON.stringify(responseBody), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        // Forward the error from the Huddle01 API
        return new Response(`API Error: ${await apiResponse.text()}`, { status: apiResponse.status });
      }
    } catch (error) {
      return new Response(`Error: ${error}`, { status: 500 });
    }
  },
};

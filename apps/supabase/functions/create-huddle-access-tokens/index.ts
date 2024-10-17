import { AccessToken, Role } from 'https://esm.sh/@huddle01/server-sdk/auth';
import { corsHeaders } from '../_shared/cors.ts';

const huddleApiKey = Deno.env.get('HUDDLE_API_KEY') ?? '';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method === "POST") {
    try {
      const { roomId } = await req.json();
      const accessToken = new AccessToken({
        apiKey: huddleApiKey,
        roomId: roomId,
        role: Role.GUEST,
        options: {
          metadata: {
            // Custom attributes here
          },
        },
      });
      const data = {status: "Success", accessToken: accessToken.toJwt(), roomId};
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    catch (error) {
      return new Response(JSON.stringify({ error: 'Error processing request: ' + error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});

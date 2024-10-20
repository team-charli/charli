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
      console.log('Received roomId:', roomId);

      const accessToken = new AccessToken({
        apiKey: huddleApiKey,
        roomId: roomId,
        role: Role.GUEST,
        permissions: {
          admin: true,
          canConsume: true,
          canProduce: true,
          canProduceSources: {
            cam: true,
            mic: true,
            screen: true,
          },
          canRecvData: true,
          canSendData: true,
          canUpdateMetadata: true,
        },
        options: {
          metadata: {
            // You can add any custom attributes here
          },
        },
      });

      const token = await accessToken.toJwt();
      console.log('JWT generated:', token);

      const data = { status: "Success", accessToken: token, roomId: roomId };

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: 'Error processing request' }), {
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

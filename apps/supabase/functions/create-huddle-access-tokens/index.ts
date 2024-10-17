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
        options: {
          metadata: {
            // Custom attributes here
          },
        },
      });

      console.log('AccessToken created:', accessToken);

      const response = await fetch('https://api.huddle01.com/api/v2/sdk/rooms/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': huddleApiKey,
        },
        body: JSON.stringify({
          roomLocked: false,
          metadata: {}  // Empty object as per the new requirements
        }),
      });

      console.log('Huddle01 API response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const roomData = await response.json();
      console.log('Room data:', roomData);

      const jwt = await accessToken.toJwt();
      console.log('JWT generated:', jwt);

      const data = {status: "Success", accessToken: jwt, roomId: roomData.data.roomId};
      console.log('Response data:', data);

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    catch (error) {
      console.error('Error:', error);
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

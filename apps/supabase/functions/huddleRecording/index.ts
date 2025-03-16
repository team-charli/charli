//supabase/functions/huddleRecording/index.ts

import { Recorder } from 'https://esm.sh/@huddle01/server-sdk/recorder';
import { AccessToken, Role } from 'https://esm.sh/@huddle01/server-sdk/auth';
import { Hono } from 'jsr:@hono/hono';
import { cors } from 'jsr:@hono/hono/cors';

const functionName = 'huddleRecording';
const app = new Hono().basePath(`/${functionName}`);

// Global CORS Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
}));

// Explicit OPTIONS handling with HTTP 200 status
app.options('*', (c) =>
  c.newResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  })
);

// Unified endpoint handling both start and stop actions
app.post('/', async (c) => {
  const { roomId, action } = await c.req.json();

  if (!roomId || !action) {
    return c.json({ error: 'Missing roomId or action' }, 400);
  }

  const recorder = new Recorder(
    Deno.env.get('HUDDLE_PROJECT_ID')!,
    Deno.env.get('HUDDLE_API_KEY')!
  );

  if (action === 'startHuddleRecording') {
    const recorderToken = new AccessToken({
      apiKey: Deno.env.get('HUDDLE_API_KEY')!,
      roomId,
      role: Role.BOT,
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
    });

    const jwt = await recorderToken.toJwt();
    const recording = await recorder.startRecording({
      roomId,
      token: jwt,
      pinToIpfs: true,
      options: { audioOnly: true },
    });

    console.log('[startHuddleRecording]', recording);

    return c.json({ status: 'Recording started', recording }, 200);

    return c.json({ status: 'Recording started', recording }, 200);
  } else if (action === 'stopHuddleRecording') {
    const recording = await recorder.stop({ roomId });
    return c.json({ status: 'Recording stopped', recording }, 200);
  }

  return c.json({ error: 'Invalid action' }, 400);
});

// Start server
Deno.serve(app.fetch);

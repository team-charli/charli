// file: huddle-edge-function.ts
import { Hono } from 'jsr:@hono/hono'
import { cors } from 'jsr:@hono/hono/cors'
import { AccessToken, Role } from 'https://esm.sh/@huddle01/server-sdk/auth'

const HUDDLE_API_KEY = Deno.env.get('HUDDLE_API_KEY') ?? ''
const huddleApiKey = HUDDLE_API_KEY;
const functionName = 'huddle-minimal'
const app = new Hono().basePath(`/${functionName}`)

// OPTIONAL: Add CORS so you can call from anywhere
app.use('*', cors({ origin: '*', allowMethods: ['POST'] }))

/**
 * POST /create-room
 */

app.post('/create-room', async (c) => {
  try {
    const requestBody = {
      title: 'Huddle Test Room',
      roomLocked: false,
    }

    // Call the Huddle create-room API
    const response = await fetch('https://api.huddle01.com/api/v2/sdk/rooms/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': HUDDLE_API_KEY,
        'Accept': '*/*',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errMsg = await response.text()
      return c.json({ error: 'Huddle create-room failed', details: errMsg }, 500)
    }

    const data = await response.json()
    const roomId = data?.data?.roomId
    if (!roomId) {
      return c.json({ error: 'No roomId returned by Huddle' }, 500)
    }

    return c.json({ roomId }, 200)
  } catch (error) {
    console.error('Error in /create-room:', error)
    return c.json({ error: error.message }, 500)
  }
})

/**
 * POST /create-access-token
 * body: { roomId: string; role?: string }
 *
 * Example body:
 * {
 *   "roomId": "abc-defg-hij",
 *   "role": "guest"
 * }
 */
app.post('/create-access-token', async (c) => {
  try {
    const { roomId } = await c.req.json<{ roomId: string; role?: string }>()
    if (!roomId) {
      return c.json({ error: 'Missing roomId' }, 400)
    }


    // Construct an AccessToken from Huddle’s server-sdk
    const accessToken = new AccessToken({
      apiKey: huddleApiKey,
      roomId,
      // If you always want "GUEST", you can remove `role` in constructor.
      // Or pass "role" if your logic requires dynamic roles:
      role: Role.GUEST,
      permissions: {
        admin: false,
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
    })

    // Generate the JWT
    const token = await accessToken.toJwt()

    return c.json(
      {
        status: 'Success',
        accessToken: token,
        roomId,
      },
      200
    )
  } catch (error) {
    console.error('Error in /create-access-token:', error)
    return c.json({ error: error.message }, 500)
  }
})

// 405 for any other method or route
app.all('*', (c) => c.json({ error: 'Not Found' }, 404))

// Optional global error handler
app.onError((err, c) => {
  console.error('Global error handler:', err)
  return c.json({ error: err?.message || 'Unknown Error' }, 500)
})

// Start the server (Edge function entry point)
Deno.serve(app.fetch)

///Users/zm/Projects/charli/apps/supabase/functions/create-huddle-access-tokens/index.ts
import { Hono } from 'jsr:@hono/hono'
import { cors } from 'jsr:@hono/hono/cors'
import { AccessToken, Role } from 'https://esm.sh/@huddle01/server-sdk/auth'

// If you used to import a shared "corsHeaders", you can remove that import now,
// because we'll rely on Hono's cors() middleware for CORS.

const huddleApiKey = Deno.env.get('HUDDLE_API_KEY') ?? ''

/** -- Hono Setup -- **/
// Must match your function folder name, i.e. "create-huddle-access-tokens"
const functionName = 'create-huddle-access-tokens'
const app = new Hono().basePath(`/${functionName}`)

// Enable CORS on all subpaths
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['POST', 'OPTIONS'], // Only allow POST (and preflight)
    allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
  })
)

/** Main POST route **/
app.post('/', async (c) => {
  try {
    // Parse the JSON body
    const { roomId, role, hashedUserAddress } = await c.req.json()
    console.log('Received roomId:', roomId)

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
      options: {
        metadata: {
          sessionId: roomId,
          role, // This is just an example if you want to store it in metadata
          hashedAddress: hashedUserAddress,
        },
      },
    })

    const token = await accessToken.toJwt()
    console.log('JWT generated:', token)

    const data = { status: 'Success', accessToken: token, roomId }

    return c.json(data, 200)
  } catch (error) {
    console.error('Error:', error)
    return c.json({ error: 'Error processing request' }, 500)
  }
})

/** Return 405 for any other method on this path **/
app.all('*', (c) => {
  return c.json({ error: 'Method Not Allowed' }, 405)
})

/** Optional global error handler **/
app.onError((err, c) => {
  console.error('Global error handler:', err)
  return c.json({ error: err.message }, 500)
})

/** Start the server **/
Deno.serve(app.fetch)

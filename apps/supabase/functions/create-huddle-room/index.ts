// /Users/zm/Projects/charli/apps/supabase/functions/create-huddle-room/index.ts
import { Hono } from 'jsr:@hono/hono'
import { cors } from 'jsr:@hono/hono/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Constants
const functionName = 'create-huddle-room'
const app = new Hono().basePath(`/${functionName}`)

// ──────────────────────────────── CORS ────────────────────────────────
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type', 'accept'],
  })
)

// Environment Variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const huddleApiKey = Deno.env.get('HUDDLE_API_KEY') ?? ''

// Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey)

// Utility: Fetch with Timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 5000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

// Utility: Retry Logic
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchWithTimeout(url, options, 5000 + i * 2000) // Incremental timeout
      if (res.ok) return res
      console.error(`Huddle API failed, attempt ${i + 1}, status: ${res.status}`)
    } catch (err) {
      console.error(`Huddle API request error: ${err}`)
    }
    await new Promise((r) => setTimeout(r, delay * (i + 1)))
  }
  throw new Error(`Huddle API failed after ${retries} retries.`)
}

// Route: POST /
app.post('/', async (c) => {
  try {
    const payload = await c.req.json<{ record: { session_id: number | string } }>()
    const sessionId = payload?.record?.session_id
    if (!sessionId) return c.text('Invalid session_id', 400)

    // Create Huddle room with retry
    const response = await fetchWithRetry('https://api.huddle01.com/api/v2/sdk/rooms/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': huddleApiKey,
        Accept: '*/*',
      },
      body: JSON.stringify({
        title: `Huddle01 Session ${sessionId}`,
        roomLocked: false,
      }),
    })

    const data = await response.json()
    const roomId = data?.data?.roomId
    if (!roomId) throw new Error('No roomId returned from Huddle API')

    // Check if this is a RoboTest request (session ID starts with 'robo-')
    const isRoboTest = typeof sessionId === 'string' && sessionId.startsWith('robo-')
    
    if (!isRoboTest) {
      // Only update DB for regular sessions (not RoboTest)
      const { error } = await supabase.from('sessions').update({ huddle_room_id: roomId }).eq('session_id', sessionId)
      if (error) {
        console.error('Supabase update error:', error)
        return c.text('Error updating session', 500)
      }
      console.log('Session updated successfully:', sessionId)
    } else {
      console.log('RoboTest mode: skipping database update for session ID:', sessionId)
    }
    
    // Return the roomId for RoboTest mode or success message for regular mode
    return c.json({
      roomId: roomId,
      message: isRoboTest ? 'RoboTest room created successfully' : 'Session updated successfully'
    })
  } catch (err: any) {
    console.error('Error processing request:', err)
    return c.text(`Internal Server Error: ${err.message}`, 500)
  }
})

// Serve
Deno.serve(app.fetch)

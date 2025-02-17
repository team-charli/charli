///Users/zm/Projects/charli/apps/supabase/functions/create-huddle-room/index.ts
import { Hono } from 'jsr:@hono/hono'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Constants
const functionName = 'create-huddle-room'
const app = new Hono().basePath(`/${functionName}`)

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
      const res = await fetchWithTimeout(url, options, 5000 + i * 2000) // Increase timeout per retry
      if (res.ok) return res
      console.error(`Huddle API failed, attempt ${i + 1}, status: ${res.status}`)
    } catch (err) {
      console.error(`Huddle API request error: ${err}`)
    }
    await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)))
  }
  throw new Error(`Huddle API failed after ${retries} retries.`)
}

// API Route
app.post('/', async (c) => {
  try {
    const payload = await c.req.json<{ record: { session_id: number } }>()
    const sessionId = payload?.record?.session_id
    if (!sessionId) {
      return c.text('Invalid session_id', 400)
    }

    // Huddle API Call with Retry
    const response = await fetchWithRetry('https://api.huddle01.com/api/v2/sdk/rooms/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': huddleApiKey, // Fixed incorrect syntax
        'Accept': '*/*',
      },
      body: JSON.stringify({
        title: 'Huddle01-Test',
        hostWallets: ['0x29f54719E88332e70550cf8737293436E9d7b10b'], // Matches API docs
      }),
    })

    const data = await response.json()
    const roomId = data?.data?.roomId
    if (!roomId) {
      throw new Error('No roomId returned from Huddle API')
    }

    // Update Database
    const { error } = await supabase
      .from('sessions')
      .update({ huddle_room_id: roomId })
      .eq('session_id', sessionId)

    if (error) {
      console.error('Supabase update error:', error)
      return c.text('Error updating session', 500)
    }

    console.log('Session updated successfully:', sessionId)
    return c.text('Session updated successfully', 200)
  } catch (err) {
    console.error('Error processing request:', err)
    return c.text(`Internal Server Error: ${err.message}`, 500)
  }
})

// Serve Function
Deno.serve(app.fetch)

import { Hono } from 'jsr:@hono/hono'
import { cors } from 'jsr:@hono/hono/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

/** ENV & SUPABASE SETUP **/
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

/** REQUEST BODY INTERFACE **/
interface RequestBody {
  teacherId: number
  learnerId: number
  proposedTime: string
  durationMinutes: number
}

/** CREATE HONO APP & BASE PATH **/
const functionName = 'check-slot-availability'
const app = new Hono().basePath(`/${functionName}`)

/** SET UP CORS MIDDLEWARE **/
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
  })
)

/** MAIN ROUTE: POST / **/
app.post('/', async (c) => {
  try {
    // Parse body
    const body = (await c.req.json()) as RequestBody
    console.log('Request body:', body)

    // Validate required fields
    const { teacherId, learnerId, proposedTime, durationMinutes } = body

    if (!teacherId || !learnerId) {
      return c.json({ error: 'Missing teacherId or learnerId in request' }, 400)
    }
    if (!proposedTime) {
      return c.json({ error: 'Missing proposedTime in request' }, 400)
    }
    if (!durationMinutes) {
      return c.json({ error: 'Missing durationMinutes in request' }, 400)
    }

    // Build the proposed time slot
    const proposedSlot = `["${proposedTime}", "${new Date(
      new Date(proposedTime).getTime() + (durationMinutes + 10) * 60000
    ).toISOString()}"]`

    // Call the database function to check for conflicts
    const { data, error } = await supabase.rpc('check_slot_conflict', {
      t_id: teacherId,
      l_id: learnerId,
      proposed_slot: proposedSlot
    })

    if (error) {
      console.error('Database error:', error)
      return c.json({ error: error.message }, 500)
    }

    // Return the conflict status
    return c.json({ conflict: data }, 200)
  } catch (error: any) {
    console.error('Unexpected error', { error: error.message, stack: error.stack })
    return c.json(
      {
        error: 'Unexpected error occurred',
        details: error.message,
      },
      500
    )
  }
})

/** ERROR HANDLER **/
app.onError((err, c) => {
  console.error('Global error handler:', err)
  return c.json({ error: err.message }, 500)
})

/** START THE SERVER **/
Deno.serve(app.fetch)
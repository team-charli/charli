import { Hono } from 'hono'
import { Env } from './env'

const app = new Hono<{ Bindings: Env }>()

// WebSocket endpoint (connections managed by MessageRelay)
app.get('/connect/:sessionId', (c) => {
  if (c.req.header('upgrade') !== 'websocket') {
    return c.text('Expected WebSocket upgrade', 426)
  }

  const sessionId = c.req.param('sessionId')
  const relayDO = c.env.MESSAGE_RELAY_DO.get(
    c.env.MESSAGE_RELAY_DO.idFromName(sessionId)
  )

  return relayDO.fetch(c.req.raw)
})

// Endpoint for receiving audio data (handled by LearnerAssessmentDO)
app.post('/audio/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const assessmentDO = c.env.LEARNER_ASSESSMENT_DO.get(
    c.env.LEARNER_ASSESSMENT_DO.idFromName(sessionId)
  )

  return assessmentDO.fetch(c.req.raw)
})

export default app

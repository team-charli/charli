import { DurableObject } from 'cloudflare:workers'
import { Hono } from 'hono'
import { Env } from './env'

export class LearnerAssessmentDO extends DurableObject<Env> {
  private audioChunks: Uint8Array[] = []
  private app = new Hono()

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)

    this.app.post('/chunk', async (c) => {
      const chunk = new Uint8Array(await c.req.arrayBuffer())
      this.audioChunks.push(chunk)
      return c.text('chunk received', 200)
    })

    this.app.post('/end-session/:sessionId', async (c) => {
      const sessionId = c.req.param('sessionId')
      await this.processFinalTranscription(sessionId)
      return c.json({ status: 'transcription triggered' })
    })
  }

  async fetch(request: Request) {
    return this.app.fetch(request)
  }

  private async processFinalTranscription(sessionId: string) {
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' })

    const hfRes = await fetch(
      'https://api-inference.huggingface.co/models/facebook/wav2vec2-large-xlsr-53-spanish',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.HF_API_TOKEN}`,
          'Content-Type': 'audio/wav',
        },
        body: audioBlob,
      }
    )

    const relayDO = this.env.MESSAGE_RELAY_DO.get(
      this.env.MESSAGE_RELAY_DO.idFromName(sessionId)
    )

    if (!hfRes.ok) {
      await relayDO.fetch('http://relay/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          type: 'transcription-error',
          data: { error: 'Transcription failed' }
        })
      })
      return
    }

    const transcription = await hfRes.json()

    await relayDO.fetch('http://relay/broadcast', {
      method: 'POST',
      body: JSON.stringify({ type: 'verbatimTranscript', data: transcription }),
    })

    this.audioChunks = []
  }
}

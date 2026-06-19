import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

async function signIn(app: ReturnType<typeof createTestApp>['app']) {
  const res = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
  return sessionCookie(res)
}

describe('POST /api/ai/generate-draft', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const { app } = createTestApp()
    const res = await app.request('/api/ai/generate-draft', jsonRequest('POST', { prompt: 'hi' }))
    expect(res.status).toBe(401)
  })

  it('returns a valid draft project and logs the prompt for an authed user', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-draft',
      jsonRequest('POST', { prompt: 'a calm mono chip' }, cookie),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { project: { schemaVersion: number; blocks: unknown[] } }
    expect(body.project.schemaVersion).toBe(5)
    expect(body.project.blocks.length).toBeGreaterThan(0)
    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(1)
  })

  it('enforces the daily quota with 429', async () => {
    const { app } = createTestApp(Date.now, { aiDailyQuota: 1 })
    const cookie = await signIn(app)
    await app.request('/api/ai/generate-draft', jsonRequest('POST', { prompt: 'one' }, cookie))
    const res = await app.request(
      '/api/ai/generate-draft',
      jsonRequest('POST', { prompt: 'two' }, cookie),
    )
    expect(res.status).toBe(429)
  })
})

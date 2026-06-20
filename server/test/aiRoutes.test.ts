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

  it('returns a project whose theme reflects the prompt-derived fake draft', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-draft',
      jsonRequest('POST', { prompt: 'a calm mono chip' }, cookie),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { project: { theme: string } }
    expect(body.project.theme).toBe('mono')
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

const COPY_BODY = {
  context: { name: 'NEON', theme: 'neon', dieShape: 'rect', blockTypes: ['CPU', 'Cache'] },
}

describe('POST /api/ai/generate-copy', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const { app } = createTestApp()
    const res = await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY_BODY))
    expect(res.status).toBe(401)
  })

  it('returns a valid FakeSpec and logs a generate-copy prompt for an authed user', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY_BODY, cookie))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { spec: { brand: string; features: unknown[]; cores: number } }
    expect(typeof body.spec.brand).toBe('string')
    expect(Array.isArray(body.spec.features)).toBe(true)
    expect(Number.isInteger(body.spec.cores)).toBe(true)
    const row = db.prepare('SELECT kind FROM ai_prompt_log').get() as { kind: string }
    expect(row.kind).toBe('generate-copy')
  })

  it('rejects a missing context with 400', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request('/api/ai/generate-copy', jsonRequest('POST', {}, cookie))
    expect(res.status).toBe(400)
  })

  it('enforces the shared daily quota with 429', async () => {
    const { app } = createTestApp(Date.now, { aiDailyQuota: 1 })
    const cookie = await signIn(app)
    await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY_BODY, cookie))
    const res = await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY_BODY, cookie))
    expect(res.status).toBe(429)
  })

  it('returns 503 when the provider throws', async () => {
    const failing = {
      async generateChipDraft() {
        throw new Error('down')
      },
      async generateSpecCopy() {
        throw new Error('down')
      },
      async generateLayoutSuggestions() {
        throw new Error('down')
      },
    }
    const { app } = createTestApp(Date.now, { aiProvider: failing })
    const cookie = await signIn(app)
    const res = await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY_BODY, cookie))
    expect(res.status).toBe(503)
  })
})

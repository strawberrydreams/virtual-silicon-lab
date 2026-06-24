import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

const DRAFT = { prompt: 'a neon dream chip' }
const COPY = {
  context: {
    name: 'NOVA',
    theme: 'neon',
    dieShape: 'rect',
    blockTypes: ['CPU', 'Cache'],
  },
}
const SUGGEST = {
  context: {
    dieShape: 'rect',
    blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
  },
}
const VARIATIONS = {
  context: {
    name: 'NOVA',
    theme: 'neon',
    dieShape: 'rect',
    blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
  },
  count: 3,
}

async function signIn(app: ReturnType<typeof createTestApp>['app']) {
  const res = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
  return sessionCookie(res)
}

describe('AI surface end-to-end (fake provider)', () => {
  it('runs all four AI endpoints for a signed-in user and logs each call', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)

    const draft = await app.request('/api/ai/generate-draft', jsonRequest('POST', DRAFT, cookie))
    expect(draft.status).toBe(200)
    expect(
      ((await draft.json()) as { project: { schemaVersion: number } }).project.schemaVersion,
    ).toBe(CURRENT_SCHEMA_VERSION)

    const copy = await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY, cookie))
    expect(copy.status).toBe(200)
    expect(typeof ((await copy.json()) as { spec: { brand: string } }).spec.brand).toBe('string')

    const suggest = await app.request(
      '/api/ai/suggest-layout',
      jsonRequest('POST', SUGGEST, cookie),
    )
    expect(suggest.status).toBe(200)
    expect(Array.isArray(((await suggest.json()) as { suggestions: unknown[] }).suggestions)).toBe(
      true,
    )

    const variations = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', VARIATIONS, cookie),
    )
    expect(variations.status).toBe(200)
    expect(
      ((await variations.json()) as { variations: unknown[] }).variations.length,
    ).toBeGreaterThan(0)

    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(4)
  })

  it('shares the 24h quota across all AI kinds', async () => {
    const { app } = createTestApp(Date.now, { aiDailyQuota: 4 })
    const cookie = await signIn(app)

    expect(
      (await app.request('/api/ai/generate-draft', jsonRequest('POST', DRAFT, cookie))).status,
    ).toBe(200)
    expect(
      (await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY, cookie))).status,
    ).toBe(200)
    expect(
      (await app.request('/api/ai/suggest-layout', jsonRequest('POST', SUGGEST, cookie))).status,
    ).toBe(200)
    expect(
      (await app.request('/api/ai/generate-variations', jsonRequest('POST', VARIATIONS, cookie)))
        .status,
    ).toBe(200)

    const fifth = await app.request('/api/ai/generate-draft', jsonRequest('POST', DRAFT, cookie))
    expect(fifth.status).toBe(429)
  })
})

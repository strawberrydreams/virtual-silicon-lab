import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'
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
    expect(body.project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
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
    const body = (await res.json()) as {
      spec: { brand: string; features: unknown[]; cores: number }
    }
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
      async generateVariations() {
        throw new Error('down')
      },
    }
    const { app } = createTestApp(Date.now, { aiProvider: failing })
    const cookie = await signIn(app)
    const res = await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY_BODY, cookie))
    expect(res.status).toBe(503)
  })
})

const SUGGEST_BODY = {
  context: { dieShape: 'rect', blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }] },
}

describe('POST /api/ai/suggest-layout', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const { app } = createTestApp()
    const res = await app.request('/api/ai/suggest-layout', jsonRequest('POST', SUGGEST_BODY))
    expect(res.status).toBe(401)
  })

  it('returns suggestions and logs a suggest-layout prompt for an authed user', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/suggest-layout',
      jsonRequest('POST', SUGGEST_BODY, cookie),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { suggestions: unknown[] }
    expect(Array.isArray(body.suggestions)).toBe(true)
    const row = db.prepare('SELECT kind FROM ai_prompt_log').get() as { kind: string }
    expect(row.kind).toBe('suggest-layout')
  })

  it('rejects a missing context with 400', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request('/api/ai/suggest-layout', jsonRequest('POST', {}, cookie))
    expect(res.status).toBe(400)
  })

  it('enforces the shared daily quota with 429', async () => {
    const { app } = createTestApp(Date.now, { aiDailyQuota: 1 })
    const cookie = await signIn(app)
    await app.request('/api/ai/suggest-layout', jsonRequest('POST', SUGGEST_BODY, cookie))
    const res = await app.request(
      '/api/ai/suggest-layout',
      jsonRequest('POST', SUGGEST_BODY, cookie),
    )
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
      async generateVariations() {
        throw new Error('down')
      },
    }
    const { app } = createTestApp(Date.now, { aiProvider: failing })
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/suggest-layout',
      jsonRequest('POST', SUGGEST_BODY, cookie),
    )
    expect(res.status).toBe(503)
  })
})

const VARIATIONS_BODY = {
  context: {
    name: 'NOVA',
    theme: 'neon',
    dieShape: 'rect',
    blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
  },
  count: 3,
}

describe('POST /api/ai/generate-variations', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const { app } = createTestApp()
    const res = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', VARIATIONS_BODY),
    )
    expect(res.status).toBe(401)
  })

  it('returns N valid variation projects and logs one generate-variations prompt', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', VARIATIONS_BODY, cookie),
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as { variations: { schemaVersion: number }[] }
    expect(body.variations).toHaveLength(3)
    expect(
      body.variations.every((variation) => variation.schemaVersion === CURRENT_SCHEMA_VERSION),
    ).toBe(true)
    const rows = db.prepare('SELECT kind FROM ai_prompt_log').all() as { kind: string }[]
    expect(rows).toEqual([{ kind: 'generate-variations' }])
  })

  it('clamps a high count to 4 and defaults an invalid count to 3', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const high = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', { ...VARIATIONS_BODY, count: 9 }, cookie),
    )
    const highBody = (await high.json()) as { variations: unknown[] }
    expect(highBody.variations).toHaveLength(4)

    const invalid = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', { ...VARIATIONS_BODY, count: 0 }, cookie),
    )
    const invalidBody = (await invalid.json()) as { variations: unknown[] }
    expect(invalidBody.variations).toHaveLength(3)
  })

  it('rejects a missing context with 400', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', { count: 3 }, cookie),
    )
    expect(res.status).toBe(400)
  })

  it('enforces the shared daily quota with 429', async () => {
    const { app } = createTestApp(Date.now, { aiDailyQuota: 1 })
    const cookie = await signIn(app)
    await app.request('/api/ai/generate-variations', jsonRequest('POST', VARIATIONS_BODY, cookie))
    const res = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', VARIATIONS_BODY, cookie),
    )
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
      async generateVariations() {
        throw new Error('down')
      },
    }
    const { app } = createTestApp(Date.now, { aiProvider: failing })
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', VARIATIONS_BODY, cookie),
    )
    expect(res.status).toBe(503)
  })
})

describe('AI route abuse bounds', () => {
  it('rejects an over-long prompt with 400 and writes no log row', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-draft',
      jsonRequest('POST', { prompt: 'x'.repeat(2001) }, cookie),
    )

    expect(res.status).toBe(400)
    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(0)
  })

  it('rejects an oversized suggest-layout context before logging', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const blocks = Array.from({ length: 65 }, () => ({
      type: 'CPU',
      x: 0,
      y: 0,
      w: 0.1,
      h: 0.1,
    }))
    const res = await app.request(
      '/api/ai/suggest-layout',
      jsonRequest('POST', { context: { dieShape: 'rect', blocks } }, cookie),
    )

    expect(res.status).toBe(400)
    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(0)
  })

  it('rejects an oversized generate-variations context before logging', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const blocks = Array.from({ length: 65 }, () => ({
      type: 'CPU',
      x: 0,
      y: 0,
      w: 0.1,
      h: 0.1,
    }))
    const res = await app.request(
      '/api/ai/generate-variations',
      jsonRequest(
        'POST',
        { context: { theme: 'neon', dieShape: 'rect', blocks }, count: 3 },
        cookie,
      ),
    )

    expect(res.status).toBe(400)
    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(0)
  })

  it('rejects an oversized generate-copy context before logging', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const blockTypes = Array.from({ length: 65 }, () => 'CPU')
    const res = await app.request(
      '/api/ai/generate-copy',
      jsonRequest('POST', { context: { theme: 'neon', dieShape: 'rect', blockTypes } }, cookie),
    )

    expect(res.status).toBe(400)
    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(0)
  })
})

const USAGE_ADMIN_OPTS = { signupsOpen: true, adminEmails: ['ada@example.com'] }
const USAGE_NON_ADMIN = {
  email: 'eve@example.com',
  displayName: 'Eve',
  password: 'hunter22hunter22',
}

describe('GET /api/ai/usage', () => {
  it('rejects anonymous callers with 401', async () => {
    const { app } = createTestApp(Date.now, USAGE_ADMIN_OPTS)

    expect((await app.request('/api/ai/usage')).status).toBe(401)
  })

  it('rejects non-admins with 403', async () => {
    const { app } = createTestApp(Date.now, USAGE_ADMIN_OPTS)
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', USAGE_NON_ADMIN))
    const cookie = sessionCookie(signup)

    const res = await app.request('/api/ai/usage', { headers: { cookie } })

    expect(res.status).toBe(403)
  })

  it('returns an aggregate usage summary for an admin', async () => {
    const { app } = createTestApp(Date.now, USAGE_ADMIN_OPTS)
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)
    await app.request(
      '/api/ai/generate-draft',
      jsonRequest('POST', { prompt: 'a neon chip' }, cookie),
    )

    const res = await app.request('/api/ai/usage', { headers: { cookie } })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { totalCalls: number; byKind: Record<string, number> }
    expect(body.totalCalls).toBeGreaterThanOrEqual(1)
    expect(body.byKind['generate-draft']).toBeGreaterThanOrEqual(1)
  })
})

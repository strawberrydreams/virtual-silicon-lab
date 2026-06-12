import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'
import { createApp } from '../src/app'

describe('GET /api/health', () => {
  it('reports ok with the shared domain project schema version', async () => {
    const app = createApp()
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      projectSchemaVersion: CURRENT_SCHEMA_VERSION,
    })
  })

  it('returns 404 for unknown api routes', async () => {
    const app = createApp()
    const res = await app.request('/api/nope')
    expect(res.status).toBe(404)
  })
})

import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, VALID_SIGNUP } from './helpers'

describe('signup access gate', () => {
  it('rejects signup with 403 when signups are closed', async () => {
    const { app } = createTestApp(Date.now, { signupsOpen: false })
    const res = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('signups_closed')
  })

  it('allows signup when signups are open', async () => {
    const { app } = createTestApp(Date.now, { signupsOpen: true })
    const res = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    expect(res.status).toBe(201)
  })

  it('reports signupsOpen on the health endpoint', async () => {
    const { app } = createTestApp(Date.now, { signupsOpen: false })
    const res = await app.request('/api/health')
    const body = (await res.json()) as { signupsOpen: boolean }
    expect(body.signupsOpen).toBe(false)
  })
})

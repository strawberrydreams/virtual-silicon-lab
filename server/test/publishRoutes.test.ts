import { describe, expect, it } from 'vitest'
import { createProject } from '@domain/projectFactory'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

const png = 'data:image/png;base64,iVBORw0KGgo='

function publishPayload(project = createProject('Ada Chip', 'project-1', 1_000)) {
  return {
    project,
    title: project.name,
    dieImageDataUrl: png,
    posterImageDataUrl: png,
    isPublic: false,
  }
}

async function signedInCookie() {
  const { app, db } = createTestApp(() => 2_000)
  const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
  return { app, db, cookie: sessionCookie(signup) }
}

describe('publish routes', () => {
  it('rejects publish requests without a signed-in session', async () => {
    const { app } = createTestApp()
    const res = await app.request('/api/published-chips', jsonRequest('POST', publishPayload()))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Sign in required.' },
    })
  })

  it('publishes a chip snapshot for the current account', async () => {
    const { app, db, cookie } = await signedInCookie()
    const res = await app.request('/api/published-chips', {
      ...jsonRequest('POST', publishPayload()),
      headers: { 'content-type': 'application/json', cookie },
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as { chip: { sourceProjectId: string; version: number; isPublic: boolean; slug: string } }
    expect(body.chip).toMatchObject({ sourceProjectId: 'project-1', version: 1, isPublic: false })
    expect(body.chip.slug).toMatch(/^ada-chip-[a-f0-9]{8}$/)
    expect(db.prepare('SELECT COUNT(*) AS n FROM published_chips').get()).toEqual({ n: 1 })
  })

  it('returns the current account publish record for a source project', async () => {
    const { app, cookie } = await signedInCookie()
    await app.request('/api/published-chips', {
      ...jsonRequest('POST', publishPayload()),
      headers: { 'content-type': 'application/json', cookie },
    })

    const res = await app.request('/api/published-chips/source/project-1', { headers: { cookie } })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ chip: { sourceProjectId: 'project-1', version: 1 } })
  })

  it('republishes by updating the existing source project record', async () => {
    const { app, db, cookie } = await signedInCookie()
    await app.request('/api/published-chips', {
      ...jsonRequest('POST', publishPayload()),
      headers: { 'content-type': 'application/json', cookie },
    })
    const project = { ...createProject('Ada Chip Rev B', 'project-1', 1_000), updatedAt: 3_000 }

    const res = await app.request('/api/published-chips', {
      ...jsonRequest('POST', { ...publishPayload(project), isPublic: true }),
      headers: { 'content-type': 'application/json', cookie },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      chip: { sourceProjectId: 'project-1', title: 'Ada Chip Rev B', version: 2, isPublic: true },
    })
    expect(db.prepare('SELECT COUNT(*) AS n FROM published_chips').get()).toEqual({ n: 1 })
  })

  it('toggles visibility for the current account source project', async () => {
    const { app, cookie } = await signedInCookie()
    await app.request('/api/published-chips', {
      ...jsonRequest('POST', publishPayload()),
      headers: { 'content-type': 'application/json', cookie },
    })

    const res = await app.request('/api/published-chips/source/project-1', {
      ...jsonRequest('PATCH', { isPublic: true }),
      headers: { 'content-type': 'application/json', cookie },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ chip: { sourceProjectId: 'project-1', isPublic: true, version: 1 } })
  })

  it('returns a public-only absolute shareUrl', async () => {
    const { app, cookie } = await signedInCookie()

    const publicRes = await app.request('/api/published-chips', {
      ...jsonRequest('POST', { ...publishPayload(), isPublic: true }),
      headers: { 'content-type': 'application/json', cookie },
    })
    const publicChip = ((await publicRes.json()) as { chip: { slug: string; shareUrl: string | null } }).chip
    expect(publicChip.shareUrl).toBe(`http://localhost/s/${publicChip.slug}`)

    const privateRes = await app.request('/api/published-chips/source/project-1', {
      ...jsonRequest('PATCH', { isPublic: false }),
      headers: { 'content-type': 'application/json', cookie },
    })
    const privateChip = ((await privateRes.json()) as { chip: { shareUrl: string | null } }).chip
    expect(privateChip.shareUrl).toBeNull()
  })

  it('unpublishes the current account source project', async () => {
    const { app, db, cookie } = await signedInCookie()
    await app.request('/api/published-chips', {
      ...jsonRequest('POST', publishPayload()),
      headers: { 'content-type': 'application/json', cookie },
    })

    const res = await app.request('/api/published-chips/source/project-1', {
      method: 'DELETE',
      headers: { cookie },
    })

    expect(res.status).toBe(204)
    expect(db.prepare('SELECT COUNT(*) AS n FROM published_chips').get()).toEqual({ n: 0 })
  })
})

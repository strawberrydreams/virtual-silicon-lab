import { describe, expect, it } from 'vitest'
import { createProject } from '@domain/projectFactory'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'
import { createFileImageStore } from '../src/images/fileImageStore'

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
    const body = (await res.json()) as {
      chip: { sourceProjectId: string; version: number; isPublic: boolean; slug: string }
    }
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
    expect(await res.json()).toMatchObject({
      chip: { sourceProjectId: 'project-1', isPublic: true, version: 1 },
    })
  })

  it('returns a public-only absolute shareUrl', async () => {
    const { app, cookie } = await signedInCookie()

    const publicRes = await app.request('/api/published-chips', {
      ...jsonRequest('POST', { ...publishPayload(), isPublic: true }),
      headers: { 'content-type': 'application/json', cookie },
    })
    const publicChip = (
      (await publicRes.json()) as { chip: { slug: string; shareUrl: string | null } }
    ).chip
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

  it('stores new publish PNGs as files and serves them through stable URLs', async () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'vsl-route-images-'))
    try {
      const imageStore = createFileImageStore({ rootDir })
      const { app, db } = createTestApp(() => 2_000, { imageStore })
      const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
      const cookie = sessionCookie(signup)

      const publish = await app.request('/api/published-chips', {
        ...jsonRequest('POST', { ...publishPayload(), isPublic: true }),
        headers: { 'content-type': 'application/json', cookie },
      })

      expect(publish.status).toBe(201)
      const body = (await publish.json()) as {
        chip: { dieImageUrl: string; posterImageUrl: string; slug: string }
      }
      expect(body.chip.dieImageUrl).toMatch(
        /^http:\/\/localhost\/uploads\/published\/.+\/v1-die\.png$/,
      )
      expect(body.chip.posterImageUrl).toMatch(
        /^http:\/\/localhost\/uploads\/published\/.+\/v1-poster\.png$/,
      )

      const row = db
        .prepare(
          'SELECT die_image_data_url, poster_image_data_url, die_image_path, poster_image_path FROM published_chips',
        )
        .get() as {
        die_image_data_url: string
        poster_image_data_url: string
        die_image_path: string
        poster_image_path: string
      }
      expect(row.die_image_data_url).toBe('')
      expect(row.poster_image_data_url).toBe('')
      expect(row.die_image_path).toMatch(/^\/uploads\/published\/.+\/v1-die\.png$/)
      expect(row.poster_image_path).toMatch(/^\/uploads\/published\/.+\/v1-poster\.png$/)

      const posterPath = new URL(body.chip.posterImageUrl).pathname
      const staticPoster = await app.request(posterPath)
      expect(staticPoster.status).toBe(200)
      expect(staticPoster.headers.get('content-type')).toBe('image/png')
      expect((await staticPoster.arrayBuffer()).byteLength).toBeGreaterThan(0)

      const sharePoster = await app.request(`/s/${body.chip.slug}/poster.png`)
      expect(sharePoster.status).toBe(200)
      expect(sharePoster.headers.get('content-type')).toBe('image/png')
      expect((await sharePoster.arrayBuffer()).byteLength).toBeGreaterThan(0)
    } finally {
      rmSync(rootDir, { recursive: true, force: true })
    }
  })
})

describe('GET /api/published-chips/mine', () => {
  it("returns the signed-in user's public visible chips only; 401 when anonymous", async () => {
    const { app, db } = createTestApp(() => 1_000, { signupsOpen: true, adminEmails: [] })
    const signup = await app.request(
      '/api/auth/signup',
      jsonRequest('POST', {
        email: 'me@test.com',
        displayName: 'Me',
        password: 'hunter22hunter22',
      }),
    )
    const cookie = sessionCookie(signup)
    const me = db.prepare('SELECT id FROM users WHERE email = ?').get('me@test.com') as {
      id: string
    }
    const insert = (id: string, isPublic: number, status: string) =>
      db
        .prepare(
          `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
           VALUES (?,?,?,?,?,'{}','','poster',?,?,0,1,0)`,
        )
        .run(id, me.id, `p-${id}`, `slug-${id}`, id, isPublic, status)
    insert('pub', 1, 'visible')
    insert('priv', 0, 'visible')
    insert('hidden', 1, 'hidden')

    const mine = (await (
      await app.request('/api/published-chips/mine', { headers: { cookie } })
    ).json()) as {
      chips: { id: string }[]
    }

    expect(mine.chips.map((chip) => chip.id)).toEqual(['pub'])
    expect((await app.request('/api/published-chips/mine')).status).toBe(401)
  })
})

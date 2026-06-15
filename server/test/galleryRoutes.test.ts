import { describe, expect, it } from 'vitest'
import { createProject } from '@domain/projectFactory'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'
import { upsertPublishedChip } from '../src/publish/service'

const pngA = 'data:image/png;base64,AAAA'
const pngB = 'data:image/png;base64,BBBB'

function insertUser(db: ReturnType<typeof createTestApp>['db'], id: string, email: string, displayName: string) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, email, displayName, 'hash', 1, 1)
}

function publishFixture() {
  const { app, db } = createTestApp()
  insertUser(db, 'u1', 'ada@example.com', 'Ada')
  insertUser(db, 'u2', 'grace@example.com', 'Grace')
  const publicOld = upsertPublishedChip(db, 'u1', {
    project: createProject('Ada Public', 'project-public-old', 1_000),
    title: 'Ada Public',
    dieImageDataUrl: pngA,
    posterImageDataUrl: pngB,
    isPublic: true,
  }, () => 2_000)
  const privateChip = upsertPublishedChip(db, 'u1', {
    project: createProject('Ada Private', 'project-private', 1_000),
    title: 'Ada Private',
    dieImageDataUrl: pngA,
    posterImageDataUrl: pngB,
    isPublic: false,
  }, () => 3_000)
  const publicNew = upsertPublishedChip(db, 'u2', {
    project: {
      ...createProject('Grace Public', 'project-public-new', 1_000),
      spec: {
        brand: 'GRACE',
        series: 'PUBLIC',
        generation: 'Gallery',
        process: '2nm public lithography',
        cores: 64,
        bandwidth: '2.2 TB/s',
        features: ['Gallery visible', 'Poster backed'],
        description: 'A chip published for the public gallery.',
      },
    },
    title: 'Grace Public',
    dieImageDataUrl: pngB,
    posterImageDataUrl: pngA,
    isPublic: true,
  }, () => 4_000)
  return { app, publicOld, privateChip, publicNew }
}

describe('public gallery routes', () => {
  it('lists only public chips newest first with owner and poster metadata', async () => {
    const { app, publicOld, publicNew } = publishFixture()

    const res = await app.request('/api/gallery')

    expect(res.status).toBe(200)
    const body = (await res.json()) as { chips: Array<{ slug: string; title: string; ownerDisplayName: string; posterImageUrl: string }> }
    expect(body.chips).toEqual([
      expect.objectContaining({
        slug: publicNew.slug,
        title: 'Grace Public',
        ownerDisplayName: 'Grace',
        posterImageUrl: pngA,
      }),
      expect.objectContaining({
        slug: publicOld.slug,
        title: 'Ada Public',
        ownerDisplayName: 'Ada',
        posterImageUrl: pngB,
      }),
    ])
  })

  it('returns a public chip detail with project spec and images', async () => {
    const { app, publicNew } = publishFixture()

    const res = await app.request(`/api/gallery/${publicNew.slug}`)

    expect(res.status).toBe(200)
    const body = (await res.json()) as { chip: { slug: string; ownerDisplayName: string; project: { spec: { brand: string; features: string[] } }; posterImageUrl: string } }
    expect(body.chip.slug).toBe(publicNew.slug)
    expect(body.chip.ownerDisplayName).toBe('Grace')
    expect(body.chip.posterImageUrl).toBe(pngA)
    expect(body.chip.project.spec.brand).toBe('GRACE')
    expect(body.chip.project.spec.features).toContain('Gallery visible')
  })

  it('does not expose private or missing slugs', async () => {
    const { app, privateChip } = publishFixture()

    expect((await app.request(`/api/gallery/${privateChip.slug}`)).status).toBe(404)
    expect((await app.request('/api/gallery/not-a-real-slug')).status).toBe(404)
  })
})

describe('gallery reaction fields', () => {
  it('summary carries likeCount; detail carries likeCount, commentCount, and likedByMe', async () => {
    const { app, db } = createTestApp(Date.now, { signupsOpen: true, adminEmails: [] })
    db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run('owner', 'o@o.c', 'Owner', 'h', 0, 0)
    db.prepare(
      `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
       VALUES ('c1','owner','p1','s1','T','{}','','',1,'visible',1,1,1)`,
    ).run()

    const cookie = sessionCookie(await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP)))
    await app.request('/api/published-chips/c1/like', { method: 'POST', headers: { cookie } })

    const summary = (await (await app.request('/api/gallery')).json()) as { chips: { likeCount: number }[] }
    expect(summary.chips[0].likeCount).toBe(1)

    const anonDetail = (await (await app.request('/api/gallery/s1')).json()) as { chip: { likeCount: number; commentCount: number; likedByMe: boolean } }
    expect(anonDetail.chip.likeCount).toBe(1)
    expect(anonDetail.chip.commentCount).toBe(0)
    expect(anonDetail.chip.likedByMe).toBe(false)

    const authedDetail = (await (await app.request('/api/gallery/s1', { headers: { cookie } })).json()) as { chip: { likedByMe: boolean } }
    expect(authedDetail.chip.likedByMe).toBe(true)
  })
})

describe('gallery sort param', () => {
  const NOW = 10_000_000_000_000
  const now = () => NOW

  function seedTwo(db: ReturnType<typeof createTestApp>['db']) {
    db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run('owner', 'o@o.c', 'Owner', 'h', 0, 0)
    db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run('liker', 'l@o.c', 'Liker', 'h', 0, 0)
    db.prepare(
      `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
       VALUES ('p1','owner','proj1','slug-1','P1','{}','','',1,'visible',0,1,0)`,
    ).run()
    db.prepare(
      `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
       VALUES ('p2','owner','proj2','slug-2','P2','{}','','',1,'visible',0,2,0)`,
    ).run()
    db.prepare('INSERT INTO likes (published_chip_id, user_id, created_at) VALUES (?,?,?)').run('p1', 'liker', NOW - 1000)
  }

  async function slugs(app: ReturnType<typeof createTestApp>['app'], query: string) {
    const body = (await (await app.request(`/api/gallery${query}`)).json()) as { chips: { slug: string }[] }
    return body.chips.map((chip) => chip.slug)
  }

  it('orders by top, newest, and defaults/unknown to trending', async () => {
    const { app, db } = createTestApp(now, { signupsOpen: true, adminEmails: [] })
    seedTwo(db)
    expect(await slugs(app, '?sort=top')).toEqual(['slug-1', 'slug-2'])
    expect(await slugs(app, '?sort=newest')).toEqual(['slug-2', 'slug-1'])
    expect(await slugs(app, '?sort=trending')).toEqual(['slug-1', 'slug-2'])
    expect(await slugs(app, '')).toEqual(['slug-1', 'slug-2'])
    expect(await slugs(app, '?sort=zzz')).toEqual(['slug-1', 'slug-2'])
  })
})

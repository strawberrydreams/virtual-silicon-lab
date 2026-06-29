import { describe, expect, it } from 'vitest'
import { createProject } from '@domain/projectFactory'
import { createTestApp } from './helpers'
import { upsertPublishedChip } from '../src/publish/service'

const png = 'data:image/png;base64,AAAA'

function insertUser(
  db: ReturnType<typeof createTestApp>['db'],
  id: string,
  email: string,
  displayName: string,
) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, email, displayName, 'hash', 1, 1)
}

function fixture() {
  const { app, db } = createTestApp()
  insertUser(db, 'u1', 'ada@example.com', 'Ada')
  const publicChip = upsertPublishedChip(
    db,
    'u1',
    {
      project: { ...createProject('Ada Public', 'project-public', 1_000) },
      title: 'Ada <Public>',
      dieImageDataUrl: png,
      posterImageDataUrl: png,
      isPublic: true,
    },
    () => 2_000,
  )
  const privateChip = upsertPublishedChip(
    db,
    'u1',
    {
      project: createProject('Ada Private', 'project-private', 1_000),
      title: 'Ada Private',
      dieImageDataUrl: png,
      posterImageDataUrl: png,
      isPublic: false,
    },
    () => 3_000,
  )
  return { app, publicChip, privateChip }
}

describe('share viewer routes', () => {
  it('renders a public chip as HTML with escaped OG meta', async () => {
    const { app, publicChip } = fixture()

    const res = await app.request(`/s/${publicChip.slug}`)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('property="og:image"')
    expect(html).toContain(`/s/${publicChip.slug}/poster.png`)
    expect(html).toContain('Ada &lt;Public&gt;')
    expect(html).toContain(`/gallery/${publicChip.slug}?view=3d`)
  })

  it('returns 404 HTML for private or missing slugs', async () => {
    const { app, privateChip } = fixture()

    expect((await app.request(`/s/${privateChip.slug}`)).status).toBe(404)
    expect((await app.request('/s/not-a-real-slug')).status).toBe(404)
  })

  it('serves decoded PNG bytes for a public chip poster', async () => {
    const { app, publicChip } = fixture()

    const res = await app.request(`/s/${publicChip.slug}/poster.png`)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0)
  })

  it('renders a Remixed from link for a child chip with a visible parent', async () => {
    const { app, db } = createTestApp()
    insertUser(db, 'u1', 'ada@example.com', 'Ada')
    insertUser(db, 'u2', 'grace@example.com', 'Grace')
    const parent = upsertPublishedChip(
      db,
      'u1',
      {
        project: createProject('Parent Chip', 'parent-project', 1_000),
        title: 'Parent Chip',
        dieImageDataUrl: png,
        posterImageDataUrl: png,
        isPublic: true,
      },
      () => 2_000,
    )
    const child = upsertPublishedChip(
      db,
      'u2',
      {
        project: {
          ...createProject('Child Chip', 'child-project', 1_000),
          remixedFrom: { chipId: parent.id, slug: parent.slug, title: parent.title },
        },
        title: 'Child Chip',
        dieImageDataUrl: png,
        posterImageDataUrl: png,
        isPublic: true,
      },
      () => 3_000,
    )

    const html = await (await app.request(`/s/${child.slug}`)).text()

    expect(html).toContain('Remixed from')
    expect(html).toContain(`/gallery/${parent.slug}`)
    expect(html).toContain('Parent Chip')
  })

  it('returns 404 for private or missing poster requests', async () => {
    const { app, privateChip } = fixture()

    expect((await app.request(`/s/${privateChip.slug}/poster.png`)).status).toBe(404)
    expect((await app.request('/s/not-a-real-slug/poster.png')).status).toBe(404)
  })
})

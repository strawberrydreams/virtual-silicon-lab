import { describe, expect, it } from 'vitest'
import { createProject } from '@domain/projectFactory'
import { createTestApp } from './helpers'
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

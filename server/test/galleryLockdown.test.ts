import { describe, expect, it } from 'vitest'
import { createProject } from '@domain/projectFactory'
import { createTestApp } from './helpers'
import { upsertPublishedChip } from '../src/publish/service'

const png = 'data:image/png;base64,AAAA'

function seedPublicChip() {
  const { app, db } = createTestApp(Date.now, { galleryLockdown: true })
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, handle, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
  ).run('u1', 'ada@example.com', 'Ada', 'h', 'ada_lab', 0, 0)
  const chip = upsertPublishedChip(
    db,
    'u1',
    {
      project: createProject('Ada Chip', 'project-1', 1_000),
      title: 'Ada Chip',
      dieImageDataUrl: png,
      posterImageDataUrl: png,
      isPublic: true,
    },
    () => 2_000,
  )
  return { app, chip }
}

describe('gallery lockdown', () => {
  it('hides public gallery/profile/share reads without deleting data', async () => {
    const { app, chip } = seedPublicChip()

    expect(((await (await app.request('/api/gallery')).json()) as { chips: unknown[] }).chips).toEqual(
      [],
    )
    expect(
      ((await (await app.request('/api/gallery/featured')).json()) as { chips: unknown[] }).chips,
    ).toEqual([])
    expect((await app.request(`/api/gallery/${chip.slug}`)).status).toBe(410)
    expect((await app.request('/api/profiles/ada_lab')).status).toBe(410)
    expect((await app.request(`/s/${chip.slug}`)).status).toBe(410)
  })
})

import { describe, expect, it } from 'vitest'
import { createProject } from '@domain/projectFactory'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import {
  deletePublishedChip,
  getPublishedChipForOwnerProject,
  setPublishedChipVisibility,
  upsertPublishedChip,
} from '../src/publish/service'

const pngA = 'data:image/png;base64,AAAA'
const pngB = 'data:image/png;base64,BBBB'

function dbWithUsers() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  const insert = db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
  insert.run('u1', 'ada@example.com', 'Ada', 'hash', 1, 1)
  insert.run('u2', 'grace@example.com', 'Grace', 'hash', 1, 1)
  return db
}

describe('publish service', () => {
  it('creates the first publish record for a project', () => {
    const db = dbWithUsers()
    const project = createProject('Ada Chip', 'project-1', 1_000)

    const published = upsertPublishedChip(db, 'u1', {
      project,
      title: 'Ada Chip',
      dieImageDataUrl: pngA,
      posterImageDataUrl: pngB,
      isPublic: true,
    }, () => 2_000)

    expect(published).toMatchObject({
      ownerUserId: 'u1',
      sourceProjectId: 'project-1',
      title: 'Ada Chip',
      version: 1,
      isPublic: true,
      createdAt: 2_000,
      updatedAt: 2_000,
    })
    expect(published.slug).toMatch(/^ada-chip-[a-f0-9]{8}$/)
    expect(JSON.parse(published.projectJson)).toMatchObject({ id: 'project-1', name: 'Ada Chip' })
  })

  it('republishes by updating the existing record and incrementing the version', () => {
    const db = dbWithUsers()
    const project = createProject('Ada Chip', 'project-1', 1_000)
    const first = upsertPublishedChip(db, 'u1', {
      project,
      title: 'Ada Chip',
      dieImageDataUrl: pngA,
      posterImageDataUrl: pngB,
      isPublic: false,
    }, () => 2_000)

    const updatedProject = { ...project, name: 'Ada Chip Rev B', updatedAt: 3_000 }
    const second = upsertPublishedChip(db, 'u1', {
      project: updatedProject,
      title: 'Ada Chip Rev B',
      dieImageDataUrl: pngB,
      posterImageDataUrl: pngA,
      isPublic: true,
    }, () => 3_000)

    expect(second.id).toBe(first.id)
    expect(second.slug).toBe(first.slug)
    expect(second.version).toBe(2)
    expect(second.title).toBe('Ada Chip Rev B')
    expect(second.isPublic).toBe(true)
    expect(second.dieImageDataUrl).toBe(pngB)
    expect(db.prepare('SELECT COUNT(*) AS n FROM published_chips').get()).toEqual({ n: 1 })
  })

  it('toggles visibility without replacing the stored snapshot or images', () => {
    const db = dbWithUsers()
    const project = createProject('Ada Chip', 'project-1', 1_000)
    upsertPublishedChip(db, 'u1', {
      project,
      title: 'Ada Chip',
      dieImageDataUrl: pngA,
      posterImageDataUrl: pngB,
      isPublic: false,
    }, () => 2_000)

    const changed = setPublishedChipVisibility(db, 'u1', 'project-1', true, () => 3_000)

    expect(changed).toMatchObject({
      sourceProjectId: 'project-1',
      isPublic: true,
      version: 1,
      updatedAt: 3_000,
      dieImageDataUrl: pngA,
    })
  })

  it('scopes lookups and deletion to the owner and source project', () => {
    const db = dbWithUsers()
    const project = createProject('Ada Chip', 'project-1', 1_000)
    upsertPublishedChip(db, 'u1', {
      project,
      title: 'Ada Chip',
      dieImageDataUrl: pngA,
      posterImageDataUrl: pngB,
      isPublic: false,
    }, () => 2_000)

    expect(getPublishedChipForOwnerProject(db, 'u2', 'project-1')).toBeNull()
    expect(deletePublishedChip(db, 'u2', 'project-1')).toBe(false)
    expect(deletePublishedChip(db, 'u1', 'project-1')).toBe(true)
    expect(getPublishedChipForOwnerProject(db, 'u1', 'project-1')).toBeNull()
  })
})

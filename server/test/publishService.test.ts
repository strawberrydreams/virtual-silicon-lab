import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createProject } from '@domain/projectFactory'
import { openDatabase, runMigrations } from '../src/db'
import { createFileImageStore } from '../src/images/fileImageStore'
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

let tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
  tempDirs = []
})

function tempRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'vsl-service-images-'))
  tempDirs.push(dir)
  return dir
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

  it('removes the previous version image files when republishing with a file image store', () => {
    const db = dbWithUsers()
    const rootDir = tempRoot()
    const imageStore = createFileImageStore({ rootDir })
    const project = createProject('Ada Chip', 'project-1', 1_000)

    const first = upsertPublishedChip(
      db,
      'u1',
      { project, title: 'Ada Chip', dieImageDataUrl: pngA, posterImageDataUrl: pngB, isPublic: true },
      () => 2_000,
      imageStore,
    )
    const firstDiePath = first.dieImagePath as string
    const firstPosterPath = first.posterImagePath as string
    expect(imageStore.readPublishedImage(firstDiePath)).not.toBeNull()

    const second = upsertPublishedChip(
      db,
      'u1',
      { project, title: 'Ada Chip', dieImageDataUrl: pngB, posterImageDataUrl: pngA, isPublic: true },
      () => 3_000,
      imageStore,
    )

    expect(second.version).toBe(2)
    expect(second.dieImagePath).not.toBe(firstDiePath)
    // The new version's files are present and resolvable.
    expect(imageStore.readPublishedImage(second.dieImagePath as string)).not.toBeNull()
    // The superseded version's files are cleaned up, not orphaned on disk.
    expect(imageStore.readPublishedImage(firstDiePath)).toBeNull()
    expect(imageStore.readPublishedImage(firstPosterPath)).toBeNull()
    expect(existsSync(join(rootDir, firstDiePath.replace(/^\/uploads\//, '')))).toBe(false)
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

  it('records remixed_from_chip_id when the project remixedFrom chip id exists', () => {
    const db = dbWithUsers()
    const parent = upsertPublishedChip(db, 'u1', {
      project: createProject('Parent Chip', 'parent-project', 1_000),
      title: 'Parent Chip',
      dieImageDataUrl: pngA,
      posterImageDataUrl: pngB,
      isPublic: true,
    }, () => 2_000)

    const childProject = {
      ...createProject('Child Chip', 'child-project', 1_000),
      remixedFrom: { chipId: parent.id, slug: parent.slug, title: parent.title },
    }
    const child = upsertPublishedChip(db, 'u2', {
      project: childProject,
      title: 'Child Chip',
      dieImageDataUrl: pngB,
      posterImageDataUrl: pngA,
      isPublic: true,
    }, () => 3_000)

    expect(child.remixedFromChipId).toBe(parent.id)
  })

  it('stores null when remixedFrom chip id is missing or absent', () => {
    const db = dbWithUsers()
    const orphanProject = {
      ...createProject('Orphan Chip', 'orphan-project', 1_000),
      remixedFrom: { chipId: 'missing', slug: 'missing-slug', title: 'Missing' },
    }

    const orphan = upsertPublishedChip(db, 'u2', {
      project: orphanProject,
      title: 'Orphan Chip',
      dieImageDataUrl: pngB,
      posterImageDataUrl: pngA,
      isPublic: true,
    }, () => 3_000)
    const plain = upsertPublishedChip(db, 'u1', {
      project: createProject('Plain Chip', 'plain-project', 1_000),
      title: 'Plain Chip',
      dieImageDataUrl: pngA,
      posterImageDataUrl: pngB,
      isPublic: true,
    }, () => 4_000)

    expect(orphan.remixedFromChipId).toBeNull()
    expect(plain.remixedFromChipId).toBeNull()
  })
})

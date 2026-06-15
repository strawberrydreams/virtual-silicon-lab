import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { getChipLineage } from '../src/publish/service'

function setup() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('owner', 'owner@example.com', 'Owner', 'hash', 1, 1)
  return db
}

function insertChip(
  db: ReturnType<typeof openDatabase>,
  input: {
    id: string
    slug: string
    title: string
    parentId?: string | null
    isPublic?: 0 | 1
    moderationStatus?: 'visible' | 'hidden'
    updatedAt?: number
  },
) {
  db.prepare(
    `INSERT INTO published_chips
     (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, poster_image_path, is_public, moderation_status, created_at, updated_at, published_at, remixed_from_chip_id)
     VALUES (?, 'owner', ?, ?, ?, '{}', '', ?, ?, ?, ?, 1, ?, 1, ?)`,
  ).run(
    input.id,
    `project-${input.id}`,
    input.slug,
    input.title,
    `data:image/png;base64,${input.id}`,
    `/uploads/${input.id}.png`,
    input.isPublic ?? 1,
    input.moderationStatus ?? 'visible',
    input.updatedAt ?? 1,
    input.parentId ?? null,
  )
}

describe('getChipLineage', () => {
  it('returns root-first ancestors and direct visible children with count', () => {
    const db = setup()
    insertChip(db, { id: 'a', slug: 'a-slug', title: 'A' })
    insertChip(db, { id: 'b', slug: 'b-slug', title: 'B', parentId: 'a', updatedAt: 2 })
    insertChip(db, { id: 'c', slug: 'c-slug', title: 'C', parentId: 'b', updatedAt: 3 })
    insertChip(db, { id: 'd', slug: 'd-slug', title: 'D', parentId: 'a', updatedAt: 4 })

    expect(getChipLineage(db, 'c-slug')?.ancestors.map((a) => ('hidden' in a ? 'hidden' : a.slug))).toEqual([
      'a-slug',
      'b-slug',
    ])
    const aLineage = getChipLineage(db, 'a-slug')
    expect(aLineage?.children.map((child) => child.slug).sort()).toEqual(['b-slug', 'd-slug'])
    expect(aLineage?.childCount).toBe(2)
  })

  it('renders a non-visible ancestor as a hidden placeholder and stops climbing', () => {
    const db = setup()
    insertChip(db, { id: 'a', slug: 'a-slug', title: 'A', isPublic: 0 })
    insertChip(db, { id: 'b', slug: 'b-slug', title: 'B', parentId: 'a' })

    expect(getChipLineage(db, 'b-slug')?.ancestors).toEqual([{ hidden: true }])
  })

  it('excludes non-visible children from list and count', () => {
    const db = setup()
    insertChip(db, { id: 'a', slug: 'a-slug', title: 'A' })
    insertChip(db, { id: 'b', slug: 'b-slug', title: 'B', parentId: 'a' })
    insertChip(db, { id: 'e', slug: 'e-slug', title: 'E', parentId: 'a', moderationStatus: 'hidden' })

    const lineage = getChipLineage(db, 'a-slug')
    expect(lineage?.children.map((child) => child.slug)).toEqual(['b-slug'])
    expect(lineage?.childCount).toBe(1)
  })

  it('returns null for a missing or non-public target slug', () => {
    const db = setup()
    insertChip(db, { id: 'a', slug: 'a-slug', title: 'A', isPublic: 0 })

    expect(getChipLineage(db, 'a-slug')).toBeNull()
    expect(getChipLineage(db, 'nope')).toBeNull()
  })
})

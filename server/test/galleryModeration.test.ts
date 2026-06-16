import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { getPublicPublishedChipBySlug, listPublicPublishedChips } from '../src/publish/service'

function seedPublicChip(db: ReturnType<typeof openDatabase>, id: string, slug: string) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run(`owner-${id}`, `${id}@b.c`, 'Owner', 'h', 0, 0)
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, created_at, updated_at, published_at)
     VALUES (?,?,?,?,?,?,?,?,1,?,?,?)`,
  ).run(id, `owner-${id}`, `proj-${id}`, slug, 'Title', '{}', '', '', 1, 1, 1)
}

describe('moderation filtering of public queries', () => {
  it('excludes a hidden chip from the gallery list and slug lookup', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seedPublicChip(db, 'visible-1', 'visible-slug')
    seedPublicChip(db, 'hidden-1', 'hidden-slug')
    db.prepare(
      "UPDATE published_chips SET moderation_status = 'hidden' WHERE id = 'hidden-1'",
    ).run()

    const slugs = listPublicPublishedChips(db).map((c) => c.slug)
    expect(slugs).toContain('visible-slug')
    expect(slugs).not.toContain('hidden-slug')
    expect(getPublicPublishedChipBySlug(db, 'hidden-slug')).toBeNull()
    expect(getPublicPublishedChipBySlug(db, 'visible-slug')).not.toBeNull()
  })
})

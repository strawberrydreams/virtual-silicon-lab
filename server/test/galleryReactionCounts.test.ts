import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { getPublicPublishedChipBySlug, listPublicPublishedChips } from '../src/publish/service'

function seed(db: ReturnType<typeof openDatabase>) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('u1', 'a@b.c', 'Ada', 'h', 0, 0)
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
     VALUES ('c1','u1','p1','s1','T','{}','','',1,'visible',1,1,1)`,
  ).run()
  db.prepare('INSERT INTO likes (published_chip_id, user_id, created_at) VALUES (?,?,?)').run(
    'c1',
    'u1',
    1,
  )
  db.prepare(
    'INSERT INTO comments (id, published_chip_id, author_user_id, body, created_at) VALUES (?,?,?,?,?)',
  ).run('cm1', 'c1', 'u1', 'hi', 1)
}

describe('gallery reaction counts', () => {
  it('includes likeCount on summaries and likeCount + commentCount on detail', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    const summary = listPublicPublishedChips(db)[0]
    expect(summary.likeCount).toBe(1)
    const detail = getPublicPublishedChipBySlug(db, 's1')
    expect(detail?.likeCount).toBe(1)
    expect(detail?.commentCount).toBe(1)
  })
})

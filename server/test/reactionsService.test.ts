import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import {
  createComment,
  deleteComment,
  getCommentMeta,
  getLikeState,
  isChipReactable,
  likeChip,
  listComments,
  unlikeChip,
} from '../src/reactions/service'

function seed(
  db: ReturnType<typeof openDatabase>,
  opts: { isPublic?: number; hidden?: boolean } = {},
) {
  const isPublic = opts.isPublic ?? 1
  const status = opts.hidden ? 'hidden' : 'visible'
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('u1', 'a@b.c', 'Ada', 'h', 0, 0)
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('u2', 'b@b.c', 'Bea', 'h', 0, 0)
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at)
     VALUES ('c1','u1','p1','s1','T','{}','','',?,?,0,0)`,
  ).run(isPublic, status)
}

describe('reactions service — likes', () => {
  it('reports a public visible chip as reactable, hidden/private as not', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    expect(isChipReactable(db, 'c1')).toBe(true)
    expect(isChipReactable(db, 'missing')).toBe(false)
  })

  it('hidden and private chips are not reactable', () => {
    const dbH = openDatabase(':memory:')
    runMigrations(dbH, migrations)
    seed(dbH, { hidden: true })
    expect(isChipReactable(dbH, 'c1')).toBe(false)
    const dbP = openDatabase(':memory:')
    runMigrations(dbP, migrations)
    seed(dbP, { isPublic: 0 })
    expect(isChipReactable(dbP, 'c1')).toBe(false)
  })

  it('likes are idempotent and counted; unlike removes', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    likeChip(db, 'c1', 'u1', () => 5)
    likeChip(db, 'c1', 'u1', () => 6) // idempotent — still one
    likeChip(db, 'c1', 'u2', () => 7)
    expect(getLikeState(db, 'c1', 'u1')).toEqual({ likeCount: 2, likedByMe: true })
    expect(getLikeState(db, 'c1', null)).toEqual({ likeCount: 2, likedByMe: false })
    unlikeChip(db, 'c1', 'u1')
    expect(getLikeState(db, 'c1', 'u1')).toEqual({ likeCount: 1, likedByMe: false })
  })
})

describe('reactions service — comments', () => {
  it('creates, lists (with author name, oldest first), and deletes comments', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    const first = createComment(
      db,
      { publishedChipId: 'c1', authorUserId: 'u1', body: 'nice' },
      () => 10,
    )
    createComment(db, { publishedChipId: 'c1', authorUserId: 'u2', body: 'cool' }, () => 20)
    const list = listComments(db, 'c1')
    expect(list).toHaveLength(2)
    expect(list[0].body).toBe('nice')
    expect(list[0].authorDisplayName).toBe('Ada')
    expect(list[1].authorDisplayName).toBe('Bea')

    const meta = getCommentMeta(db, first.id)
    expect(meta).toEqual({ id: first.id, publishedChipId: 'c1', authorUserId: 'u1' })
    expect(getCommentMeta(db, 'nope')).toBeNull()

    expect(deleteComment(db, first.id)).toBe(true)
    expect(listComments(db, 'c1')).toHaveLength(1)
    expect(deleteComment(db, first.id)).toBe(false)
  })
})

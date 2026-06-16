import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import {
  adminDeleteChip,
  createReport,
  createCommentReport,
  hideChip,
  hideComment,
  listChipsForModeration,
  listCommentReports,
  listReports,
  resolveReport,
  unhideChip,
  unhideComment,
} from '../src/moderation/service'
import { createComment } from '../src/reactions/service'

function seed(db: ReturnType<typeof openDatabase>) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('u1', 'a@b.c', 'Ada', 'h', 0, 0)
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('admin', 'ad@b.c', 'Admin', 'h', 0, 0)
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, created_at, updated_at, published_at)
     VALUES (?,?,?,?,?,?,?,?,1,?,?,?)`,
  ).run('chip1', 'u1', 'p1', 'slug-1', 'Chip One', '{}', '', '', 1, 1, 1)
}

function seedChip(
  db: ReturnType<typeof openDatabase>,
  id: string,
  opts: { isPublic?: boolean; moderationStatus?: 'visible' | 'hidden' } = {},
) {
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
     VALUES (?,?,?,?,?,'{}','','',?,?,1,1,1)`,
  ).run(
    id,
    'u1',
    `p-${id}`,
    `slug-${id}`,
    id,
    opts.isPublic === false ? 0 : 1,
    opts.moderationStatus ?? 'visible',
  )
}

describe('moderation service', () => {
  it('creates a report and lists it in the open queue', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    const created = createReport(
      db,
      { publishedChipId: 'chip1', reporterUserId: 'u1', reason: 'spam' },
      () => 5,
    )
    expect(created).not.toBe('chip-not-found')
    const open = listReports(db, 'open')
    expect(open).toHaveLength(1)
    expect(open[0].chipSlug).toBe('slug-1')
  })

  it('returns chip-not-found when reporting a missing chip', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    expect(
      createReport(db, { publishedChipId: 'nope', reporterUserId: 'u1', reason: null }, () => 5),
    ).toBe('chip-not-found')
  })

  it('returns chip-not-found when reporting a hidden or private chip', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    seedChip(db, 'hidden-chip', { moderationStatus: 'hidden' })
    seedChip(db, 'private-chip', { isPublic: false })

    expect(
      createReport(
        db,
        { publishedChipId: 'hidden-chip', reporterUserId: 'u1', reason: null },
        () => 5,
      ),
    ).toBe('chip-not-found')
    expect(
      createReport(
        db,
        { publishedChipId: 'private-chip', reporterUserId: 'u1', reason: null },
        () => 5,
      ),
    ).toBe('chip-not-found')
  })

  it('resolves a report and removes it from the open queue', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    const created = createReport(
      db,
      { publishedChipId: 'chip1', reporterUserId: 'u1', reason: 'x' },
      () => 5,
    )
    if (created === 'chip-not-found') throw new Error('seed failed')
    const resolved = resolveReport(db, created.id, 'dismissed', 'admin', () => 9)
    expect(resolved?.status).toBe('dismissed')
    expect(listReports(db, 'open')).toHaveLength(0)
    expect(listReports(db, 'dismissed')).toHaveLength(1)
  })

  it('hides and unhides a chip, recording the actor', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    expect(hideChip(db, 'chip1', 'admin', 'nsfw', () => 7)).toBe(true)
    const hidden = db
      .prepare('SELECT moderation_status, hidden_by, updated_at FROM published_chips WHERE id = ?')
      .get('chip1') as {
      moderation_status: string
      hidden_by: string
      updated_at: number
    }
    expect(hidden.moderation_status).toBe('hidden')
    expect(hidden.hidden_by).toBe('admin')
    expect(hidden.updated_at).toBe(7)
    expect(unhideChip(db, 'chip1', () => 8)).toBe(true)
    const back = db
      .prepare('SELECT moderation_status FROM published_chips WHERE id = ?')
      .get('chip1') as {
      moderation_status: string
    }
    expect(back.moderation_status).toBe('visible')
  })

  it('admin-deletes a chip row (and cascades its reports)', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    createReport(db, { publishedChipId: 'chip1', reporterUserId: 'u1', reason: 'x' }, () => 5)
    expect(adminDeleteChip(db, 'chip1')).toBe(true)
    expect(db.prepare('SELECT COUNT(*) AS n FROM published_chips').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM reports').get()).toEqual({ n: 0 })
    expect(adminDeleteChip(db, 'chip1')).toBe(false)
  })

  it('lists chips for moderation with owner and status', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    const chips = listChipsForModeration(db)
    expect(chips).toHaveLength(1)
    expect(chips[0].ownerDisplayName).toBe('Ada')
    expect(chips[0].moderationStatus).toBe('visible')
  })

  it('creates comment reports, lists the queue, and hides comments from public threads', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    const comment = createComment(
      db,
      { publishedChipId: 'chip1', authorUserId: 'u1', body: 'bad comment' },
      () => 10,
    )

    const report = createCommentReport(
      db,
      { commentId: comment.id, reporterUserId: 'u1', reason: 'abuse' },
      () => 11,
    )
    expect(report).not.toBe('comment-not-found')
    if (report === 'comment-not-found') throw new Error('unreachable')
    expect(report.publishedChipId).toBe('chip1')

    const queue = listCommentReports(db)
    expect(queue).toEqual([
      expect.objectContaining({
        id: report.id,
        commentId: comment.id,
        commentBody: 'bad comment',
        chipSlug: 'slug-1',
      }),
    ])

    expect(hideComment(db, comment.id, 'admin', () => 12)).toBe(true)
    expect(unhideComment(db, comment.id)).toBe(true)
  })
})

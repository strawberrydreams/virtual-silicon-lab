import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import {
  createContest,
  deleteContest,
  getContestDetail,
  getContestStatus,
  listPublicContests,
  updateContest,
} from '../src/contests/service'

const now = () => 1000

function db() {
  const d = openDatabase(':memory:')
  runMigrations(d, migrations)
  d.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('admin', 'admin@test.com', 'Admin', 'h', 0, 0)
  return d
}

describe('contest CRUD + listing', () => {
  it('creates a draft contest', () => {
    const d = db()
    const c = createContest(d, { title: 'Neon Week', theme: 'Glow hard', createdBy: 'admin' }, now)

    expect(c.status).toBe('draft')
    expect(c.title).toBe('Neon Week')
    expect(getContestStatus(d, c.id)).toBe('draft')
  })

  it('public list excludes draft, ordered newest first', () => {
    const d = db()
    const a = createContest(d, { title: 'A', theme: 't', createdBy: 'admin' }, () => 1)
    const b = createContest(d, { title: 'B', theme: 't', createdBy: 'admin' }, () => 2)

    updateContest(d, b.id, { status: 'submission' }, now)
    expect(listPublicContests(d).map((c) => c.title)).toEqual(['B'])

    updateContest(d, a.id, { status: 'voting' }, now)
    expect(listPublicContests(d).map((c) => c.title)).toEqual(['B', 'A'])
  })

  it('updates title/theme/status', () => {
    const d = db()
    const c = createContest(d, { title: 'A', theme: 't', createdBy: 'admin' }, now)

    const updated = updateContest(d, c.id, { title: 'A2', status: 'submission' }, now)

    expect(updated?.title).toBe('A2')
    expect(updated?.status).toBe('submission')
    expect(updateContest(d, 'missing', { title: 'x' }, now)).toBeNull()
  })

  it('getContestDetail hides draft but returns submission contests', () => {
    const d = db()
    const c = createContest(d, { title: 'A', theme: 'Theme text', createdBy: 'admin' }, now)

    expect(getContestDetail(d, c.id, null)).toBeNull()

    updateContest(d, c.id, { status: 'submission' }, now)
    const detail = getContestDetail(d, c.id, null)

    expect(detail?.theme).toBe('Theme text')
    expect(detail?.entries).toEqual([])
    expect(detail?.myEntryId).toBeNull()
    expect(detail?.myVoteEntryId).toBeNull()
  })

  it('deletes a contest', () => {
    const d = db()
    const c = createContest(d, { title: 'A', theme: 't', createdBy: 'admin' }, now)

    expect(deleteContest(d, c.id)).toBe(true)
    expect(getContestStatus(d, c.id)).toBeNull()
    expect(deleteContest(d, 'missing')).toBe(false)
  })
})

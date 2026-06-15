import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import {
  castVote,
  chipEligibleForUser,
  createContest,
  createEntry,
  deleteContest,
  entryOwner,
  getContestDetail,
  getEntryMeta,
  getContestStatus,
  getMyVote,
  listPublicContests,
  retractVote,
  updateContest,
  withdrawEntry,
} from '../src/contests/service'

const now = () => 1000

function db() {
  const d = openDatabase(':memory:')
  runMigrations(d, migrations)
  seedUser(d, 'admin', 'admin@test.com', 'Admin')
  return d
}

function seedUser(d: ReturnType<typeof openDatabase>, id: string, email = `${id}@b.c`, displayName = id) {
  d.prepare(
    'INSERT OR IGNORE INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run(id, email, displayName, 'h', 0, 0)
}

function seedUserChip(
  d: ReturnType<typeof openDatabase>,
  user: string,
  chipId: string,
  opts?: { public?: boolean; visible?: boolean },
) {
  seedUser(d, user)
  d.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
     VALUES (?,?,?,?,?,'{}','','poster-data',?,?,0,1,0)`,
  ).run(
    chipId,
    user,
    `proj-${chipId}`,
    `slug-${chipId}`,
    chipId,
    opts?.public === false ? 0 : 1,
    opts?.visible === false ? 'hidden' : 'visible',
  )
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

describe('contest entries', () => {
  it('only an owner of a public+visible chip is eligible', () => {
    const d = db()
    seedUserChip(d, 'u1', 'chipA')
    seedUserChip(d, 'u2', 'chipPriv', { public: false })

    expect(chipEligibleForUser(d, 'chipA', 'u1')).toBe(true)
    expect(chipEligibleForUser(d, 'chipA', 'u2')).toBe(false)
    expect(chipEligibleForUser(d, 'chipPriv', 'u2')).toBe(false)
    expect(chipEligibleForUser(d, 'missing', 'u1')).toBe(false)
  })

  it('creates an entry and reads its meta', () => {
    const d = db()
    seedUserChip(d, 'u1', 'chipA')
    const c = createContest(d, { title: 'A', theme: 't', createdBy: 'admin' }, now)

    const entry = createEntry(d, { contestId: c.id, publishedChipId: 'chipA', ownerUserId: 'u1' }, now)

    expect(entry).not.toBe('duplicate')
    if (entry === 'duplicate') throw new Error('unreachable')
    expect(getEntryMeta(d, entry.entryId)).toEqual({ id: entry.entryId, contestId: c.id, ownerUserId: 'u1' })
  })

  it('rejects a second entry by the same user', () => {
    const d = db()
    seedUserChip(d, 'u1', 'chipA')
    seedUserChip(d, 'u1', 'chipB')
    const c = createContest(d, { title: 'A', theme: 't', createdBy: 'admin' }, now)

    createEntry(d, { contestId: c.id, publishedChipId: 'chipA', ownerUserId: 'u1' }, now)

    expect(createEntry(d, { contestId: c.id, publishedChipId: 'chipB', ownerUserId: 'u1' }, now)).toBe(
      'duplicate',
    )
  })

  it('withdraws an entry', () => {
    const d = db()
    seedUserChip(d, 'u1', 'chipA')
    const c = createContest(d, { title: 'A', theme: 't', createdBy: 'admin' }, now)
    const entry = createEntry(d, { contestId: c.id, publishedChipId: 'chipA', ownerUserId: 'u1' }, now)
    if (entry === 'duplicate') throw new Error('unreachable')

    expect(withdrawEntry(d, entry.entryId)).toBe(true)
    expect(getEntryMeta(d, entry.entryId)).toBeNull()
  })
})

describe('contest votes + results', () => {
  function seedContestWithEntries(d: ReturnType<typeof openDatabase>) {
    seedUserChip(d, 'u1', 'chipA')
    seedUserChip(d, 'u2', 'chipB')
    const c = createContest(d, { title: 'A', theme: 't', createdBy: 'admin' }, () => 1)
    const a = createEntry(d, { contestId: c.id, publishedChipId: 'chipA', ownerUserId: 'u1' }, () => 1)
    const b = createEntry(d, { contestId: c.id, publishedChipId: 'chipB', ownerUserId: 'u2' }, () => 2)
    if (a === 'duplicate' || b === 'duplicate') throw new Error('unreachable')
    return { c, a, b }
  }

  it('entryOwner returns owner and contest, or null', () => {
    const d = db()
    const { c, a } = seedContestWithEntries(d)

    expect(entryOwner(d, a.entryId)).toEqual({ contestId: c.id, ownerUserId: 'u1' })
    expect(entryOwner(d, 'missing')).toBeNull()
  })

  it('casts one vote per user and replaces on re-vote', () => {
    const d = db()
    const { c, a, b } = seedContestWithEntries(d)
    seedUser(d, 'voter')

    castVote(d, { contestId: c.id, entryId: a.entryId, voterUserId: 'voter' }, now)
    expect(getMyVote(d, c.id, 'voter')).toBe(a.entryId)

    castVote(d, { contestId: c.id, entryId: b.entryId, voterUserId: 'voter' }, now)
    expect(getMyVote(d, c.id, 'voter')).toBe(b.entryId)
    expect(d.prepare('SELECT COUNT(*) AS n FROM contest_votes WHERE contest_id = ?').get(c.id)).toEqual({ n: 1 })
  })

  it('retracts a vote', () => {
    const d = db()
    const { c, a } = seedContestWithEntries(d)
    seedUser(d, 'voter')
    castVote(d, { contestId: c.id, entryId: a.entryId, voterUserId: 'voter' }, now)

    expect(retractVote(d, c.id, 'voter')).toBe(true)
    expect(getMyVote(d, c.id, 'voter')).toBeNull()
  })

  it('detail ranks entries by votes desc, created_at asc tie-break', () => {
    const d = db()
    const { c, a, b } = seedContestWithEntries(d)
    seedUser(d, 'v1')
    seedUser(d, 'v2')
    seedUser(d, 'v3')
    updateContest(d, c.id, { status: 'voting' }, now)

    castVote(d, { contestId: c.id, entryId: b.entryId, voterUserId: 'v1' }, now)
    castVote(d, { contestId: c.id, entryId: b.entryId, voterUserId: 'v2' }, now)
    castVote(d, { contestId: c.id, entryId: a.entryId, voterUserId: 'v3' }, now)
    const detail = getContestDetail(d, c.id, 'v1')

    expect(detail?.entries.map((entry) => [entry.entryId, entry.voteCount, entry.rank])).toEqual([
      [b.entryId, 2, 1],
      [a.entryId, 1, 2],
    ])
    expect(detail?.myVoteEntryId).toBe(b.entryId)
  })
})

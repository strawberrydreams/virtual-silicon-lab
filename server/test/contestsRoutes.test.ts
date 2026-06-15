import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, sessionCookie } from './helpers'

const now = () => 1000

function opts() {
  return { signupsOpen: true, adminEmails: ['admin@test.com'] }
}

async function signup(app: ReturnType<typeof createTestApp>['app'], email: string) {
  const res = await app.request(
    '/api/auth/signup',
    jsonRequest('POST', { email, displayName: email.split('@')[0], password: 'hunter22hunter22' }),
  )
  return sessionCookie(res)
}

function publishChip(
  db: ReturnType<typeof createTestApp>['db'],
  ownerEmail: string,
  chipId: string,
) {
  const owner = db.prepare('SELECT id FROM users WHERE email = ?').get(ownerEmail) as { id: string }
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
     VALUES (?,?,?,?,?,'{}','','poster',1,'visible',0,1,0)`,
  ).run(chipId, owner.id, `proj-${chipId}`, `slug-${chipId}`, chipId)
  return owner.id
}

async function makeContest(
  app: ReturnType<typeof createTestApp>['app'],
  adminCookie: string,
  status: string,
) {
  const created = await app.request(
    '/api/admin/contests',
    jsonRequest('POST', { title: 'A', theme: 't' }, adminCookie),
  )
  const id = ((await created.json()) as { contest: { id: string } }).contest.id
  if (status !== 'draft') {
    await app.request(`/api/admin/contests/${id}`, jsonRequest('PATCH', { status }, adminCookie))
  }
  return id
}

describe('contest routes — admin', () => {
  it('admin creates a contest; non-admin gets 403; anon gets 401', async () => {
    const { app } = createTestApp(now, opts())
    const adminCookie = await signup(app, 'admin@test.com')
    const userCookie = await signup(app, 'user@test.com')

    const created = await app.request(
      '/api/admin/contests',
      jsonRequest('POST', { title: 'A', theme: 't' }, adminCookie),
    )

    expect(created.status).toBe(201)
    expect(((await created.json()) as { contest: { status: string } }).contest.status).toBe('draft')
    expect(
      (
        await app.request(
          '/api/admin/contests',
          jsonRequest('POST', { title: 'B', theme: 't' }, userCookie),
        )
      ).status,
    ).toBe(403)
    expect(
      (await app.request('/api/admin/contests', jsonRequest('POST', { title: 'C', theme: 't' })))
        .status,
    ).toBe(401)
  })

  it('public list hides draft; PATCH to submission reveals it; detail 404 while draft', async () => {
    const { app } = createTestApp(now, opts())
    const adminCookie = await signup(app, 'admin@test.com')
    const created = await app.request(
      '/api/admin/contests',
      jsonRequest('POST', { title: 'A', theme: 't' }, adminCookie),
    )
    const id = ((await created.json()) as { contest: { id: string } }).contest.id

    expect(
      ((await (await app.request('/api/contests')).json()) as { contests: unknown[] }).contests,
    ).toEqual([])
    expect((await app.request(`/api/contests/${id}`)).status).toBe(404)

    await app.request(
      `/api/admin/contests/${id}`,
      jsonRequest('PATCH', { status: 'submission' }, adminCookie),
    )

    expect(
      ((await (await app.request('/api/contests')).json()) as { contests: { id: string }[] })
        .contests,
    ).toHaveLength(1)
    expect((await app.request(`/api/contests/${id}`)).status).toBe(200)
  })

  it('rejects an invalid status on PATCH', async () => {
    const { app } = createTestApp(now, opts())
    const adminCookie = await signup(app, 'admin@test.com')
    const id = await makeContest(app, adminCookie, 'draft')

    expect(
      (
        await app.request(
          `/api/admin/contests/${id}`,
          jsonRequest('PATCH', { status: 'nope' }, adminCookie),
        )
      ).status,
    ).toBe(400)
  })
})

describe('contest routes — entries and votes', () => {
  it('enters during submission, blocks duplicate and wrong phase', async () => {
    const { app, db } = createTestApp(now, opts())
    const adminCookie = await signup(app, 'admin@test.com')
    const userCookie = await signup(app, 'user@test.com')
    publishChip(db, 'user@test.com', 'chipA')
    publishChip(db, 'user@test.com', 'chipB')
    const id = await makeContest(app, adminCookie, 'submission')

    const entered = await app.request(
      `/api/contests/${id}/entries`,
      jsonRequest('POST', { publishedChipId: 'chipA' }, userCookie),
    )
    expect(entered.status).toBe(201)
    expect(
      (
        await app.request(
          `/api/contests/${id}/entries`,
          jsonRequest('POST', { publishedChipId: 'chipB' }, userCookie),
        )
      ).status,
    ).toBe(409)

    const voting = await makeContest(app, adminCookie, 'voting')
    expect(
      (
        await app.request(
          `/api/contests/${voting}/entries`,
          jsonRequest('POST', { publishedChipId: 'chipA' }, userCookie),
        )
      ).status,
    ).toBe(409)
  })

  it("rejects entering another user's chip", async () => {
    const { app, db } = createTestApp(now, opts())
    const adminCookie = await signup(app, 'admin@test.com')
    const userCookie = await signup(app, 'user@test.com')
    await signup(app, 'other@test.com')
    publishChip(db, 'other@test.com', 'chipX')
    const id = await makeContest(app, adminCookie, 'submission')

    expect(
      (
        await app.request(
          `/api/contests/${id}/entries`,
          jsonRequest('POST', { publishedChipId: 'chipX' }, userCookie),
        )
      ).status,
    ).toBe(400)
  })

  it('votes once during voting, blocks self-vote and wrong phase, retracts', async () => {
    const { app, db } = createTestApp(now, opts())
    const adminCookie = await signup(app, 'admin@test.com')
    const aCookie = await signup(app, 'a@test.com')
    const bCookie = await signup(app, 'b@test.com')
    publishChip(db, 'a@test.com', 'chipA')
    publishChip(db, 'b@test.com', 'chipB')
    const id = await makeContest(app, adminCookie, 'submission')
    const ea = await app.request(
      `/api/contests/${id}/entries`,
      jsonRequest('POST', { publishedChipId: 'chipA' }, aCookie),
    )
    const entryA = ((await ea.json()) as { entry: { entryId: string } }).entry.entryId
    await app.request(
      `/api/contests/${id}/entries`,
      jsonRequest('POST', { publishedChipId: 'chipB' }, bCookie),
    )

    expect(
      (
        await app.request(
          `/api/contests/${id}/vote`,
          jsonRequest('POST', { entryId: entryA }, bCookie),
        )
      ).status,
    ).toBe(409)

    await app.request(
      `/api/admin/contests/${id}`,
      jsonRequest('PATCH', { status: 'voting' }, adminCookie),
    )

    expect(
      (
        await app.request(
          `/api/contests/${id}/vote`,
          jsonRequest('POST', { entryId: entryA }, aCookie),
        )
      ).status,
    ).toBe(403)
    expect(
      (
        await app.request(
          `/api/contests/${id}/vote`,
          jsonRequest('POST', { entryId: entryA }, bCookie),
        )
      ).status,
    ).toBe(200)

    const detail = (await (
      await app.request(`/api/contests/${id}`, { headers: { cookie: bCookie } })
    ).json()) as {
      contest: { myVoteEntryId: string | null; entries: { entryId: string; voteCount: number }[] }
    }
    expect(detail.contest.myVoteEntryId).toBe(entryA)
    expect(detail.contest.entries.find((entry) => entry.entryId === entryA)?.voteCount).toBe(1)
    expect(
      (await app.request(`/api/contests/${id}/vote`, jsonRequest('DELETE', {}, bCookie))).status,
    ).toBe(200)
  })
})

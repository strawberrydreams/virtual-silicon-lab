import { createProject } from '@domain/projectFactory'
import { describe, expect, it } from 'vitest'
import { FakeEmailProvider } from '../src/email/provider'
import { createInviteCode } from '../src/invites/service'
import { createTestApp, jsonRequest, sessionCookie } from './helpers'

const PNG = 'data:image/png;base64,iVBORw0KGgo='
const PASSWORD = 'hunter22hunter22'

function tokenFrom(text: string): string {
  const match = text.match(/token=([A-Za-z0-9_-]+)/)
  if (match === null) throw new Error(`no token in: ${text}`)
  return match[1]
}

async function signup(
  app: ReturnType<typeof createTestApp>['app'],
  input: { email: string; displayName: string; inviteCode: string },
): Promise<string> {
  const res = await app.request(
    '/api/auth/signup',
    jsonRequest('POST', {
      email: input.email,
      displayName: input.displayName,
      password: PASSWORD,
      inviteCode: input.inviteCode,
    }),
  )
  expect(res.status).toBe(201)
  return sessionCookie(res)
}

async function verifyLatestEmail(
  app: ReturnType<typeof createTestApp>['app'],
  emailProvider: FakeEmailProvider,
) {
  const email = emailProvider.sent.at(-1)
  if (email === undefined) throw new Error('expected verification email')
  const res = await app.request('/api/auth/verify-email', jsonRequest('POST', { token: tokenFrom(email.text) }))
  expect(res.status).toBe(200)
}

async function mintInvite(app: ReturnType<typeof createTestApp>['app'], adminCookie: string) {
  const res = await app.request(
    '/api/admin/invite-codes',
    jsonRequest('POST', { maxUses: 1, note: 'launch-flow' }, adminCookie),
  )
  expect(res.status).toBe(201)
  return ((await res.json()) as { inviteCode: { code: string } }).inviteCode.code
}

describe('public launch flow', () => {
  it('covers invite signup through verification, publishing, moderation, profiles, SEO, and reset', async () => {
    let time = 10_000
    const emailProvider = new FakeEmailProvider()
    const { app, db } = createTestApp(() => time++, {
      accessMode: 'invite',
      adminEmails: ['admin@vsl.test'],
      emailProvider,
      publicBaseUrl: 'https://vsl.test',
      requireVerifiedPublish: true,
    })

    const bootstrapInvite = createInviteCode(
      db,
      { createdBy: null, maxUses: 1, expiresAt: null, note: 'bootstrap admin' },
      () => time++,
    )
    const adminCookie = await signup(app, {
      email: 'admin@vsl.test',
      displayName: 'Admin',
      inviteCode: bootstrapInvite.code,
    })
    expect(
      (db.prepare('SELECT used_count FROM invite_codes WHERE code = ?').get(bootstrapInvite.code) as {
        used_count: number
      }).used_count,
    ).toBe(1)

    const makerInvite = await mintInvite(app, adminCookie)
    const makerCookie = await signup(app, {
      email: 'maker@vsl.test',
      displayName: 'Maker',
      inviteCode: makerInvite,
    })
    await verifyLatestEmail(app, emailProvider)
    expect(
      (db.prepare('SELECT used_count FROM invite_codes WHERE code = ?').get(makerInvite) as {
        used_count: number
      }).used_count,
    ).toBe(1)

    const chipProject = createProject('Launch Chip', 'launch-project', 10_000)
    const publish = await app.request(
      '/api/published-chips',
      jsonRequest(
        'POST',
        {
          project: chipProject,
          title: chipProject.name,
          dieImageDataUrl: PNG,
          posterImageDataUrl: PNG,
          isPublic: true,
        },
        makerCookie,
      ),
    )
    expect(publish.status).toBe(201)
    const chip = ((await publish.json()) as { chip: { id: string; slug: string } }).chip

    const gallery = (await (await app.request('/api/gallery')).json()) as {
      chips: { id: string; slug: string }[]
    }
    expect(gallery.chips).toEqual([expect.objectContaining({ id: chip.id, slug: chip.slug })])

    const commenterInvite = await mintInvite(app, adminCookie)
    const commenterCookie = await signup(app, {
      email: 'commenter@vsl.test',
      displayName: 'Commenter',
      inviteCode: commenterInvite,
    })
    await verifyLatestEmail(app, emailProvider)

    expect(
      (await app.request(`/api/published-chips/${chip.id}/like`, jsonRequest('POST', {}, commenterCookie))).status,
    ).toBe(200)
    const commentRes = await app.request(
      `/api/published-chips/${chip.id}/comments`,
      jsonRequest('POST', { body: 'public launch comment' }, commenterCookie),
    )
    expect(commentRes.status).toBe(201)
    const comment = ((await commentRes.json()) as { comment: { id: string } }).comment

    const report = await app.request(
      '/api/reports',
      jsonRequest('POST', { commentId: comment.id, reason: 'abuse' }, makerCookie),
    )
    expect(report.status).toBe(201)
    expect(
      (await app.request(`/api/admin/comments/${comment.id}/hide`, { method: 'POST', headers: { cookie: adminCookie } }))
        .status,
    ).toBe(200)
    const commentQueueAfterHide = (await (
      await app.request('/api/admin/comment-reports', { headers: { cookie: adminCookie } })
    ).json()) as { reports: unknown[] }
    expect(commentQueueAfterHide.reports).toEqual([])
    const publicComments = (await (
      await app.request(`/api/published-chips/${chip.id}/comments`)
    ).json()) as { comments: unknown[] }
    expect(publicComments.comments).toEqual([])
    const auditAfterHide = (await (
      await app.request('/api/admin/audit-log', { headers: { cookie: adminCookie } })
    ).json()) as { entries: { action: string; targetId: string }[] }
    expect(auditAfterHide.entries).toContainEqual(
      expect.objectContaining({ action: 'hide_comment', targetId: comment.id }),
    )
    expect(auditAfterHide.entries).toContainEqual(
      expect.objectContaining({ action: 'report_resolved', targetId: expect.any(String) }),
    )

    const commenter = db.prepare('SELECT id FROM users WHERE email = ?').get('commenter@vsl.test') as {
      id: string
    }
    expect(
      (
        await app.request(
          `/api/admin/users/${commenter.id}/ban`,
          jsonRequest('POST', { reason: 'launch abuse' }, adminCookie),
        )
      ).status,
    ).toBe(200)
    expect(
      (
        await app.request(
          '/api/auth/login',
          jsonRequest('POST', { email: 'commenter@vsl.test', password: PASSWORD }),
        )
      ).status,
    ).toBe(401)
    expect(
      (await app.request(`/api/published-chips/${chip.id}/like`, jsonRequest('POST', {}, commenterCookie))).status,
    ).toBe(401)

    expect(
      (await app.request('/api/me/handle', jsonRequest('PATCH', { handle: 'Launch_Maker' }, makerCookie))).status,
    ).toBe(200)
    const profile = (await (await app.request('/api/profiles/launch_maker')).json()) as {
      profile: { handle: string; chips: { slug: string }[] }
    }
    expect(profile.profile.handle).toBe('launch_maker')
    expect(profile.profile.chips).toEqual([expect.objectContaining({ slug: chip.slug })])
    const sitemap = await (await app.request('/sitemap.xml')).text()
    expect(sitemap).toContain(`https://vsl.test/s/${chip.slug}`)
    expect(sitemap).toContain('https://vsl.test/u/launch_maker')

    const secondMakerSession = sessionCookie(
      await app.request('/api/auth/login', jsonRequest('POST', { email: 'maker@vsl.test', password: PASSWORD })),
    )
    emailProvider.sent = []
    expect(
      (await app.request('/api/auth/forgot-password', jsonRequest('POST', { email: 'maker@vsl.test' }))).status,
    ).toBe(200)
    const resetToken = tokenFrom(emailProvider.sent[0].text)
    expect(
      (
        await app.request(
          '/api/auth/reset-password',
          jsonRequest('POST', { token: resetToken, newPassword: 'new-password-123' }),
        )
      ).status,
    ).toBe(200)
    expect((await app.request('/api/me', { headers: { cookie: makerCookie } })).status).toBe(401)
    expect((await app.request('/api/me', { headers: { cookie: secondMakerSession } })).status).toBe(401)
    expect(
      (
        await app.request(
          '/api/auth/login',
          jsonRequest('POST', { email: 'maker@vsl.test', password: 'new-password-123' }),
        )
      ).status,
    ).toBe(200)
  })
})

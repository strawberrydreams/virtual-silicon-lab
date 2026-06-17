import { describe, expect, it, vi, afterEach } from 'vitest'
import { liveModerationApi } from './moderationApi'

afterEach(() => vi.restoreAllMocks())

describe('moderationApi', () => {
  it('lists reports for a status', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ reports: [{ id: 'r1' }] }), { status: 200 }))
    const reports = await liveModerationApi.listReports('open')
    expect(reports).toEqual([{ id: 'r1' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/reports?status=open', expect.any(Object))
  })

  it('lists the comment-report queue', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ reports: [{ id: 'cr1' }] }), { status: 200 }),
      )
    const reports = await liveModerationApi.listCommentReports()
    expect(reports).toEqual([{ id: 'cr1' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/comment-reports', expect.any(Object))
  })

  it('hides a comment', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await liveModerationApi.hideComment('cm1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/comments/cm1/hide',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('bans and unbans a user', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await liveModerationApi.banUser('u9', 'spam')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u9/ban',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ reason: 'spam' }) }),
    )
    await liveModerationApi.unbanUser('u9')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/u9/unban',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('lists the audit log', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ entries: [{ id: 'a1' }] }), { status: 200 }),
      )
    const entries = await liveModerationApi.listAudit()
    expect(entries).toEqual([{ id: 'a1' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/audit-log', expect.any(Object))
  })

  it('throws on a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'no' } }), {
        status: 403,
      }),
    )
    await expect(liveModerationApi.listReports('open')).rejects.toThrow()
  })
})

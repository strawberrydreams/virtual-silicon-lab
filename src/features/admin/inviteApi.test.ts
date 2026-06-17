import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveInviteApi } from './inviteApi'

afterEach(() => vi.restoreAllMocks())

describe('inviteApi', () => {
  it('lists invite codes', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ inviteCodes: [{ code: 'ABC' }] }), { status: 200 }),
      )
    const codes = await liveInviteApi.list()
    expect(codes).toEqual([{ code: 'ABC' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/invite-codes', expect.any(Object))
  })

  it('creates an invite code with maxUses, expiry, and note', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ inviteCode: { code: 'NEW' } }), { status: 201 }),
      )
    const created = await liveInviteApi.create({ maxUses: 3, expiresAt: 999, note: 'event' })
    expect(created).toEqual({ code: 'NEW' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/invite-codes',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ maxUses: 3, expiresAt: 999, note: 'event' }),
      }),
    )
  })

  it('revokes an invite code', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))
    await liveInviteApi.revoke('ABC')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/invite-codes/ABC',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('throws on a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'no' } }), { status: 403 }),
    )
    await expect(liveInviteApi.list()).rejects.toThrow()
  })
})

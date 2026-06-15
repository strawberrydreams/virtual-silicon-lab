import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveContestsApi } from './contestsApi'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('liveContestsApi', () => {
  it('lists contests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { contests: [{ id: 'c1' }] }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await liveContestsApi.list()).toEqual([{ id: 'c1' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/contests', { method: 'GET' })
  })

  it('gets a contest detail', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { contest: { id: 'c1', entries: [] } }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await liveContestsApi.get('c1')).toEqual({ id: 'c1', entries: [] })
    expect(fetchMock).toHaveBeenCalledWith('/api/contests/c1', { method: 'GET' })
  })

  it('enters a chip', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { entry: { entryId: 'e1' } }))
    vi.stubGlobal('fetch', fetchMock)

    await liveContestsApi.enter('c1', 'chipA')

    expect(fetchMock).toHaveBeenCalledWith('/api/contests/c1/entries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publishedChipId: 'chipA' }),
    })
  })

  it('votes and retracts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { myVoteEntryId: 'e1' }))
    vi.stubGlobal('fetch', fetchMock)

    await liveContestsApi.vote('c1', 'e1')
    await liveContestsApi.unvote('c1')

    expect(fetchMock).toHaveBeenCalledWith('/api/contests/c1/vote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entryId: 'e1' }),
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/contests/c1/vote', { method: 'DELETE' })
  })

  it('throws the server error message on failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(409, { error: { code: 'WRONG_PHASE', message: 'Voting is not open.' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(liveContestsApi.vote('c1', 'e1')).rejects.toThrow('Voting is not open.')
  })

  it('admin creates, patches, deletes; lists my chips', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { contest: { id: 'c1' } }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await liveContestsApi.create({ title: 'T', theme: 'Th' })).toEqual({ id: 'c1' })
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/contests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'T', theme: 'Th' }),
    })

    fetchMock.mockResolvedValue(jsonResponse(200, { contest: { id: 'c1' } }))
    await liveContestsApi.setStatus('c1', 'voting')
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/contests/c1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'voting' }),
    })

    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await liveContestsApi.remove('c1')
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/contests/c1', { method: 'DELETE' })

    fetchMock.mockResolvedValue(jsonResponse(200, { chips: [{ id: 'pub' }] }))
    expect(await liveContestsApi.listMyChips()).toEqual([{ id: 'pub' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/published-chips/mine', { method: 'GET' })
  })
})

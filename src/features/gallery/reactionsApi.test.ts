import { describe, expect, it, vi, afterEach } from 'vitest'
import { liveReactionsApi } from './reactionsApi'

afterEach(() => vi.restoreAllMocks())

describe('reactionsApi', () => {
  it('likes a chip and returns the like state', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ likeCount: 3, likedByMe: true }), { status: 200 }))
    const state = await liveReactionsApi.like('chip1')
    expect(state).toEqual({ likeCount: 3, likedByMe: true })
    expect(fetchMock).toHaveBeenCalledWith('/api/published-chips/chip1/like', expect.objectContaining({ method: 'POST' }))
  })

  it('lists comments', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ comments: [{ id: 'c1' }] }), { status: 200 }),
    )
    expect(await liveReactionsApi.listComments('chip1')).toEqual([{ id: 'c1' }])
  })

  it('throws on a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'no' } }), { status: 401 }),
    )
    await expect(liveReactionsApi.createComment('chip1', 'hi')).rejects.toThrow()
  })
})

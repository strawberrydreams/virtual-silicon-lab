import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveProfileApi } from './profileApi'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('liveProfileApi', () => {
  it('gets public profiles and sets the current handle', async () => {
    const profile = { handle: 'ada_lab', displayName: 'Ada', chips: [] }
    const user = {
      id: 'u1',
      email: 'ada@example.com',
      displayName: 'Ada',
      createdAt: 1,
      emailVerified: true,
      handle: 'ada_lab',
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { profile }))
      .mockResolvedValueOnce(jsonResponse(200, { user }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(liveProfileApi.get('ada_lab')).resolves.toEqual(profile)
    await expect(liveProfileApi.setHandle('Ada_Lab')).resolves.toEqual(user)

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/profiles/ada_lab')
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/me/handle',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ handle: 'Ada_Lab' }) }),
    )
  })
})

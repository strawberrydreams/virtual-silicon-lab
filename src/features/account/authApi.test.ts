import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthApiError, liveAuthApi, ServerUnreachableError } from './authApi'

const user = { id: 'u1', email: 'ada@example.com', displayName: 'Ada', createdAt: 1000 }

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('liveAuthApi', () => {
  it('me() returns the user when authenticated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { user })))
    expect(await liveAuthApi.me()).toEqual(user)
  })

  it('me() returns null on 401 instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } })),
    )
    expect(await liveAuthApi.me()).toBeNull()
  })

  it('maps server error bodies to AuthApiError with code and message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(409, { error: { code: 'EMAIL_TAKEN', message: 'Taken.' } })),
    )
    await expect(
      liveAuthApi.signup({ email: 'a@b.co', displayName: 'A', password: 'hunter22hunter22' }),
    ).rejects.toMatchObject({ name: 'AuthApiError', code: 'EMAIL_TAKEN', message: 'Taken.' })
  })

  it('wraps network failures in ServerUnreachableError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    await expect(liveAuthApi.me()).rejects.toThrowError(ServerUnreachableError)
  })

  it('login posts JSON and returns the user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { user }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await liveAuthApi.login({ email: 'ada@example.com', password: 'pw-long-enough' })).toEqual(user)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST', headers: { 'content-type': 'application/json' } }),
    )
  })

  it('deleteAccount resolves on 204 and throws AuthApiError on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(liveAuthApi.deleteAccount('pw-long-enough')).resolves.toBeUndefined()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: 'WRONG_PASSWORD', message: 'Nope.' } })),
    )
    await expect(liveAuthApi.deleteAccount('bad')).rejects.toMatchObject({ code: 'WRONG_PASSWORD' })
  })
})

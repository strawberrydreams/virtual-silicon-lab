import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveAuthApi, ServerUnreachableError } from './authApi'

const user = {
  id: 'u1',
  email: 'ada@example.com',
  displayName: 'Ada',
  createdAt: 1000,
  emailVerified: true,
  handle: null,
}

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
  it('me() returns the user and isAdmin when authenticated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { user, isAdmin: true })))
    expect(await liveAuthApi.me()).toEqual({ user, isAdmin: true })
  })

  it('me() defaults isAdmin to false when the server omits it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { user })))
    expect(await liveAuthApi.me()).toEqual({ user, isAdmin: false })
  })

  it('me() returns null on 401 instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } }),
        ),
    )
    expect(await liveAuthApi.me()).toBeNull()
  })

  it('serverConfig() returns accessMode from /api/health', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { accessMode: 'invite' })))
    expect(await liveAuthApi.serverConfig()).toEqual({ accessMode: 'invite' })
  })

  it('serverConfig() defaults accessMode to open when the server omits it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, {})))
    expect(await liveAuthApi.serverConfig()).toEqual({ accessMode: 'open' })
  })

  it('maps server error bodies to AuthApiError with code and message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(409, { error: { code: 'EMAIL_TAKEN', message: 'Taken.' } }),
        ),
    )
    await expect(
      liveAuthApi.signup({ email: 'a@b.co', displayName: 'A', password: 'hunter22hunter22' }),
    ).rejects.toMatchObject({ name: 'AuthApiError', code: 'EMAIL_TAKEN', message: 'Taken.' })
  })

  it('wraps network failures in ServerUnreachableError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    await expect(liveAuthApi.me()).rejects.toThrowError(ServerUnreachableError)
  })

  it.each([502, 503, 504])(
    'treats a %i gateway response as ServerUnreachableError (proxy in front of a down server)',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status })))
      await expect(liveAuthApi.me()).rejects.toThrowError(ServerUnreachableError)
    },
  )

  it('login posts JSON and returns the user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { user }))
    vi.stubGlobal('fetch', fetchMock)
    expect(
      await liveAuthApi.login({ email: 'ada@example.com', password: 'pw-long-enough' }),
    ).toEqual(user)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST', headers: { 'content-type': 'application/json' } }),
    )
  })

  it('verifyEmail posts the token and returns the verified user', async () => {
    const verified = { ...user, emailVerified: true }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { user: verified }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(liveAuthApi.verifyEmail('token-123')).resolves.toEqual(verified)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/verify-email',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'token-123' }) }),
    )
  })

  it('forgotPassword and resetPassword post account recovery payloads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(liveAuthApi.forgotPassword('ada@example.com')).resolves.toBeUndefined()
    await expect(
      liveAuthApi.resetPassword({ token: 'reset-token', newPassword: 'new-password-99' }),
    ).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/auth/forgot-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'ada@example.com' }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'reset-token', newPassword: 'new-password-99' }),
      }),
    )
  })

  it('deleteAccount resolves on 204 and throws AuthApiError on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(liveAuthApi.deleteAccount('pw-long-enough')).resolves.toBeUndefined()

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(401, { error: { code: 'WRONG_PASSWORD', message: 'Nope.' } }),
        ),
    )
    await expect(liveAuthApi.deleteAccount('bad')).rejects.toMatchObject({ code: 'WRONG_PASSWORD' })
  })
})

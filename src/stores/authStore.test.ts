import { describe, expect, it, vi } from 'vitest'
import {
  AuthApiError,
  ServerUnreachableError,
  type AuthApi,
  type AuthUser,
} from '../features/account/authApi'
import { createAuthStore } from './authStore'

const user: AuthUser = { id: 'u1', email: 'ada@example.com', displayName: 'Ada', createdAt: 1000 }

function fakeApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    me: vi.fn().mockResolvedValue(null),
    serverConfig: vi.fn().mockResolvedValue({ accessMode: 'open' }),
    signup: vi.fn().mockResolvedValue(user),
    login: vi.fn().mockResolvedValue(user),
    logout: vi.fn().mockResolvedValue(undefined),
    updateDisplayName: vi.fn().mockResolvedValue({ ...user, displayName: 'Lady Lovelace' }),
    changePassword: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('authStore', () => {
  it('starts unknown, becomes anonymous when /me is null', async () => {
    const store = createAuthStore(fakeApi())
    expect(store.getState().status).toBe('unknown')
    await store.getState().init()
    expect(store.getState().status).toBe('anonymous')
    expect(store.getState().user).toBeNull()
  })

  it('becomes authenticated when /me returns a user', async () => {
    const store = createAuthStore(
      fakeApi({ me: vi.fn().mockResolvedValue({ user, isAdmin: false }) }),
    )
    await store.getState().init()
    expect(store.getState()).toMatchObject({ status: 'authenticated', user })
  })

  it('captures isAdmin and accessMode from init', async () => {
    const store = createAuthStore(
      fakeApi({
        me: vi.fn().mockResolvedValue({ user, isAdmin: true }),
        serverConfig: vi.fn().mockResolvedValue({ accessMode: 'invite' }),
      }),
    )
    await store.getState().init()
    expect(store.getState().isAdmin).toBe(true)
    expect(store.getState().accessMode).toBe('invite')
  })

  it('treats an unreachable server as the offline state, not an error', async () => {
    const store = createAuthStore(
      fakeApi({ me: vi.fn().mockRejectedValue(new ServerUnreachableError()) }),
    )
    await store.getState().init()
    expect(store.getState().status).toBe('offline')
  })

  it('signup and login set the authenticated user', async () => {
    const store = createAuthStore(fakeApi())
    await store
      .getState()
      .signup({ email: user.email, displayName: 'Ada', password: 'hunter22hunter22' })
    expect(store.getState()).toMatchObject({ status: 'authenticated', user })

    await store.getState().logout()
    expect(store.getState()).toMatchObject({ status: 'anonymous', user: null })

    await store.getState().login({ email: user.email, password: 'hunter22hunter22' })
    expect(store.getState()).toMatchObject({ status: 'authenticated', user })
  })

  it('refreshes admin state after authentication and clears it when the session ends', async () => {
    const store = createAuthStore(
      fakeApi({ me: vi.fn().mockResolvedValue({ user, isAdmin: true }) }),
    )

    await store.getState().login({ email: user.email, password: 'hunter22hunter22' })
    expect(store.getState()).toMatchObject({ status: 'authenticated', user, isAdmin: true })

    await store.getState().logout()
    expect(store.getState()).toMatchObject({ status: 'anonymous', user: null, isAdmin: false })

    await store
      .getState()
      .signup({ email: user.email, displayName: 'Ada', password: 'hunter22hunter22' })
    expect(store.getState()).toMatchObject({ status: 'authenticated', user, isAdmin: true })

    await store.getState().deleteAccount('hunter22hunter22')
    expect(store.getState()).toMatchObject({ status: 'anonymous', user: null, isAdmin: false })
  })

  it('propagates API errors from actions so forms can show them', async () => {
    const store = createAuthStore(
      fakeApi({
        login: vi.fn().mockRejectedValue(new AuthApiError('INVALID_CREDENTIALS', 'Nope.')),
      }),
    )
    await expect(
      store.getState().login({ email: user.email, password: 'wrong' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(store.getState().status).toBe('unknown')
  })

  it('updateDisplayName refreshes the user in place', async () => {
    const store = createAuthStore(
      fakeApi({ me: vi.fn().mockResolvedValue({ user, isAdmin: false }) }),
    )
    await store.getState().init()
    await store.getState().updateDisplayName('Lady Lovelace')
    expect(store.getState().user?.displayName).toBe('Lady Lovelace')
  })

  it('deleteAccount returns the store to anonymous', async () => {
    const store = createAuthStore(
      fakeApi({ me: vi.fn().mockResolvedValue({ user, isAdmin: false }) }),
    )
    await store.getState().init()
    await store.getState().deleteAccount('hunter22hunter22')
    expect(store.getState()).toMatchObject({ status: 'anonymous', user: null })
  })
})

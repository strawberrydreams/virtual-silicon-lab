import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AuthApi, AuthUser } from '../features/account/authApi'
import { AuthStoreProvider, useAuthStore } from './authStoreContext'

const user: AuthUser = {
  id: 'u1',
  email: 'ada@example.com',
  displayName: 'Ada',
  createdAt: 1000,
  emailVerified: true,
  handle: null,
}

function api(me: AuthApi['me']): AuthApi {
  const reject = () => Promise.reject(new Error('not under test'))
  return {
    me,
    serverConfig: vi.fn().mockResolvedValue({ accessMode: 'open' }),
    signup: reject,
    login: reject,
    logout: reject,
    updateDisplayName: reject,
    changePassword: reject,
    deleteAccount: reject,
    verifyEmail: reject,
    forgotPassword: reject,
    resetPassword: reject,
    setHandle: reject,
  }
}

function StatusProbe() {
  const auth = useAuthStore()
  return <p>{`status:${auth.status} user:${auth.user?.displayName ?? 'none'}`}</p>
}

describe('AuthStoreProvider', () => {
  it('initializes the session on mount', async () => {
    render(
      <AuthStoreProvider api={api(vi.fn().mockResolvedValue({ user, isAdmin: false }))}>
        <StatusProbe />
      </AuthStoreProvider>,
    )
    expect(await screen.findByText('status:authenticated user:Ada')).toBeInTheDocument()
  })

  it('throws a clear error when the provider is missing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<StatusProbe />)).toThrow('AuthStoreProvider is missing')
    spy.mockRestore()
  })
})

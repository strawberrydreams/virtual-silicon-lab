import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { AuthApi, AuthUser } from './authApi'
import { ServerUnreachableError } from './authApi'
import { AuthStoreProvider } from '../../stores/authStoreContext'
import { AccountPage } from './AccountPage'

export const testUser: AuthUser = {
  id: 'u1',
  email: 'ada@example.com',
  displayName: 'Ada',
  createdAt: 1000,
}

export function fakeApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    me: vi.fn().mockResolvedValue(null),
    signup: vi.fn().mockResolvedValue(testUser),
    login: vi.fn().mockResolvedValue(testUser),
    logout: vi.fn().mockResolvedValue(undefined),
    updateDisplayName: vi.fn().mockResolvedValue(testUser),
    changePassword: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

export function renderAccountPage(api: AuthApi) {
  return render(
    <MemoryRouter>
      <AuthStoreProvider api={api}>
        <AccountPage />
      </AuthStoreProvider>
    </MemoryRouter>,
  )
}

describe('AccountPage states', () => {
  it('shows the offline panel when the share server is unreachable', async () => {
    renderAccountPage(fakeApi({ me: vi.fn().mockRejectedValue(new ServerUnreachableError()) }))
    expect(await screen.findByText(/share server is offline/i)).toBeInTheDocument()
    expect(screen.getByText(/local editing.*unaffected/i)).toBeInTheDocument()
  })

  it('shows sign-in and create-account forms when anonymous', async () => {
    renderAccountPage(fakeApi())
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
  })
})

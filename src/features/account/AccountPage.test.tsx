import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { AuthApi, AuthUser } from './authApi'
import { AuthApiError, ServerUnreachableError } from './authApi'
import { AuthStoreProvider } from '../../stores/authStoreContext'
import { AccountPage, ResetPasswordPage, VerifyEmailPage } from './AccountPage'

export const testUser: AuthUser = {
  id: 'u1',
  email: 'ada@example.com',
  displayName: 'Ada',
  createdAt: 1000,
  emailVerified: true,
  handle: null,
}

export function fakeApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    me: vi.fn().mockResolvedValue(null),
    serverConfig: vi.fn().mockResolvedValue({ accessMode: 'open' }),
    signup: vi.fn().mockResolvedValue(testUser),
    login: vi.fn().mockResolvedValue(testUser),
    logout: vi.fn().mockResolvedValue(undefined),
    updateDisplayName: vi.fn().mockResolvedValue(testUser),
    changePassword: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    verifyEmail: vi.fn().mockResolvedValue(testUser),
    forgotPassword: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    setHandle: vi.fn().mockResolvedValue({ ...testUser, handle: 'ada_lab' }),
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

describe('AccountPage anonymous forms', () => {
  it('signs up and lands on the profile panel', async () => {
    const api = fakeApi()
    renderAccountPage(api)

    await userEvent.type(await screen.findByLabelText('New Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Display Name'), 'Ada')
    await userEvent.type(screen.getByLabelText('New Password'), 'hunter22hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
    expect(api.signup).toHaveBeenCalledWith({
      email: 'ada@example.com',
      displayName: 'Ada',
      password: 'hunter22hunter22',
    })
  })

  it('includes the invite code in invite-mode signup', async () => {
    const api = fakeApi({ serverConfig: vi.fn().mockResolvedValue({ accessMode: 'invite' }) })
    renderAccountPage(api)

    await userEvent.type(await screen.findByLabelText('New Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Display Name'), 'Ada')
    await userEvent.type(screen.getByLabelText('New Password'), 'hunter22hunter22')
    await userEvent.type(screen.getByLabelText('Invite Code'), 'INVITEABC234')
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
    expect(api.signup).toHaveBeenCalledWith({
      email: 'ada@example.com',
      displayName: 'Ada',
      password: 'hunter22hunter22',
      inviteCode: 'INVITEABC234',
    })
  })

  it('logs in and lands on the profile panel', async () => {
    const api = fakeApi()
    renderAccountPage(api)

    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
  })

  it('requests a reset email from the sign-in panel', async () => {
    const api = fakeApi()
    renderAccountPage(api)

    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    expect(await screen.findByText(/reset link has been sent/i)).toBeInTheDocument()
    expect(api.forgotPassword).toHaveBeenCalledWith('ada@example.com')
  })

  it('shows the server error message when login fails', async () => {
    const api = fakeApi({
      login: vi
        .fn()
        .mockRejectedValue(
          new AuthApiError('INVALID_CREDENTIALS', 'Email or password is incorrect.'),
        ),
    })
    renderAccountPage(api)

    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Email or password is incorrect.')).toBeInTheDocument()
  })
})

describe('AccountPage profile management', () => {
  function authedApi(overrides: Partial<AuthApi> = {}) {
    return fakeApi({
      me: vi.fn().mockResolvedValue({ user: testUser, isAdmin: false }),
      ...overrides,
    })
  }

  it('renames the account', async () => {
    const api = authedApi({
      updateDisplayName: vi.fn().mockResolvedValue({ ...testUser, displayName: 'Lady Lovelace' }),
    })
    renderAccountPage(api)

    const nameField = await screen.findByLabelText('Display Name')
    await userEvent.clear(nameField)
    await userEvent.type(nameField, 'Lady Lovelace')
    await userEvent.click(screen.getByRole('button', { name: 'Save Name' }))

    expect(await screen.findByRole('heading', { name: 'Lady Lovelace' })).toBeInTheDocument()
    expect(api.updateDisplayName).toHaveBeenCalledWith('Lady Lovelace')
  })

  it('shows an email verification banner for unverified users', async () => {
    renderAccountPage(
      authedApi({
        me: vi
          .fn()
          .mockResolvedValue({ user: { ...testUser, emailVerified: false }, isAdmin: false }),
      }),
    )

    expect(await screen.findByText(/verify your email before publishing/i)).toBeInTheDocument()
  })

  it('sets a public profile handle from the account page', async () => {
    const api = authedApi()
    renderAccountPage(api)

    await userEvent.type(await screen.findByLabelText('Public Handle'), 'Ada_Lab')
    await userEvent.click(screen.getByRole('button', { name: 'Save Handle' }))

    expect(await screen.findByRole('link', { name: 'View public profile' })).toHaveAttribute(
      'href',
      '/u/ada_lab',
    )
    expect(api.setHandle).toHaveBeenCalledWith('Ada_Lab')
  })

  it('changes the password and reports success', async () => {
    const api = authedApi()
    renderAccountPage(api)

    await userEvent.type(await screen.findByLabelText('Current Password'), 'hunter22hunter22')
    await userEvent.type(screen.getByLabelText('New Password'), 'new-password-99')
    await userEvent.click(screen.getByRole('button', { name: 'Change Password' }))

    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    expect(api.changePassword).toHaveBeenCalledWith({
      currentPassword: 'hunter22hunter22',
      newPassword: 'new-password-99',
    })
  })

  it('signs out back to the anonymous panels', async () => {
    renderAccountPage(authedApi())
    await userEvent.click(await screen.findByRole('button', { name: 'Sign Out' }))
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('deletes the account after password confirmation', async () => {
    const api = authedApi()
    renderAccountPage(api)

    await userEvent.type(await screen.findByLabelText('Confirm Password'), 'hunter22hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Delete Account' }))

    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(api.deleteAccount).toHaveBeenCalledWith('hunter22hunter22')
  })

  it('surfaces a wrong delete password without leaving the profile', async () => {
    const api = authedApi({
      deleteAccount: vi
        .fn()
        .mockRejectedValue(new AuthApiError('WRONG_PASSWORD', 'Password is incorrect.')),
    })
    renderAccountPage(api)

    await userEvent.type(await screen.findByLabelText('Confirm Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Delete Account' }))

    expect(await screen.findByText('Password is incorrect.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ada' })).toBeInTheDocument()
  })
})

describe('Account recovery routes', () => {
  it('verifies an email token from the URL', async () => {
    const api = fakeApi()
    render(
      <MemoryRouter initialEntries={['/verify-email?token=token-123']}>
        <AuthStoreProvider api={api}>
          <VerifyEmailPage />
        </AuthStoreProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/email verified/i)).toBeInTheDocument()
    expect(api.verifyEmail).toHaveBeenCalledWith('token-123')
  })

  it('resets a password with the URL token', async () => {
    const api = fakeApi()
    render(
      <MemoryRouter initialEntries={['/reset-password?token=reset-token']}>
        <AuthStoreProvider api={api}>
          <ResetPasswordPage />
        </AuthStoreProvider>
      </MemoryRouter>,
    )

    await userEvent.type(await screen.findByLabelText('New Password'), 'new-password-99')
    await userEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

    expect(await screen.findByText(/password has been reset/i)).toBeInTheDocument()
    expect(api.resetPassword).toHaveBeenCalledWith({
      token: 'reset-token',
      newPassword: 'new-password-99',
    })
  })
})

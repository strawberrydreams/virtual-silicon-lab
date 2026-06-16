import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuthApi, AuthUser } from '../account/authApi'
import type { ContestsApi } from '../contests/contestsApi'
import { AuthStoreProvider } from '../../stores/authStoreContext'
import { AdminPage } from './AdminPage'
import type { ModerationApi } from './moderationApi'

const user: AuthUser = {
  id: 'admin',
  email: 'admin@test.com',
  displayName: 'Admin',
  createdAt: 0,
  emailVerified: true,
  handle: null,
}

function authApi(): AuthApi {
  return {
    me: vi.fn().mockResolvedValue({ user, isAdmin: true }),
    serverConfig: vi.fn().mockResolvedValue({ accessMode: 'open' }),
    signup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updateDisplayName: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
    verifyEmail: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    setHandle: vi.fn(),
  }
}

function moderationApi(): ModerationApi {
  return {
    listReports: vi.fn().mockResolvedValue([]),
    resolveReport: vi.fn(),
    listChips: vi.fn().mockResolvedValue([]),
    hideChip: vi.fn(),
    unhideChip: vi.fn(),
    deleteChip: vi.fn(),
    featureChip: vi.fn().mockResolvedValue(undefined),
    unfeatureChip: vi.fn().mockResolvedValue(undefined),
  }
}

function contestsApi(overrides: Partial<ContestsApi> = {}): ContestsApi {
  return {
    list: vi.fn().mockResolvedValue([]),
    listAdmin: vi.fn().mockResolvedValue([
      {
        id: 'draft',
        title: 'Draft Jam',
        theme: 'Build quietly',
        status: 'draft',
        entryCount: 0,
        voteCount: 0,
        createdAt: 1,
      },
    ]),
    get: vi.fn(),
    enter: vi.fn(),
    withdraw: vi.fn(),
    vote: vi.fn(),
    unvote: vi.fn(),
    listMyChips: vi.fn(),
    create: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  }
}

describe('AdminPage', () => {
  it('loads contests through the admin list so draft contests remain visible', async () => {
    const publicList = vi.fn().mockResolvedValue([])
    const adminList = vi.fn().mockResolvedValue([
      {
        id: 'draft',
        title: 'Draft Jam',
        theme: 'Build quietly',
        status: 'draft',
        entryCount: 0,
        voteCount: 0,
        createdAt: 1,
      },
    ])

    render(
      <AuthStoreProvider api={authApi()}>
        <AdminPage
          api={moderationApi()}
          contestsApi={contestsApi({ list: publicList, listAdmin: adminList })}
        />
      </AuthStoreProvider>,
    )

    expect(await screen.findByText('Draft Jam')).toBeInTheDocument()
    expect(adminList).toHaveBeenCalledTimes(1)
    expect(publicList).not.toHaveBeenCalled()
  })

  it('offers feature and unfeature actions for published chips', async () => {
    const api = moderationApi()
    vi.mocked(api.listChips).mockResolvedValue([
      {
        id: 'chip1',
        slug: 'slug-1',
        title: 'Launch Chip',
        ownerDisplayName: 'Ada',
        isPublic: true,
        moderationStatus: 'visible',
        updatedAt: 1,
      },
    ])

    render(
      <AuthStoreProvider api={authApi()}>
        <AdminPage api={api} contestsApi={contestsApi()} />
      </AuthStoreProvider>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Feature Launch Chip' }))
    await userEvent.click(screen.getByRole('button', { name: 'Unfeature Launch Chip' }))

    expect(api.featureChip).toHaveBeenCalledWith('chip1')
    expect(api.unfeatureChip).toHaveBeenCalledWith('chip1')
  })
})

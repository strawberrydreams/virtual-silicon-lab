import { render, screen } from '@testing-library/react'
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
}

function authApi(): AuthApi {
  return {
    me: vi.fn().mockResolvedValue({ user, isAdmin: true }),
    serverConfig: vi.fn().mockResolvedValue({ signupsOpen: true }),
    signup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updateDisplayName: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
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
})

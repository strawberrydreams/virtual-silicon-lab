import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuthApi, AuthUser } from '../account/authApi'
import type { ContestsApi } from '../contests/contestsApi'
import { AuthStoreProvider } from '../../stores/authStoreContext'
import { AdminPage } from './AdminPage'
import type { ModerationApi } from './moderationApi'
import type { InviteApi } from './inviteApi'

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
    listCommentReports: vi.fn().mockResolvedValue([]),
    hideComment: vi.fn().mockResolvedValue(undefined),
    banUser: vi.fn().mockResolvedValue(undefined),
    unbanUser: vi.fn().mockResolvedValue(undefined),
    listAudit: vi.fn().mockResolvedValue([]),
  }
}

function inviteApi(): InviteApi {
  return {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({
      code: 'NEW123',
      createdBy: 'admin',
      maxUses: 1,
      usedCount: 0,
      expiresAt: null,
      note: null,
      createdAt: 1,
    }),
    revoke: vi.fn().mockResolvedValue(undefined),
  }
}

const visibleChip = {
  id: 'chip1',
  slug: 'slug-1',
  title: 'Launch Chip',
  ownerDisplayName: 'Ada',
  ownerUserId: 'owner-1',
  ownerBannedAt: null,
  isPublic: true,
  moderationStatus: 'visible' as const,
  updatedAt: 1,
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
          inviteApi={inviteApi()}
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
    vi.mocked(api.listChips).mockResolvedValue([visibleChip])

    render(
      <AuthStoreProvider api={authApi()}>
        <AdminPage api={api} inviteApi={inviteApi()} contestsApi={contestsApi()} />
      </AuthStoreProvider>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Feature Launch Chip' }))
    await userEvent.click(screen.getByRole('button', { name: 'Unfeature Launch Chip' }))

    expect(api.featureChip).toHaveBeenCalledWith('chip1')
    expect(api.unfeatureChip).toHaveBeenCalledWith('chip1')
  })

  it('mints an invite code from the admin panel', async () => {
    const invites = inviteApi()

    render(
      <AuthStoreProvider api={authApi()}>
        <AdminPage api={moderationApi()} inviteApi={invites} contestsApi={contestsApi()} />
      </AuthStoreProvider>,
    )

    await userEvent.clear(await screen.findByLabelText('Invite max uses'))
    await userEvent.type(screen.getByLabelText('Invite max uses'), '5')
    await userEvent.type(screen.getByLabelText('Invite note'), 'launch batch')
    await userEvent.click(screen.getByRole('button', { name: 'Create invite code' }))

    expect(invites.create).toHaveBeenCalledWith({ maxUses: 5, expiresAt: null, note: 'launch batch' })
  })

  it('revokes an existing invite code', async () => {
    const invites = inviteApi()
    vi.mocked(invites.list).mockResolvedValue([
      {
        code: 'ABC123',
        createdBy: 'admin',
        maxUses: 1,
        usedCount: 0,
        expiresAt: null,
        note: 'named',
        createdAt: 1,
      },
    ])

    render(
      <AuthStoreProvider api={authApi()}>
        <AdminPage api={moderationApi()} inviteApi={invites} contestsApi={contestsApi()} />
      </AuthStoreProvider>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Revoke ABC123' }))
    expect(invites.revoke).toHaveBeenCalledWith('ABC123')
  })

  it('hides a reported comment and bans its author', async () => {
    const api = moderationApi()
    vi.mocked(api.listCommentReports).mockResolvedValue([
      {
        id: 'cr1',
        commentId: 'cm1',
        commentBody: 'spam spam',
        commentAuthorDisplayName: 'Eve',
        commentAuthorUserId: 'user-eve',
        chipSlug: 'slug-1',
        chipTitle: 'Launch Chip',
        reason: 'abuse',
        createdAt: 1,
      },
    ])

    render(
      <AuthStoreProvider api={authApi()}>
        <AdminPage api={api} inviteApi={inviteApi()} contestsApi={contestsApi()} />
      </AuthStoreProvider>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Hide comment cm1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ban author Eve' }))

    expect(api.hideComment).toHaveBeenCalledWith('cm1')
    expect(api.banUser).toHaveBeenCalledWith('user-eve', undefined)
  })

  it('bans a chip owner and unbans an already-banned owner', async () => {
    const api = moderationApi()
    vi.mocked(api.listChips).mockResolvedValue([
      visibleChip,
      { ...visibleChip, id: 'chip2', title: 'Bad Chip', ownerUserId: 'owner-2', ownerBannedAt: 99 },
    ])

    render(
      <AuthStoreProvider api={authApi()}>
        <AdminPage api={api} inviteApi={inviteApi()} contestsApi={contestsApi()} />
      </AuthStoreProvider>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Ban owner of Launch Chip' }))
    await userEvent.click(screen.getByRole('button', { name: 'Unban owner of Bad Chip' }))

    expect(api.banUser).toHaveBeenCalledWith('owner-1', undefined)
    expect(api.unbanUser).toHaveBeenCalledWith('owner-2')
  })

  it('shows audit log entries', async () => {
    const api = moderationApi()
    vi.mocked(api.listAudit).mockResolvedValue([
      {
        id: 'a1',
        adminUserId: 'admin',
        action: 'ban_user',
        targetType: 'user',
        targetId: 'user-eve',
        detail: 'spam',
        createdAt: 1,
      },
    ])

    render(
      <AuthStoreProvider api={authApi()}>
        <AdminPage api={api} inviteApi={inviteApi()} contestsApi={contestsApi()} />
      </AuthStoreProvider>,
    )

    expect(await screen.findByText(/ban_user/)).toBeInTheDocument()
  })
})

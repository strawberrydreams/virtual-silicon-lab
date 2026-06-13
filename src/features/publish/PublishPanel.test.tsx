import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import type { AuthApi, AuthUser } from '../account/authApi'
import { ServerUnreachableError as AuthServerUnreachableError } from '../account/authApi'
import { AuthStoreProvider } from '../../stores/authStoreContext'
import type { PublishApi, PublishedChip } from './publishApi'
import { ServerUnreachableError } from './publishApi'
import { PublishPanel } from './PublishPanel'

const user: AuthUser = { id: 'u1', email: 'ada@example.com', displayName: 'Ada', createdAt: 1_000 }
const project = createProject('Ada Chip', 'project-1', 1_000)
const images = {
  dieImageDataUrl: 'data:image/png;base64,AAAA',
  posterImageDataUrl: 'data:image/png;base64,BBBB',
}
const chip: PublishedChip = {
  id: 'pub1',
  ownerUserId: 'u1',
  sourceProjectId: 'project-1',
  slug: 'ada-chip-deadbeef',
  title: 'Ada Chip',
  dieImageUrl: images.dieImageDataUrl,
  posterImageUrl: images.posterImageDataUrl,
  isPublic: false,
  version: 1,
  createdAt: 2_000,
  updatedAt: 2_000,
  publishedAt: 0,
}

function fakeAuthApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    me: vi.fn().mockResolvedValue(user),
    signup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updateDisplayName: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
    ...overrides,
  }
}

function fakePublishApi(overrides: Partial<PublishApi> = {}): PublishApi {
  return {
    getForProject: vi.fn().mockResolvedValue(null),
    publish: vi.fn().mockResolvedValue(chip),
    setVisibility: vi.fn().mockResolvedValue({ ...chip, isPublic: true }),
    unpublish: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderPanel(authApi: AuthApi, publishApi: PublishApi) {
  return render(
    <AuthStoreProvider api={authApi}>
      <PublishPanel project={project} api={publishApi} captureImages={vi.fn().mockReturnValue(images)} />
    </AuthStoreProvider>,
  )
}

describe('PublishPanel', () => {
  it('shows offline state when the share server is unreachable', async () => {
    renderPanel(
      fakeAuthApi({ me: vi.fn().mockRejectedValue(new AuthServerUnreachableError()) }),
      fakePublishApi(),
    )

    expect(await screen.findByText(/share server is offline/i)).toBeInTheDocument()
    expect(screen.getByText(/local editing is unaffected/i)).toBeInTheDocument()
  })

  it('asks anonymous users to sign in', async () => {
    renderPanel(fakeAuthApi({ me: vi.fn().mockResolvedValue(null) }), fakePublishApi())

    expect(await screen.findByText(/sign in to publish/i)).toBeInTheDocument()
  })

  it('publishes the current project snapshot with captured PNGs', async () => {
    const api = fakePublishApi()
    renderPanel(fakeAuthApi(), api)

    await userEvent.click(await screen.findByRole('button', { name: 'Publish Snapshot' }))

    expect(api.publish).toHaveBeenCalledWith({
      project,
      title: 'Ada Chip',
      dieImageDataUrl: images.dieImageDataUrl,
      posterImageDataUrl: images.posterImageDataUrl,
      isPublic: false,
    })
    expect(await screen.findByRole('button', { name: 'Republish Snapshot' })).toBeInTheDocument()
  })

  it('loads an existing publish and republishes it', async () => {
    const api = fakePublishApi({ getForProject: vi.fn().mockResolvedValue(chip) })
    renderPanel(fakeAuthApi(), api)

    expect(await screen.findByText(/published v1/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Republish Snapshot' }))

    expect(api.publish).toHaveBeenCalledWith(expect.objectContaining({ isPublic: false }))
  })

  it('toggles visibility and unpublishes', async () => {
    const api = fakePublishApi({ getForProject: vi.fn().mockResolvedValue(chip) })
    renderPanel(fakeAuthApi(), api)

    await userEvent.click(await screen.findByRole('button', { name: 'Make Public' }))
    expect(api.setVisibility).toHaveBeenCalledWith('project-1', true)
    expect(await screen.findByRole('button', { name: 'Make Private' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }))
    expect(api.unpublish).toHaveBeenCalledWith('project-1')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish Snapshot' })).toBeInTheDocument())
  })

  it('keeps local editing safe when publish API becomes unreachable', async () => {
    const api = fakePublishApi({ publish: vi.fn().mockRejectedValue(new ServerUnreachableError()) })
    renderPanel(fakeAuthApi(), api)

    await userEvent.click(await screen.findByRole('button', { name: 'Publish Snapshot' }))

    expect(await screen.findByText(/share server is unreachable/i)).toBeInTheDocument()
    expect(screen.getByText(/local editing is unaffected/i)).toBeInTheDocument()
  })
})

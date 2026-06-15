import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import type { AuthApi } from '../account/authApi'
import { AuthStoreProvider } from '../../stores/authStoreContext'
import type { ChipLineage, GalleryApi, GalleryChipDetail } from './galleryApi'
import { ServerUnreachableError } from './galleryApi'
import type { ReactionsApi } from './reactionsApi'
import { GalleryDetailPage } from './GalleryDetailPage'

const project = {
  ...createProject('Ada Chip', 'project-1', 1_000),
  spec: {
    brand: 'ADA',
    series: 'PUBLIC',
    generation: 'Gallery',
    process: '2nm public lithography',
    cores: 64,
    bandwidth: '2.2 TB/s',
    features: ['Gallery visible', 'Poster backed'],
    description: 'A public gallery chip detail.',
  },
}

const detail: GalleryChipDetail = {
  id: 'pub1',
  slug: 'ada-chip-deadbeef',
  title: 'Ada Chip',
  ownerDisplayName: 'Ada',
  dieImageUrl: 'data:image/png;base64,AAAA',
  posterImageUrl: 'data:image/png;base64,BBBB',
  version: 2,
  updatedAt: 2_000,
  publishedAt: 2_000,
  likeCount: 0,
  commentCount: 0,
  likedByMe: false,
  project,
}

function fakeApi(overrides: Partial<GalleryApi> = {}): GalleryApi {
  return {
    list: vi.fn(),
    get: vi.fn().mockResolvedValue(detail),
    getLineage: vi.fn().mockResolvedValue({ ancestors: [], children: [], childCount: 0 }),
    ...overrides,
  }
}

function fakeAuthApi(): AuthApi {
  return {
    me: vi.fn().mockResolvedValue(null),
    serverConfig: vi.fn().mockResolvedValue({ signupsOpen: true }),
    signup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updateDisplayName: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
  }
}

function fakeReactions(): ReactionsApi {
  return {
    like: vi.fn(),
    unlike: vi.fn(),
    listComments: vi.fn().mockResolvedValue([]),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
    reportChip: vi.fn(),
  }
}

function renderDetail(
  api: GalleryApi,
  slug = 'ada-chip-deadbeef',
  onRemix?: (project: GalleryChipDetail['project'], origin: { chipId: string; slug: string; title: string }) => void,
) {
  return render(
    <AuthStoreProvider api={fakeAuthApi()}>
      <MemoryRouter initialEntries={[`/gallery/${slug}`]}>
        <Routes>
          <Route
            path="/gallery/:slug"
            element={<GalleryDetailPage api={api} reactions={fakeReactions()} onRemix={onRemix} />}
          />
        </Routes>
      </MemoryRouter>
    </AuthStoreProvider>,
  )
}

describe('GalleryDetailPage', () => {
  it('renders poster, owner, version, and fake spec fields', async () => {
    renderDetail(fakeApi())

    expect(await screen.findByRole('heading', { name: 'Ada Chip' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Ada Chip poster' })).toHaveAttribute('src', detail.posterImageUrl)
    expect(screen.getByText('Published by Ada')).toBeInTheDocument()
    expect(screen.getByText('Version 2')).toBeInTheDocument()
    expect(screen.getByText('ADA PUBLIC')).toBeInTheDocument()
    expect(screen.getByText('2nm public lithography')).toBeInTheDocument()
    expect(screen.getByText('Gallery visible')).toBeInTheDocument()
  })

  it('renders not found when the slug is missing or private', async () => {
    renderDetail(fakeApi({ get: vi.fn().mockResolvedValue(null) }), 'missing')

    expect(await screen.findByText('Published chip not found')).toBeInTheDocument()
  })

  it('renders an offline state when the share server is unreachable', async () => {
    renderDetail(fakeApi({ get: vi.fn().mockRejectedValue(new ServerUnreachableError()) }))

    expect(await screen.findByText(/share server is offline/i)).toBeInTheDocument()
    expect(screen.getByText(/local editing is unaffected/i)).toBeInTheDocument()
  })

  it('passes the loaded chip origin when remixing into local projects', async () => {
    const onRemix = vi.fn()
    renderDetail(fakeApi(), 'ada-chip-deadbeef', onRemix)

    await userEvent.click(await screen.findByRole('button', { name: /remix into my projects/i }))

    expect(onRemix).toHaveBeenCalledWith(detail.project, {
      chipId: detail.id,
      slug: detail.slug,
      title: detail.title,
    })
  })

  it('renders ancestor and child lineage nodes when present', async () => {
    const lineage: ChipLineage = {
      ancestors: [{ slug: 'parent', title: 'Parent Chip', ownerDisplayName: 'Ada', posterImageUrl: '/p.png' }],
      children: [{ slug: 'kid', title: 'Kid Chip', ownerDisplayName: 'Grace', posterImageUrl: '/k.png' }],
      childCount: 1,
    }
    renderDetail(fakeApi({ getLineage: vi.fn().mockResolvedValue(lineage) }))

    expect(await screen.findByText('Parent Chip')).toBeInTheDocument()
    expect(screen.getByText('Kid Chip')).toBeInTheDocument()
    expect(screen.getByText('1 remix of this chip')).toBeInTheDocument()
  })

  it('shows a private-ancestor placeholder for hidden lineage nodes', async () => {
    renderDetail(fakeApi({ getLineage: vi.fn().mockResolvedValue({ ancestors: [{ hidden: true }], children: [], childCount: 0 }) }))

    expect(await screen.findByText(/private chip/i)).toBeInTheDocument()
  })

  it('does not show the remix button while loading or offline', async () => {
    renderDetail(fakeApi({ get: vi.fn().mockRejectedValue(new ServerUnreachableError()) }))

    await screen.findByText(/share server is offline/i)
    expect(screen.queryByRole('button', { name: /remix into my projects/i })).not.toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { GalleryApi, GalleryChipSummary } from './galleryApi'
import { ServerUnreachableError } from './galleryApi'
import { GalleryPage } from './GalleryPage'

const chip: GalleryChipSummary = {
  id: 'pub1',
  slug: 'ada-chip-deadbeef',
  title: 'Ada Chip',
  ownerDisplayName: 'Ada',
  dieImageUrl: 'data:image/png;base64,AAAA',
  posterImageUrl: 'data:image/png;base64,BBBB',
  version: 1,
  updatedAt: 2_000,
  publishedAt: 2_000,
  likeCount: 0,
}

function fakeApi(overrides: Partial<GalleryApi> = {}): GalleryApi {
  return {
    list: vi.fn().mockResolvedValue([chip]),
    get: vi.fn(),
    ...overrides,
  }
}

function renderPage(api: GalleryApi) {
  return render(
    <MemoryRouter>
      <GalleryPage api={api} />
    </MemoryRouter>,
  )
}

describe('GalleryPage', () => {
  it('renders public chip cards with poster images and detail links', async () => {
    renderPage(fakeApi())

    expect(await screen.findByRole('heading', { name: 'Public Gallery' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ada Chip' })).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Ada Chip poster' })).toHaveAttribute('src', chip.posterImageUrl)
    expect(screen.getByRole('link', { name: 'Open Ada Chip' })).toHaveAttribute('href', '/gallery/ada-chip-deadbeef')
  })

  it('renders an empty state', async () => {
    renderPage(fakeApi({ list: vi.fn().mockResolvedValue([]) }))

    expect(await screen.findByText('No public chips yet.')).toBeInTheDocument()
  })

  it('renders an offline state when the share server is unreachable', async () => {
    renderPage(fakeApi({ list: vi.fn().mockRejectedValue(new ServerUnreachableError()) }))

    expect(await screen.findByText(/share server is offline/i)).toBeInTheDocument()
    expect(screen.getByText(/local editing is unaffected/i)).toBeInTheDocument()
  })
})

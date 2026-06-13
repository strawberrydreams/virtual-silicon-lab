import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import type { GalleryApi, GalleryChipDetail } from './galleryApi'
import { ServerUnreachableError } from './galleryApi'
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
  project,
}

function fakeApi(overrides: Partial<GalleryApi> = {}): GalleryApi {
  return {
    list: vi.fn(),
    get: vi.fn().mockResolvedValue(detail),
    ...overrides,
  }
}

function renderDetail(api: GalleryApi, slug = 'ada-chip-deadbeef') {
  return render(
    <MemoryRouter initialEntries={[`/gallery/${slug}`]}>
      <Routes>
        <Route path="/gallery/:slug" element={<GalleryDetailPage api={api} />} />
      </Routes>
    </MemoryRouter>,
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
})

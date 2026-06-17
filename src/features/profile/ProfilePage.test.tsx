import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ProfileApi } from './profileApi'
import { ProfilePage } from './ProfilePage'

function api(overrides: Partial<ProfileApi> = {}): ProfileApi {
  return {
    get: vi.fn().mockResolvedValue({
      handle: 'ada_lab',
      displayName: 'Ada',
      chips: [
        {
          slug: 'ada-chip',
          title: 'Ada Chip',
          posterImageUrl: 'data:image/png;base64,AAAA',
        },
      ],
    }),
    setHandle: vi.fn(),
    ...overrides,
  }
}

function renderPage(profileApi: ProfileApi, handle = 'ada_lab') {
  return render(
    <MemoryRouter initialEntries={[`/u/${handle}`]}>
      <Routes>
        <Route path="/u/:handle" element={<ProfilePage api={profileApi} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProfilePage', () => {
  it('renders a public profile and chip links', async () => {
    renderPage(api())

    expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Ada Chip poster' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AAAA',
    )
    expect(screen.getByRole('link', { name: 'Open Ada Chip' })).toHaveAttribute(
      'href',
      '/gallery/ada-chip',
    )
  })

  it('renders not found when the profile is missing', async () => {
    renderPage(api({ get: vi.fn().mockResolvedValue(null) }), 'missing')

    expect(await screen.findByText('Profile not found.')).toBeInTheDocument()
  })
})

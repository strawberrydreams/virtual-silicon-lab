import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ContestDetailPage } from './ContestDetailPage'
import type { ContestDetail, ContestsApi } from './contestsApi'

function detail(overrides: Partial<ContestDetail> = {}): ContestDetail {
  return {
    id: 'c1',
    title: 'Neon Week',
    theme: 'Glow hard',
    status: 'results',
    createdAt: 0,
    myEntryId: null,
    myVoteEntryId: null,
    entries: [
      {
        entryId: 'e1',
        publishedChipId: 'p1',
        slug: 's1',
        title: 'First',
        ownerDisplayName: 'A',
        posterImageUrl: '/u/1.png',
        voteCount: 5,
        rank: 1,
      },
      {
        entryId: 'e2',
        publishedChipId: 'p2',
        slug: 's2',
        title: 'Second',
        ownerDisplayName: 'B',
        posterImageUrl: '/u/2.png',
        voteCount: 3,
        rank: 2,
      },
    ],
    ...overrides,
  }
}

function fakeApi(overrides: Partial<ContestsApi> = {}): ContestsApi {
  return {
    list: vi.fn(),
    listAdmin: vi.fn(),
    get: vi.fn().mockResolvedValue(detail()),
    enter: vi.fn(),
    withdraw: vi.fn(),
    vote: vi.fn(),
    unvote: vi.fn(),
    listMyChips: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  }
}

function renderPage(api: ContestsApi) {
  return render(
    <MemoryRouter initialEntries={['/contests/c1']}>
      <ContestDetailPage
        contestId="c1"
        api={api}
        isAuthenticated={false}
        isAdmin={false}
        currentUserId={null}
      />
    </MemoryRouter>,
  )
}

function renderDetail(api: ContestsApi, contestId: string) {
  return render(
    <MemoryRouter initialEntries={[`/contests/${contestId}`]}>
      <ContestDetailPage
        contestId={contestId}
        api={api}
        isAuthenticated={false}
        isAdmin={false}
        currentUserId={null}
      />
    </MemoryRouter>,
  )
}

describe('ContestDetailPage', () => {
  it('renders the theme and a results podium with ranked winners', async () => {
    renderPage(fakeApi())

    expect(await screen.findByRole('heading', { name: 'Neon Week' })).toBeInTheDocument()
    expect(screen.getByText('Glow hard')).toBeInTheDocument()
    expect(screen.getAllByText('First').length).toBeGreaterThan(0)
    expect(screen.getByTestId('contest-podium')).toBeInTheDocument()
  })

  it('does not render a podium during voting', async () => {
    renderPage(fakeApi({ get: vi.fn().mockResolvedValue(detail({ status: 'voting' })) }))

    await screen.findByRole('heading', { name: 'Neon Week' })

    expect(screen.queryByTestId('contest-podium')).not.toBeInTheDocument()
  })

  it('resets to loading instead of showing stale detail when the contest id changes', async () => {
    const get = vi.fn((id: string) => {
      if (id === 'c1') return Promise.resolve(detail({ id: 'c1', title: 'First Contest' }))
      return new Promise<ContestDetail>(() => undefined)
    })
    const api = fakeApi({ get })
    const { rerender } = renderDetail(api, 'c1')

    expect(await screen.findByRole('heading', { name: 'First Contest' })).toBeInTheDocument()

    rerender(
      <MemoryRouter initialEntries={['/contests/c2']}>
        <ContestDetailPage
          contestId="c2"
          api={api}
          isAuthenticated={false}
          isAdmin={false}
          currentUserId={null}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading contest...')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'First Contest' })).not.toBeInTheDocument()
  })
})

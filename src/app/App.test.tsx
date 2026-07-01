import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('../features/editor/EditorPage', () => ({
  EditorPage: ({ project }: { project: { name: string } }) => (
    <main aria-label="Chip editor workspace">{project.name}</main>
  ),
}))

// The mobile editor wrapper owns store setup and heavy preview/showcase children,
// so the App-level test verifies only the EditorRoute branch.
vi.mock('../features/editor/MobileEditor', () => ({
  MobileEditor: ({ project }: { project: { name: string } }) => (
    <main aria-label="Chip preview">{project.name} — edit on desktop</main>
  ),
}))

describe('App', () => {
  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('renders the product title', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Virtual Silicon Lab' })).toBeInTheDocument()
  })

  it('applies and persists the selected page theme', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    const shell = screen.getByTestId('app-shell')
    expect(shell).toHaveAttribute('data-page-theme', 'laboratory')

    await userEvent.click(screen.getByRole('button', { name: 'Space theme' }))

    expect(shell).toHaveAttribute('data-page-theme', 'space')
    expect(localStorage.getItem('vsl.pageTheme')).toBe('space')
    expect(screen.getByRole('banner')).toContainElement(
      screen.getByRole('button', { name: 'Space theme' }),
    )
  })

  it('shows a not-found view for a missing project id instead of loading forever', async () => {
    render(
      <MemoryRouter initialEntries={['/editor/does-not-exist']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Project not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Dashboard' })).toBeInTheDocument()
  })

  it('redirects unknown routes to the landing page', async () => {
    render(
      <MemoryRouter initialEntries={['/totally-unknown']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: 'Start Blank' })).toBeInTheDocument()
  })

  it('renders the dashboard route', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: 'New Project' })).toBeInTheDocument()
  })

  it('renders the account route with the header account link', async () => {
    render(
      <MemoryRouter initialEntries={['/account']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Account' })).toBeInTheDocument()
  })

  it('renders the public gallery route with the header gallery link', async () => {
    render(
      <MemoryRouter initialEntries={['/gallery']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Public Gallery' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gallery' })).toBeInTheDocument()
  })

  it('renders the public profile route', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ profile: { handle: 'ada_lab', displayName: 'Ada', chips: [] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    render(
      <MemoryRouter initialEntries={['/u/ada_lab']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument()
  })

  it('remixes a gallery chip into a new local project and opens the editor', async () => {
    const project = {
      ...(await import('../domain/projectFactory')).createProject(
        'Ada Chip',
        'gallery-source',
        1_000,
      ),
    }
    const detail = {
      id: 'pub1',
      slug: 'ada-chip-deadbeef',
      title: 'Ada Chip',
      ownerDisplayName: 'Ada',
      dieImageUrl: 'data:image/png;base64,AAAA',
      posterImageUrl: 'data:image/png;base64,BBBB',
      version: 1,
      updatedAt: 2_000,
      publishedAt: 2_000,
      project,
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/gallery/') && url.endsWith('/lineage')) {
          return new Response(JSON.stringify({ ancestors: [], children: [], childCount: 0 }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }
        if (url.includes('/api/gallery/')) {
          return new Response(JSON.stringify({ chip: detail }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'no' } }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    render(
      <MemoryRouter initialEntries={['/gallery/ada-chip-deadbeef']}>
        <App />
      </MemoryRouter>,
    )

    await userEvent.click(await screen.findByRole('button', { name: /remix into my projects/i }))

    const editor = await screen.findByRole('main', { name: 'Chip editor workspace' })
    expect(editor).toHaveTextContent('Ada Chip Remix')
  })

  it('applies the hero set page theme when a hero project is opened', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Remix N1 GREEN HORIZON' }))

    expect(await screen.findByRole('main', { name: 'Chip editor workspace' })).toBeInTheDocument()
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-page-theme', 'space')
  })

  it('renders the read-only preview on the editor route when mobile', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }))

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Remix N1 GREEN HORIZON' }))

    expect(await screen.findByRole('main', { name: 'Chip preview' })).toBeInTheDocument()
    expect(screen.queryByRole('main', { name: 'Chip editor workspace' })).not.toBeInTheDocument()
  })

  it('toggles the primary navigation drawer from the menu button', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    const toggle = screen.getByRole('button', { name: 'Open menu' })
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(nav).toHaveAttribute('data-open', 'false')

    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(nav).toHaveAttribute('data-open', 'true')
  })

  it('closes the drawer when a navigation link is chosen', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' })
    expect(nav).toHaveAttribute('data-open', 'true')

    await userEvent.click(screen.getByRole('link', { name: 'Gallery' }))
    expect(nav).toHaveAttribute('data-open', 'false')
  })
})

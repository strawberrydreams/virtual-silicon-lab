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

describe('App', () => {
  afterEach(() => {
    localStorage.clear()
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
    expect(screen.getByRole('banner')).toContainElement(screen.getByRole('button', { name: 'Space theme' }))
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
})

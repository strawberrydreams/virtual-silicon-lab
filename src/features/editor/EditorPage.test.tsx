import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createHeroChip } from '../../domain/heroChip'
import { EditorPage } from './EditorPage'

vi.mock('./canvas/ChipStage', () => ({
  ChipStage: ({ layerVisibility }: { layerVisibility: { M2: boolean } }) => (
    <div data-testid="chip-stage" data-m2-visible={String(layerVisibility.M2)} />
  ),
}))

vi.mock('../export/ExportPanel', () => ({
  ExportPanel: () => <button type="button">Download Poster PNG</button>,
}))

describe('EditorPage', () => {
  it('renders the v2 three-zone editor shell with existing commands reachable', () => {
    render(
      <MemoryRouter>
        <EditorPage project={createHeroChip('editor-shell', 1700000000000)} persist={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('main', { name: 'Chip editor workspace' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Creation rail' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editor canvas workspace' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Product analysis stage' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editor top command bar' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editor status bar' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Inspector and export rail' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'AURORA C-1 — Consciousness Processor' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Exit Editor' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('button', { name: 'Simulate' })).toBeDisabled()
    expect(screen.getByRole('heading', { name: 'Generated Spec' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Layer Visibility' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sticker / Spray Controls' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download Poster PNG' })).toBeInTheDocument()
    expect(screen.getByText('Autosaved')).toBeInTheDocument()
    expect(screen.getByText('GRID: 10µm')).toBeInTheDocument()
    expect(screen.getByText('SNAP: ON')).toBeInTheDocument()
    expect(screen.queryByText('X: 345.2µm')).not.toBeInTheDocument()
    expect(screen.queryByText('Y: 678.9µm')).not.toBeInTheDocument()
  })

  it('orders inspector panels and shows selected tile metrics after adding a tile', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <EditorPage project={createHeroChip('editor-inspector', 1700000000000)} persist={vi.fn()} />
      </MemoryRouter>,
    )

    const inspector = screen.getByRole('complementary', { name: 'Inspector and export rail' })
    const sections = Array.from(inspector.children).map((child) => child.getAttribute('aria-label'))
    expect(sections.slice(0, 4)).toEqual([
      'Generated studio spec',
      'Selected tile summary',
      'Appearance controls',
      'Layer visibility controls',
    ])
    expect(within(inspector).getByText('No tile selected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'CPU' }))

    expect(within(inspector).getAllByText('CPU').length).toBeGreaterThan(0)
    expect(within(inspector).getByText('Type')).toBeInTheDocument()
    expect(within(inspector).getByText('Size')).toBeInTheDocument()
    expect(within(inspector).getByText('Utilization')).toBeInTheDocument()
    expect(within(inspector).getByText('Power')).toBeInTheDocument()
  })

  it('updates the stage layer visibility when layer toggles are clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <EditorPage project={createHeroChip('editor-layers', 1700000000000)} persist={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('chip-stage')).toHaveAttribute('data-m2-visible', 'true')

    await user.click(screen.getByRole('button', { name: 'M2' }))

    expect(screen.getByTestId('chip-stage')).toHaveAttribute('data-m2-visible', 'false')
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createHeroChip } from '../../domain/heroChip'
import { EditorPage } from './EditorPage'

vi.mock('./canvas/ChipStage', () => ({
  ChipStage: () => <div data-testid="chip-stage" />,
}))

vi.mock('../export/ExportPanel', () => ({
  ExportPanel: () => <button type="button">Download Poster PNG</button>,
}))

describe('EditorPage', () => {
  it('renders the v2 three-zone editor shell with existing commands reachable', () => {
    render(<EditorPage project={createHeroChip('editor-shell', 1700000000000)} persist={vi.fn()} />)

    expect(screen.getByRole('main', { name: 'Chip editor workspace' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Creation rail' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Product analysis stage' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Inspector and export rail' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'AURORA C-1 — Consciousness Processor' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Generated Fake Spec' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tile Detail' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sticker / Spray Controls' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download Poster PNG' })).toBeInTheDocument()
  })
})

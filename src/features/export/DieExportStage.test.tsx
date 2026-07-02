import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createHeroSetProject } from '../../visual/heroSetCatalog'
import { DieExportStage } from './DieExportStage'

vi.mock('react-konva', async () => {
  const React = await import('react')
  return {
    Stage: React.forwardRef(
      (
        { children, width, height }: { children: React.ReactNode; width: number; height: number },
        _ref,
      ) => (
        <div data-height={height} data-testid="die-export-stage" data-width={width}>
          {children}
        </div>
      ),
    ),
    Layer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="die-export-layer">{children}</div>
    ),
  }
})

vi.mock('../editor/canvas/ChipArtwork', () => ({
  ChipArtwork: ({
    project,
    renderMode,
    ambientAnimation,
  }: {
    project: { die: { shape: string } }
    renderMode?: string
    ambientAnimation?: unknown
  }) => (
    <div
      data-ambient-animation={ambientAnimation ? 'present' : 'absent'}
      data-die-shape={project.die.shape}
      data-render-mode={renderMode ?? 'full'}
      data-testid="chip-artwork"
    />
  ),
}))

describe('DieExportStage', () => {
  it('renders exactly the die bounds and excludes package-only artwork', () => {
    const project = createHeroSetProject('aurora-m5', 'aurora', 100)

    render(<DieExportStage project={project} />)

    expect(screen.getByTestId('die-export-stage')).toHaveAttribute(
      'data-width',
      String(project.die.width),
    )
    expect(screen.getByTestId('die-export-stage')).toHaveAttribute(
      'data-height',
      String(project.die.height),
    )
    expect(screen.getByTestId('chip-artwork')).toHaveAttribute('data-render-mode', 'die-only')
    expect(screen.getByTestId('chip-artwork')).toHaveAttribute('data-ambient-animation', 'absent')
  })

  it('exports a freeform die through the shared die-only artwork path', () => {
    const project = createHeroSetProject('aurora-m5', 'aurora-freeform-export', 100)
    project.die = {
      ...project.die,
      width: 840,
      height: 560,
      shape: 'freeform',
      freeform: {
        vertices: [
          { x: 0.06, y: 0.04 },
          { x: 0.94, y: 0.12 },
          { x: 0.78, y: 0.94 },
          { x: 0.14, y: 0.82 },
        ],
      },
    }

    render(<DieExportStage project={project} />)

    expect(screen.getByTestId('die-export-stage')).toHaveAttribute('data-width', '840')
    expect(screen.getByTestId('die-export-stage')).toHaveAttribute('data-height', '560')
    expect(screen.getByTestId('chip-artwork')).toHaveAttribute('data-die-shape', 'freeform')
    expect(screen.getByTestId('chip-artwork')).toHaveAttribute('data-render-mode', 'die-only')
  })
})

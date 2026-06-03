import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createHeroSetProject } from '../../visual/heroSetCatalog'
import { DieExportStage } from './DieExportStage'

vi.mock('react-konva', async () => {
  const React = await import('react')
  return {
    Stage: React.forwardRef(
      ({ children, width, height }: { children: React.ReactNode; width: number; height: number }, _ref) => (
        <div data-height={height} data-testid="die-export-stage" data-width={width}>
          {children}
        </div>
      ),
    ),
    Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="die-export-layer">{children}</div>,
  }
})

vi.mock('../editor/canvas/ChipArtwork', () => ({
  ChipArtwork: ({ renderMode }: { renderMode?: string }) => (
    <div data-render-mode={renderMode ?? 'full'} data-testid="chip-artwork" />
  ),
}))

describe('DieExportStage', () => {
  it('renders exactly the die bounds and excludes package-only artwork', () => {
    const project = createHeroSetProject('aurora-m5', 'aurora', 100)

    render(<DieExportStage project={project} />)

    expect(screen.getByTestId('die-export-stage')).toHaveAttribute('data-width', String(project.die.width))
    expect(screen.getByTestId('die-export-stage')).toHaveAttribute('data-height', String(project.die.height))
    expect(screen.getByTestId('chip-artwork')).toHaveAttribute('data-render-mode', 'die-only')
  })
})

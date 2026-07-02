import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createHeroSetProject } from '../../visual/heroSetCatalog'
import { POSTER_EXPORT } from './exportLayout'
import { POSTER_FORMATS } from './posterCompositions'
import { PosterExportStage } from './PosterExportStage'

vi.mock('react-konva', async () => {
  const React = await import('react')
  function node(type: string) {
    return ({
      children,
      text,
      x,
      y,
      width,
      height,
    }: {
      children?: React.ReactNode
      text?: string
      x?: number
      y?: number
      width?: number
      height?: number
    }) => (
      <div
        data-height={height}
        data-konva={type}
        data-text={text}
        data-width={width}
        data-x={x}
        data-y={y}
      >
        {children}
      </div>
    )
  }
  return {
    Group: node('Group'),
    Layer: node('Layer'),
    Rect: node('Rect'),
    Stage: React.forwardRef(
      (
        { children, width, height }: { children: React.ReactNode; width: number; height: number },
        _ref,
      ) => (
        <div data-height={height} data-testid="poster-export-stage" data-width={width}>
          {children}
        </div>
      ),
    ),
    Text: node('Text'),
  }
})

vi.mock('../editor/canvas/ChipArtwork', () => ({
  ChipArtwork: ({ project }: { project: { die: { shape: string } } }) => (
    <div data-die-shape={project.die.shape} data-testid="poster-chip-artwork" />
  ),
}))

function freeformProject() {
  const project = createHeroSetProject('aurora-m5', 'aurora-freeform-poster', 100)
  project.die = {
    ...project.die,
    shape: 'freeform',
    freeform: {
      vertices: [
        { x: 0.08, y: 0.04 },
        { x: 0.92, y: 0.08 },
        { x: 0.82, y: 0.88 },
        { x: 0.14, y: 0.84 },
      ],
    },
  }
  return project
}

describe('PosterExportStage', () => {
  it('renders a freeform project through shared artwork in every poster format', () => {
    const project = freeformProject()

    for (const format of POSTER_FORMATS) {
      const { unmount } = render(<PosterExportStage project={project} format={format.id} />)

      expect(screen.getByTestId('poster-export-stage')).toHaveAttribute(
        'data-width',
        String(POSTER_EXPORT.logicalWidth),
      )
      expect(screen.getByTestId('poster-export-stage')).toHaveAttribute(
        'data-height',
        String(POSTER_EXPORT.logicalHeight),
      )
      expect(screen.getByTestId('poster-chip-artwork')).toHaveAttribute(
        'data-die-shape',
        'freeform',
      )

      unmount()
    }
  })
})

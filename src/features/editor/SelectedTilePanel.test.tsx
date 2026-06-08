import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildBlock } from '../../domain/blockFactory'
import { createProject } from '../../domain/projectFactory'
import { SelectedTilePanel } from './SelectedTilePanel'

describe('SelectedTilePanel', () => {
  it('uses the shared inspector card and stable selected-tile layout classes', () => {
    const project = createProject('Panel Layout', 'panel-layout', 1700000000000)
    const block = buildBlock(project, 'CPU', 'cpu-1')

    render(<SelectedTilePanel block={block} project={project} />)

    const panel = screen.getByRole('region', { name: 'Selected tile summary' })
    expect(panel).toHaveClass('editor-inspector-card')
    expect(panel.querySelector('.selected-tile-panel__info')).toBeInTheDocument()
    expect(panel.querySelector('.selected-tile-panel__name')).toHaveTextContent('CPU')
    expect(panel.querySelector('.selected-tile-panel__category')).toHaveTextContent('Hardware tile')
    expect(panel.querySelector('.selected-tile-panel__mini')).toBeInTheDocument()

    const metricRows = panel.querySelectorAll('.selected-tile-panel__metric')
    expect(metricRows).toHaveLength(4)
    expect(within(metricRows[0] as HTMLElement).getByText('Type')).toBeInTheDocument()
    expect(within(metricRows[0] as HTMLElement).getByText('CPU')).toBeInTheDocument()
  })
})

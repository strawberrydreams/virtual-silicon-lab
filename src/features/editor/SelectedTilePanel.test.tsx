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

  it('shows GPU-specific component specs for a selected GPU tile', () => {
    const project = createProject('Panel Layout', 'panel-layout', 1700000000000)
    const block = { ...buildBlock(project, 'GPU', 'gpu-1'), w: 260, h: 180 }

    render(<SelectedTilePanel block={block} project={{ ...project, blocks: [block] }} />)

    const panel = screen.getByRole('region', { name: 'Selected tile summary' })
    expect(within(panel).getByText('Component spec')).toBeInTheDocument()
    expect(within(panel).getByText('Parallel compute')).toBeInTheDocument()
    expect(within(panel).getByText('Shaders')).toBeInTheDocument()
    expect(within(panel).getByText(/TFLOPS$/)).toBeInTheDocument()
    expect(within(panel).getByText(/TOPS$/)).toBeInTheDocument()
    expect(within(panel).queryByText(/N1X|Pentium|8086|Grace|Blackwell/i)).not.toBeInTheDocument()
  })

  it('shows memory-specific component specs for a selected SRAM tile', () => {
    const project = createProject('Panel Layout', 'panel-layout', 1700000000000)
    const block = { ...buildBlock(project, 'SRAM', 'sram-1'), w: 240, h: 140 }

    render(<SelectedTilePanel block={block} project={{ ...project, blocks: [block] }} />)

    const panel = screen.getByRole('region', { name: 'Selected tile summary' })
    expect(within(panel).getByText('Memory macro')).toBeInTheDocument()
    expect(within(panel).getByText('Capacity')).toBeInTheDocument()
    expect(within(panel).getByText(/MB$/)).toBeInTheDocument()
    expect(within(panel).getByText('Local BW')).toBeInTheDocument()
    expect(within(panel).getByText(/GB\/s$/)).toBeInTheDocument()
    expect(within(panel).queryByText(/CUDA|TOPS/)).not.toBeInTheDocument()
  })
})

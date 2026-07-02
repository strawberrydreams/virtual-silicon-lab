import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHeroChip } from '../../domain/heroChip'
import { EditorPage } from './EditorPage'

vi.mock('./canvas/ChipStage', () => ({
  ChipStage: ({
    layerVisibility,
    ambientMotionEnabled,
    onAddFreeformVertex,
    onMoveFreeformVertex,
    onDeleteFreeformVertex,
  }: {
    layerVisibility: { M2: boolean }
    ambientMotionEnabled: boolean
    onAddFreeformVertex?: unknown
    onMoveFreeformVertex?: unknown
    onDeleteFreeformVertex?: unknown
  }) => (
    <div
      data-ambient-motion-enabled={String(ambientMotionEnabled)}
      data-freeform-add-wired={String(typeof onAddFreeformVertex === 'function')}
      data-freeform-delete-wired={String(typeof onDeleteFreeformVertex === 'function')}
      data-freeform-move-wired={String(typeof onMoveFreeformVertex === 'function')}
      data-testid="chip-stage"
      data-m2-visible={String(layerVisibility.M2)}
    />
  ),
}))

vi.mock('../export/ExportPanel', () => ({
  ExportPanel: () => <button type="button">Download Poster PNG</button>,
}))

vi.mock('../publish/PublishPanel', () => ({
  PublishPanel: () => <button type="button">Publish Snapshot</button>,
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EditorPage', () => {
  it('renders the v2 three-zone editor shell with existing commands reachable', () => {
    render(
      <MemoryRouter>
        <EditorPage
          project={createHeroChip('editor-shell', 1700000000000)}
          persist={vi.fn()}
          onSaveVariation={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('main', { name: 'Chip editor workspace' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Creation rail' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editor canvas workspace' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Product analysis stage' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editor top command bar' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editor status bar' })).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', { name: 'Inspector and export rail' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'AURORA C-1 — Consciousness Processor' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Exit Editor' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('button', { name: 'Open 3D showcase' })).toBeInTheDocument()
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
        <EditorPage
          project={createHeroChip('editor-inspector', 1700000000000)}
          persist={vi.fn()}
          onSaveVariation={vi.fn()}
        />
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

    const selectedPanel = within(inspector).getByRole('region', { name: 'Selected tile summary' })
    const basicMetricLabels = Array.from(
      selectedPanel.querySelectorAll(
        '.selected-tile-panel__metrics .selected-tile-panel__metric span',
      ),
    ).map((label) => label.textContent)

    expect(within(inspector).getAllByText('CPU').length).toBeGreaterThan(0)
    expect(basicMetricLabels).toEqual(['Type', 'Size', 'Utilization', 'Power'])
  })

  it('updates the stage layer visibility when layer toggles are clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <EditorPage
          project={createHeroChip('editor-layers', 1700000000000)}
          persist={vi.fn()}
          onSaveVariation={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('chip-stage')).toHaveAttribute('data-m2-visible', 'true')

    await user.click(screen.getByRole('button', { name: 'M2' }))

    expect(screen.getByTestId('chip-stage')).toHaveAttribute('data-m2-visible', 'false')
  })

  it('wires freeform vertex editing commands into the stage', () => {
    render(
      <MemoryRouter>
        <EditorPage
          project={createHeroChip('editor-freeform-wiring', 1700000000000)}
          persist={vi.fn()}
          onSaveVariation={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('chip-stage')).toHaveAttribute('data-freeform-add-wired', 'true')
    expect(screen.getByTestId('chip-stage')).toHaveAttribute('data-freeform-move-wired', 'true')
    expect(screen.getByTestId('chip-stage')).toHaveAttribute('data-freeform-delete-wired', 'true')
  })

  it('previews and commits die parameters through the editor store', async () => {
    const user = userEvent.setup()
    const project = createHeroChip('editor-params', 1700000000000)
    project.die = { ...project.die, shape: 'rounded-rect' }
    render(
      <MemoryRouter>
        <EditorPage project={project} persist={vi.fn()} onSaveVariation={vi.fn()} />
      </MemoryRouter>,
    )

    const slider = screen.getByRole('slider', { name: 'Corner Radius' })
    fireEvent.change(slider, { target: { value: '0.2' } })
    expect(screen.getByText('20%')).toBeInTheDocument()
    fireEvent.pointerUp(slider)

    const topBar = screen.getByRole('region', { name: 'Editor top command bar' })
    await user.click(within(topBar).getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('slider', { name: 'Corner Radius' })).toHaveValue('0.12')
  })

  it('changes chip finish through the inspector and supports undo', async () => {
    const user = userEvent.setup()
    const project = createHeroChip('editor-finish', 1700000000000)
    project.finish = 'gloss'

    render(
      <MemoryRouter>
        <EditorPage project={project} persist={vi.fn()} onSaveVariation={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Gloss glass' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Brushed metal' }))

    expect(screen.getByRole('button', { name: 'Brushed metal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const topBar = screen.getByRole('region', { name: 'Editor top command bar' })
    await user.click(within(topBar).getByRole('button', { name: 'Undo' }))

    expect(screen.getByRole('button', { name: 'Gloss glass' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('changes a selected tile finish override through the inspector and supports undo', async () => {
    const user = userEvent.setup()
    const project = createHeroChip('editor-block-finish', 1700000000000)
    project.finish = 'gloss'

    render(
      <MemoryRouter>
        <EditorPage project={project} persist={vi.fn()} onSaveVariation={vi.fn()} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'CPU' }))

    const group = screen.getByRole('group', { name: 'Selected tile material controls' })
    expect(
      within(group).getByRole('button', { name: 'Inherit chip finish: Gloss glass' }),
    ).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(group).getByRole('button', { name: 'Brushed metal' }))
    expect(within(group).getByRole('button', { name: 'Brushed metal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const topBar = screen.getByRole('region', { name: 'Editor top command bar' })
    await user.click(within(topBar).getByRole('button', { name: 'Undo' }))
    expect(
      within(group).getByRole('button', { name: 'Inherit chip finish: Gloss glass' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows separate theme and finish readouts', () => {
    const project = createHeroChip('editor-readouts', 1700000000000)
    project.theme = 'keynote'
    project.finish = 'metallic'

    render(
      <MemoryRouter>
        <EditorPage project={project} persist={vi.fn()} onSaveVariation={vi.fn()} />
      </MemoryRouter>,
    )

    const readouts = screen.getByLabelText('Project readouts')
    expect(readouts).toHaveTextContent('ThemeKeynote')
    expect(readouts).toHaveTextContent('FinishBrushed metal')
  })

  it('enables ambient motion by default when reduced motion is not requested', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    render(
      <MemoryRouter>
        <EditorPage
          project={createHeroChip('ambient-default', 1)}
          persist={vi.fn()}
          onSaveVariation={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('switch', { name: 'Ambient motion' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByTestId('chip-stage')).toHaveAttribute('data-ambient-motion-enabled', 'true')
  })

  it('starts ambient motion disabled under reduced motion without touching undo history', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <EditorPage
          project={createHeroChip('ambient-reduced', 1)}
          persist={vi.fn()}
          onSaveVariation={vi.fn()}
        />
      </MemoryRouter>,
    )

    const topBar = screen.getByRole('region', { name: 'Editor top command bar' })
    expect(within(topBar).getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Ambient motion' })).toHaveAttribute(
      'aria-checked',
      'false',
    )

    await user.click(screen.getByRole('switch', { name: 'Ambient motion' }))

    expect(screen.getByTestId('chip-stage')).toHaveAttribute('data-ambient-motion-enabled', 'true')
    expect(within(topBar).getByRole('button', { name: 'Undo' })).toBeDisabled()
  })
})

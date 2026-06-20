import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createHeroChip } from '../../domain/heroChip'
import { EditorInspectorRail } from './EditorInspectorRail'
import { DEFAULT_LAYER_VISIBILITY } from './layerVisibility'

const captured = vi.hoisted(() => ({ props: undefined as Record<string, unknown> | undefined }))

vi.mock('../export/ExportPanel', () => ({
  ExportPanel: (props: Record<string, unknown>) => {
    captured.props = props
    return <div data-testid="export-panel" />
  },
}))

vi.mock('../publish/PublishPanel', () => ({
  PublishPanel: () => <div data-testid="publish-panel" />,
}))

describe('EditorInspectorRail', () => {
  it('never threads ephemeral editor layer toggles into the export panel', () => {
    render(
      <EditorInspectorRail
        project={createHeroChip('aurora', 1)}
        selectedBlock={null}
        selectedStudioItem={null}
        layerVisibility={{ ...DEFAULT_LAYER_VISIBILITY, M3: false, Label: false }}
        onSetTileSettings={vi.fn()}
        onSetColorPaint={vi.fn()}
        onUpdateBlockVisual={vi.fn()}
        onUpdateSticker={vi.fn()}
        onUpdateSpray={vi.fn()}
        onSetSpec={vi.fn()}
        onApplyAiSuggestion={vi.fn()}
        onToggleLayerVisibility={vi.fn()}
      />,
    )

    expect(screen.getByTestId('export-panel')).toBeInTheDocument()
    // Exports must composite the FULL artwork from serializable project data;
    // hiding M3/Label for canvas inspection must not change the exported PNGs.
    expect(captured.props).not.toHaveProperty('layerVisibility')
    expect(screen.getByRole('heading', { name: 'AI Layout Suggestions' })).toBeInTheDocument()
  })
})

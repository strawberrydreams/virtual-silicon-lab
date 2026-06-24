import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createHeroChip } from '../../domain/heroChip'
import { EditorInspectorRail } from './EditorInspectorRail'
import { DEFAULT_LAYER_VISIBILITY } from './layerVisibility'

const captured = vi.hoisted(() => ({ props: undefined as Record<string, unknown> | undefined }))
const ambientMotionBudget = {
  tier: 'full' as const,
  animateGlow: true,
  animateTraces: true,
  reason: null,
}

vi.mock('../export/ExportPanel', () => ({
  ExportPanel: (props: Record<string, unknown>) => {
    captured.props = props
    return <div data-testid="export-panel" />
  },
}))

vi.mock('../publish/PublishPanel', () => ({
  PublishPanel: () => <div data-testid="publish-panel" />,
}))

vi.mock('./MobileChipPreview', () => ({
  MobileChipPreview: () => <div />,
}))

describe('EditorInspectorRail', () => {
  it('never threads ephemeral editor layer toggles into the export panel', () => {
    render(
      <EditorInspectorRail
        project={createHeroChip('aurora', 1)}
        selectedBlock={null}
        selectedStudioItem={null}
        layerVisibility={{ ...DEFAULT_LAYER_VISIBILITY, M3: false, Label: false }}
        ambientMotionEnabled={true}
        prefersReducedMotion={false}
        ambientMotionBudget={ambientMotionBudget}
        onSetTileSettings={vi.fn()}
        onPreviewDieShapeParams={vi.fn()}
        onCommitDieShapeParamEdit={vi.fn()}
        onCancelDieShapeParamEdit={vi.fn()}
        onSetDieShapeParams={vi.fn()}
        onSetFinish={vi.fn()}
        onSetBlockFinish={vi.fn()}
        onSetColorPaint={vi.fn()}
        onUpdateBlockVisual={vi.fn()}
        onUpdateSticker={vi.fn()}
        onUpdateSpray={vi.fn()}
        onSetSpec={vi.fn()}
        onApplyAiSuggestion={vi.fn()}
        onSaveVariation={vi.fn()}
        onSetAmbientMotionEnabled={vi.fn()}
        onToggleLayerVisibility={vi.fn()}
      />,
    )

    expect(screen.getByTestId('export-panel')).toBeInTheDocument()
    // Exports must composite the FULL artwork from serializable project data;
    // hiding M3/Label for canvas inspection must not change the exported PNGs.
    expect(captured.props).not.toHaveProperty('layerVisibility')
    expect(screen.getByRole('heading', { name: 'AI Layout Suggestions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate variations/i })).toBeInTheDocument()
  })

  it('wires parametric die controls inside Appearance', () => {
    const project = createHeroChip('aurora', 1)
    project.die = { ...project.die, shape: 'rounded-rect' }
    const onPreviewDieShapeParams = vi.fn()
    const onCommitDieShapeParamEdit = vi.fn()

    render(
      <EditorInspectorRail
        project={project}
        selectedBlock={null}
        selectedStudioItem={null}
        layerVisibility={DEFAULT_LAYER_VISIBILITY}
        ambientMotionEnabled={true}
        prefersReducedMotion={false}
        ambientMotionBudget={ambientMotionBudget}
        onSetTileSettings={vi.fn()}
        onPreviewDieShapeParams={onPreviewDieShapeParams}
        onCommitDieShapeParamEdit={onCommitDieShapeParamEdit}
        onCancelDieShapeParamEdit={vi.fn()}
        onSetDieShapeParams={vi.fn()}
        onSetFinish={vi.fn()}
        onSetBlockFinish={vi.fn()}
        onSetColorPaint={vi.fn()}
        onUpdateBlockVisual={vi.fn()}
        onUpdateSticker={vi.fn()}
        onUpdateSpray={vi.fn()}
        onSetSpec={vi.fn()}
        onApplyAiSuggestion={vi.fn()}
        onSaveVariation={vi.fn()}
        onSetAmbientMotionEnabled={vi.fn()}
        onToggleLayerVisibility={vi.fn()}
      />,
    )

    const slider = screen.getByRole('slider', { name: 'Corner Radius' })
    fireEvent.change(slider, { target: { value: '0.2' } })
    fireEvent.pointerUp(slider)

    expect(onPreviewDieShapeParams).toHaveBeenCalledWith({ cornerRadius: 0.2 })
    expect(onCommitDieShapeParamEdit).toHaveBeenCalledOnce()
  })

  it('wires chip finish controls inside Appearance', async () => {
    const project = createHeroChip('aurora', 1)
    project.finish = 'gloss'
    const onSetFinish = vi.fn()

    render(
      <EditorInspectorRail
        project={project}
        selectedBlock={null}
        selectedStudioItem={null}
        layerVisibility={DEFAULT_LAYER_VISIBILITY}
        ambientMotionEnabled={true}
        prefersReducedMotion={false}
        ambientMotionBudget={ambientMotionBudget}
        onSetTileSettings={vi.fn()}
        onPreviewDieShapeParams={vi.fn()}
        onCommitDieShapeParamEdit={vi.fn()}
        onCancelDieShapeParamEdit={vi.fn()}
        onSetDieShapeParams={vi.fn()}
        onSetFinish={onSetFinish}
        onSetBlockFinish={vi.fn()}
        onSetColorPaint={vi.fn()}
        onUpdateBlockVisual={vi.fn()}
        onUpdateSticker={vi.fn()}
        onUpdateSpray={vi.fn()}
        onSetSpec={vi.fn()}
        onApplyAiSuggestion={vi.fn()}
        onSaveVariation={vi.fn()}
        onSetAmbientMotionEnabled={vi.fn()}
        onToggleLayerVisibility={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Brushed metal' }))

    expect(onSetFinish).toHaveBeenCalledWith('metallic')
  })

  it('wires ambient motion controls inside Appearance without passing editor state to export', async () => {
    const onSetAmbientMotionEnabled = vi.fn()

    render(
      <EditorInspectorRail
        project={createHeroChip('aurora', 1)}
        selectedBlock={null}
        selectedStudioItem={null}
        layerVisibility={DEFAULT_LAYER_VISIBILITY}
        ambientMotionEnabled={false}
        prefersReducedMotion={true}
        ambientMotionBudget={ambientMotionBudget}
        onSetTileSettings={vi.fn()}
        onPreviewDieShapeParams={vi.fn()}
        onCommitDieShapeParamEdit={vi.fn()}
        onCancelDieShapeParamEdit={vi.fn()}
        onSetDieShapeParams={vi.fn()}
        onSetFinish={vi.fn()}
        onSetBlockFinish={vi.fn()}
        onSetColorPaint={vi.fn()}
        onUpdateBlockVisual={vi.fn()}
        onUpdateSticker={vi.fn()}
        onUpdateSpray={vi.fn()}
        onSetSpec={vi.fn()}
        onApplyAiSuggestion={vi.fn()}
        onSaveVariation={vi.fn()}
        onSetAmbientMotionEnabled={onSetAmbientMotionEnabled}
        onToggleLayerVisibility={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('switch', { name: 'Ambient motion' }))

    expect(onSetAmbientMotionEnabled).toHaveBeenCalledWith(true)
    expect(captured.props).not.toHaveProperty('ambientMotionEnabled')
  })

  it('wires selected tile finish override controls inside Appearance', async () => {
    const project = createHeroChip('aurora', 1)
    project.finish = 'gloss'
    const selectedBlock = { ...project.blocks[0], finish: 'satin' as const }
    const onSetBlockFinish = vi.fn()

    render(
      <EditorInspectorRail
        project={project}
        selectedBlock={selectedBlock}
        selectedStudioItem={null}
        layerVisibility={DEFAULT_LAYER_VISIBILITY}
        ambientMotionEnabled={true}
        prefersReducedMotion={false}
        ambientMotionBudget={ambientMotionBudget}
        onSetTileSettings={vi.fn()}
        onPreviewDieShapeParams={vi.fn()}
        onCommitDieShapeParamEdit={vi.fn()}
        onCancelDieShapeParamEdit={vi.fn()}
        onSetDieShapeParams={vi.fn()}
        onSetFinish={vi.fn()}
        onSetBlockFinish={onSetBlockFinish}
        onSetColorPaint={vi.fn()}
        onUpdateBlockVisual={vi.fn()}
        onUpdateSticker={vi.fn()}
        onUpdateSpray={vi.fn()}
        onSetSpec={vi.fn()}
        onApplyAiSuggestion={vi.fn()}
        onSaveVariation={vi.fn()}
        onSetAmbientMotionEnabled={vi.fn()}
        onToggleLayerVisibility={vi.fn()}
      />,
    )

    const group = screen.getByRole('group', { name: 'Selected tile material controls' })
    await userEvent.click(within(group).getByRole('button', { name: 'Matte ceramic' }))
    expect(onSetBlockFinish).toHaveBeenCalledWith(selectedBlock.id, 'matte')

    await userEvent.click(
      within(group).getByRole('button', { name: 'Inherit chip finish: Gloss glass' }),
    )
    expect(onSetBlockFinish).toHaveBeenCalledWith(selectedBlock.id, undefined)
  })
})

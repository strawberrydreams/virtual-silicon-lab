import type {
  Block,
  DieShapeParams,
  Project,
  StudioColorPaint,
  StudioColorTarget,
  StudioSpray,
  StudioSticker,
  StudioTileSettings,
} from '../../domain/project'
import type { AiLayoutSuggestion } from '../../domain/ai/aiLayoutSuggestion'
import type { ChipFinish } from '../../domain/material/chipFinish'
import type { SelectedStudioItem } from '../../stores/editorStore'
import type { AmbientMotionBudget } from '../../visual/ambientEditorAnimation'
import { ExportPanel } from '../export/ExportPanel'
import { PublishPanel } from '../publish/PublishPanel'
import { AiSpecPanel } from '../specs/AiSpecPanel'
import { FakeSpecForm } from '../specs/FakeSpecForm'
import { GeneratedSpecPanel } from '../specs/GeneratedSpecPanel'
import { BlockVisualPanel } from './BlockVisualPanel'
import { AiLayoutSuggestionsPanel } from './AiLayoutSuggestionsPanel'
import { AiVariationsPanel } from './AiVariationsPanel'
import { ColorSettingsPanel } from './ColorSettingsPanel'
import { LayerVisibilityPanel } from './LayerVisibilityPanel'
import { SelectedTilePanel } from './SelectedTilePanel'
import { StudioInspector } from './StudioInspector'
import { TileSettingsPanel } from './TileSettingsPanel'
import { DieParameterPanel } from './DieParameterPanel'
import { ChipFinishPanel } from './ChipFinishPanel'
import { AmbientMotionPanel } from './AmbientMotionPanel'
import type { ChipLayerId, ChipLayerVisibility } from './layerVisibility'

type Props = {
  project: Project
  selectedBlock: Block | null
  selectedStudioItem: SelectedStudioItem | null
  layerVisibility: ChipLayerVisibility
  ambientMotionEnabled: boolean
  prefersReducedMotion: boolean
  ambientMotionBudget: AmbientMotionBudget
  onSetTileSettings: (patch: Partial<StudioTileSettings>) => void
  onPreviewDieShapeParams: (params: DieShapeParams) => void
  onCommitDieShapeParamEdit: () => void
  onCancelDieShapeParamEdit: () => void
  onSetDieShapeParams: (params: DieShapeParams) => void
  onSetFinish: (finish: ChipFinish) => void
  onSetBlockFinish: (id: string, finish: ChipFinish | undefined) => void
  onSetColorPaint: (target: StudioColorTarget, paint: StudioColorPaint) => void
  onUpdateBlockVisual: (
    id: string,
    patch: Partial<Pick<Block, 'colorOverride' | 'imageDataUrl'>>,
  ) => void
  onUpdateSticker: (
    id: string,
    patch: Partial<Pick<StudioSticker, 'kind' | 'text' | 'color' | 'rotation'>>,
  ) => void
  onUpdateSpray: (
    id: string,
    patch: Partial<Pick<StudioSpray, 'color' | 'intensity' | 'radius' | 'blend'>>,
  ) => void
  onSetSpec: (spec: Project['spec']) => void
  onApplyAiSuggestion: (suggestion: AiLayoutSuggestion) => void
  onSaveVariation: (variation: Project) => Promise<unknown>
  onSetAmbientMotionEnabled: (enabled: boolean) => void
  onToggleLayerVisibility: (layer: ChipLayerId) => void
}

export function EditorInspectorRail({
  project,
  selectedBlock,
  selectedStudioItem,
  layerVisibility,
  ambientMotionEnabled,
  prefersReducedMotion,
  ambientMotionBudget,
  onSetTileSettings,
  onPreviewDieShapeParams,
  onCommitDieShapeParamEdit,
  onCancelDieShapeParamEdit,
  onSetDieShapeParams,
  onSetFinish,
  onSetBlockFinish,
  onSetColorPaint,
  onUpdateBlockVisual,
  onUpdateSticker,
  onUpdateSpray,
  onSetSpec,
  onApplyAiSuggestion,
  onSaveVariation,
  onSetAmbientMotionEnabled,
  onToggleLayerVisibility,
}: Props) {
  return (
    <aside
      aria-label="Inspector and export rail"
      className="editor-side-rail editor-inspector-rail"
    >
      <GeneratedSpecPanel project={project} />
      <SelectedTilePanel block={selectedBlock} project={project} />
      <section
        aria-label="Appearance controls"
        className="editor-inspector-card editor-inspector-card--stack"
      >
        <div>
          <p className="editor-kicker">Appearance</p>
          <h2>Appearance</h2>
        </div>
        <DieParameterPanel
          die={project.die}
          onPreview={onPreviewDieShapeParams}
          onCommit={onCommitDieShapeParamEdit}
          onCancel={onCancelDieShapeParamEdit}
          onSet={onSetDieShapeParams}
        />
        <ChipFinishPanel finish={project.finish} onChange={onSetFinish} />
        <AmbientMotionPanel
          enabled={ambientMotionEnabled}
          prefersReducedMotion={prefersReducedMotion}
          budget={ambientMotionBudget}
          onChange={onSetAmbientMotionEnabled}
        />
        <TileSettingsPanel
          tileSettings={project.studio.tileSettings}
          onChange={onSetTileSettings}
        />
        <ColorSettingsPanel
          colorSettings={project.studio.colorSettings}
          onChange={onSetColorPaint}
        />
        <BlockVisualPanel
          block={selectedBlock}
          chipFinish={project.finish}
          onChange={onUpdateBlockVisual}
          onSetBlockFinish={onSetBlockFinish}
        />
      </section>
      <LayerVisibilityPanel visibility={layerVisibility} onToggle={onToggleLayerVisibility} />
      <section
        aria-label="Advanced editor controls"
        className="editor-inspector-card editor-inspector-card--stack"
      >
        <div>
          <p className="editor-kicker">Advanced</p>
          <h2>Advanced Controls</h2>
        </div>
        <StudioInspector
          project={project}
          selectedStudioItem={selectedStudioItem}
          onUpdateSticker={onUpdateSticker}
          onUpdateSpray={onUpdateSpray}
        />
        <AiSpecPanel project={project} onApply={onSetSpec} />
        <AiLayoutSuggestionsPanel project={project} onApply={onApplyAiSuggestion} />
        <AiVariationsPanel project={project} onSaveVariation={onSaveVariation} />
        <FakeSpecForm spec={project.spec} onChange={onSetSpec} />
        {/* Exports always composite the full artwork from project data; the
            editor's ephemeral layer toggles must never leak into the PNGs. */}
        <PublishPanel project={project} />
        <ExportPanel project={project} />
      </section>
    </aside>
  )
}

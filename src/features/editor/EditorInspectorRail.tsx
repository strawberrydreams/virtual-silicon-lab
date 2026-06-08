import type {
  Block,
  Project,
  StudioColorPaint,
  StudioColorTarget,
  StudioSpray,
  StudioSticker,
  StudioTileSettings,
} from '../../domain/project'
import type { SelectedStudioItem } from '../../stores/editorStore'
import { ExportPanel } from '../export/ExportPanel'
import { FakeSpecForm } from '../specs/FakeSpecForm'
import { GeneratedSpecPanel } from '../specs/GeneratedSpecPanel'
import { BlockVisualPanel } from './BlockVisualPanel'
import { ColorSettingsPanel } from './ColorSettingsPanel'
import { LayerVisibilityPanel } from './LayerVisibilityPanel'
import { SelectedTilePanel } from './SelectedTilePanel'
import { StudioInspector } from './StudioInspector'
import { TileSettingsPanel } from './TileSettingsPanel'
import type { ChipLayerId, ChipLayerVisibility } from './layerVisibility'

type Props = {
  project: Project
  selectedBlock: Block | null
  selectedStudioItem: SelectedStudioItem | null
  layerVisibility: ChipLayerVisibility
  onSetTileSettings: (patch: Partial<StudioTileSettings>) => void
  onSetColorPaint: (target: StudioColorTarget, paint: StudioColorPaint) => void
  onUpdateBlockVisual: (id: string, patch: Partial<Pick<Block, 'colorOverride' | 'imageDataUrl'>>) => void
  onUpdateSticker: (
    id: string,
    patch: Partial<Pick<StudioSticker, 'kind' | 'text' | 'color' | 'rotation'>>,
  ) => void
  onUpdateSpray: (
    id: string,
    patch: Partial<Pick<StudioSpray, 'color' | 'intensity' | 'radius' | 'blend'>>,
  ) => void
  onSetSpec: (spec: Project['spec']) => void
  onToggleLayerVisibility: (layer: ChipLayerId) => void
}

export function EditorInspectorRail({
  project,
  selectedBlock,
  selectedStudioItem,
  layerVisibility,
  onSetTileSettings,
  onSetColorPaint,
  onUpdateBlockVisual,
  onUpdateSticker,
  onUpdateSpray,
  onSetSpec,
  onToggleLayerVisibility,
}: Props) {
  return (
    <aside aria-label="Inspector and export rail" className="editor-side-rail editor-inspector-rail">
      <GeneratedSpecPanel project={project} />
      <SelectedTilePanel block={selectedBlock} project={project} />
      <section aria-label="Appearance controls" className="editor-inspector-card editor-inspector-card--stack">
        <div>
          <p className="editor-kicker">Appearance</p>
          <h2>Appearance</h2>
        </div>
        <TileSettingsPanel tileSettings={project.studio.tileSettings} onChange={onSetTileSettings} />
        <ColorSettingsPanel colorSettings={project.studio.colorSettings} onChange={onSetColorPaint} />
        <BlockVisualPanel block={selectedBlock} onChange={onUpdateBlockVisual} />
      </section>
      <LayerVisibilityPanel visibility={layerVisibility} onToggle={onToggleLayerVisibility} />
      <section aria-label="Advanced editor controls" className="editor-inspector-card editor-inspector-card--stack">
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
        <FakeSpecForm spec={project.spec} onChange={onSetSpec} />
        <ExportPanel project={project} layerVisibility={layerVisibility} />
      </section>
    </aside>
  )
}

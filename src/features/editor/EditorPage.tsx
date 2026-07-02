import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from 'zustand'
import type { Project } from '../../domain/project'
import { resolveChipFinishDescriptor } from '../../domain/material/chipFinish'
import { createEditorStore } from '../../stores/editorStore'
import {
  ambientMotionBudgetForProject,
  resolveAmbientMotionDefault,
} from '../../visual/ambientEditorAnimation'
import { chipThemeLabel } from '../../visual/themeFinish'
import { BlockPalette } from './BlockPalette'
import { EditorInspectorRail } from './EditorInspectorRail'
import { EditorToolbar } from './EditorToolbar'
import { PlayIcon, RedoIcon, UndoIcon } from './icons'
import { ChipStage } from './canvas/ChipStage'
import { DEFAULT_LAYER_VISIBILITY, type ChipLayerId } from './layerVisibility'
import { useAutosave } from './useAutosave'
import { useEditorShortcuts } from './useEditorShortcuts'
import { FirstRunCoachmarks } from './FirstRunCoachmarks'
import Chip3DPreviewToggle from './Chip3DPreviewToggle'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

type Props = {
  project: Project
  persist: (project: Project) => void
  onSaveVariation: (variation: Project) => Promise<unknown>
}

export function EditorPage({ project, persist, onSaveVariation }: Props) {
  const store = useMemo(() => createEditorStore(project), [project])
  const [layerVisibility, setLayerVisibility] = useState(DEFAULT_LAYER_VISIBILITY)
  const prefersReducedMotion = usePrefersReducedMotion()
  const [ambientMotionEnabled, setAmbientMotionEnabled] = useState(() =>
    resolveAmbientMotionDefault(prefersReducedMotion),
  )
  const state = useStore(store)

  useAutosave(store, persist)
  useEditorShortcuts({
    undo: state.undo,
    redo: state.redo,
    delete: state.deleteSelected,
    duplicate: state.duplicateSelected,
    bringForward: state.bringForward,
    sendBackward: state.sendBackward,
    deselect: () => state.select(null),
  })

  const blockCount = state.project.blocks.length
  const dieLabel = `${state.project.die.shape} ${state.project.die.width}x${state.project.die.height}`
  const themeLabel = chipThemeLabel(state.project.theme)
  const finishLabel = resolveChipFinishDescriptor(state.project.finish).label
  const ambientMotionBudget = useMemo(
    () => ambientMotionBudgetForProject(state.project),
    [state.project],
  )
  const selectedBlock =
    state.selectedBlockId === null
      ? null
      : (state.project.blocks.find((block) => block.id === state.selectedBlockId) ?? null)
  const toggleLayerVisibility = (layer: ChipLayerId) => {
    setLayerVisibility((current) => ({ ...current, [layer]: !current[layer] }))
  }

  return (
    <main
      aria-label="Chip editor workspace"
      className="editor-shell editor-shell--reference min-h-screen bg-[var(--v2-bg)] text-[var(--v2-text)]"
    >
      <BlockPalette
        addBlock={state.addBlock}
        addDecoration={state.addDecoration}
        addSticker={state.addSticker}
        addSpray={state.addSpray}
      />
      <section aria-label="Editor canvas workspace" className="editor-mainframe" role="region">
        <section aria-label="Product analysis stage" className="editor-center" role="region">
          <div
            aria-label="Editor top command bar"
            className="editor-command-deck editor-topbar"
            role="region"
          >
            <div>
              <p className="editor-kicker">Active project</p>
              <h1 className="editor-title">{state.project.name}</h1>
            </div>
            <div className="editor-readout-grid" aria-label="Project readouts">
              <span>
                <strong>Die</strong>
                {dieLabel}
              </span>
              <span>
                <strong>Blocks</strong>
                {blockCount}
              </span>
              <span>
                <strong>Theme</strong>
                {themeLabel}
              </span>
              <span>
                <strong>Finish</strong>
                {finishLabel}
              </span>
            </div>
            <div className="editor-topbar-actions">
              <button
                className="editor-icon-button"
                type="button"
                onClick={state.undo}
                disabled={state.past.length === 0}
              >
                <span className="editor-icon-button__icon" aria-hidden="true">
                  <UndoIcon />
                </span>
                Undo
              </button>
              <button
                className="editor-icon-button"
                type="button"
                onClick={state.redo}
                disabled={state.future.length === 0}
              >
                <span className="editor-icon-button__icon" aria-hidden="true">
                  <RedoIcon />
                </span>
                Redo
              </button>
              <button className="editor-simulate-button" type="button" disabled>
                <span className="editor-icon-button__icon" aria-hidden="true">
                  <PlayIcon />
                </span>
                Simulate
              </button>
              <Chip3DPreviewToggle
                project={state.project}
                onSetScene3DCamera={state.setScene3DCamera}
                onResetScene3DCamera={state.resetScene3DCamera}
                onSetScene3DLighting={state.setScene3DLighting}
                onResetScene3DLighting={state.resetScene3DLighting}
                onSetScene3DEnvironment={state.setScene3DEnvironment}
                onResetScene3DEnvironment={state.resetScene3DEnvironment}
                onApplyScene3DLook={state.applyScene3DLook}
                onSetScene3DAnimation={state.setScene3DAnimation}
                onResetScene3DAnimation={state.resetScene3DAnimation}
              />
              <Link className="editor-exit-link" to="/dashboard">
                Exit Editor
              </Link>
            </div>
          </div>

          <EditorToolbar
            dieShape={state.project.die.shape}
            theme={state.project.theme}
            canUndo={state.past.length > 0}
            canRedo={state.future.length > 0}
            hasSelection={state.selectedBlockId !== null || state.selectedStudioItem !== null}
            hasBlockSelection={state.selectedBlockId !== null}
            onSetDieShape={state.setDieShape}
            onSetTheme={state.setTheme}
            onAddDecoration={state.addDecoration}
            onUndo={state.undo}
            onRedo={state.redo}
            onDuplicate={state.duplicateSelected}
            onDelete={state.deleteSelected}
            onBringForward={state.bringForward}
            onSendBackward={state.sendBackward}
          />

          <div className="editor-stage-wrap">
            <FirstRunCoachmarks />
            <ChipStage
              project={state.project}
              selectedBlockId={state.selectedBlockId}
              selectedStudioItem={state.selectedStudioItem}
              layerVisibility={layerVisibility}
              ambientMotionEnabled={ambientMotionEnabled}
              ambientMotionBudget={ambientMotionBudget}
              onSelectBlock={state.select}
              onSelectStudioItem={state.selectStudioItem}
              onTransformBlock={state.transformBlock}
              onTransformSticker={state.transformSticker}
              onTransformSpray={state.transformSpray}
              onAddFreeformVertex={state.addFreeformVertex}
              onMoveFreeformVertex={state.moveFreeformVertex}
              onDeleteFreeformVertex={state.deleteFreeformVertex}
            />
          </div>
          <div aria-label="Editor status bar" className="editor-statusbar" role="region">
            <span>Autosaved</span>
            <span>GRID: 10µm</span>
            <span>SNAP: ON</span>
            <span>DRC: OFF</span>
          </div>
        </section>
      </section>
      <EditorInspectorRail
        project={state.project}
        selectedBlock={selectedBlock}
        selectedStudioItem={state.selectedStudioItem}
        layerVisibility={layerVisibility}
        ambientMotionEnabled={ambientMotionEnabled}
        prefersReducedMotion={prefersReducedMotion}
        ambientMotionBudget={ambientMotionBudget}
        onSetTileSettings={state.setTileSettings}
        onPreviewDieShapeParams={state.previewDieShapeParams}
        onCommitDieShapeParamEdit={state.commitDieShapeParamEdit}
        onCancelDieShapeParamEdit={state.cancelDieShapeParamEdit}
        onSetDieShapeParams={state.setDieShapeParams}
        onSetFinish={state.setFinish}
        onSetBlockFinish={state.setBlockFinish}
        onSetColorPaint={state.setColorPaint}
        onUpdateBlockVisual={state.updateBlockVisual}
        onUpdateSticker={state.updateSticker}
        onUpdateSpray={state.updateSpray}
        onSetSpec={state.setSpec}
        onApplyAiSuggestion={state.applyAiSuggestion}
        onSaveVariation={onSaveVariation}
        onSetAmbientMotionEnabled={setAmbientMotionEnabled}
        onToggleLayerVisibility={toggleLayerVisibility}
      />
    </main>
  )
}

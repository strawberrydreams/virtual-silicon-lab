import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from 'zustand'
import type { Project } from '../../domain/project'
import { createEditorStore } from '../../stores/editorStore'
import { BlockPalette } from './BlockPalette'
import { EditorInspectorRail } from './EditorInspectorRail'
import { EditorToolbar } from './EditorToolbar'
import { PlayIcon, RedoIcon, UndoIcon } from './icons'
import { ChipStage } from './canvas/ChipStage'
import { DEFAULT_LAYER_VISIBILITY, type ChipLayerId } from './layerVisibility'
import { chipFinishLabel } from '../../visual/themeFinish'
import { useAutosave } from './useAutosave'
import { useEditorShortcuts } from './useEditorShortcuts'
import { FirstRunCoachmarks } from './FirstRunCoachmarks'

type Props = {
  project: Project
  persist: (project: Project) => void
}

export function EditorPage({ project, persist }: Props) {
  const store = useMemo(() => createEditorStore(project), [project])
  const [layerVisibility, setLayerVisibility] = useState(DEFAULT_LAYER_VISIBILITY)
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
                {chipFinishLabel(state.project.theme)}
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
              onSelectBlock={state.select}
              onSelectStudioItem={state.selectStudioItem}
              onTransformBlock={state.transformBlock}
              onTransformSticker={state.transformSticker}
              onTransformSpray={state.transformSpray}
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
        onSetTileSettings={state.setTileSettings}
        onSetColorPaint={state.setColorPaint}
        onUpdateBlockVisual={state.updateBlockVisual}
        onUpdateSticker={state.updateSticker}
        onUpdateSpray={state.updateSpray}
        onSetSpec={state.setSpec}
        onToggleLayerVisibility={toggleLayerVisibility}
      />
    </main>
  )
}

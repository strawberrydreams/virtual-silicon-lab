import { useMemo } from 'react'
import { useStore } from 'zustand'
import type { Project } from '../../domain/project'
import { createEditorStore } from '../../stores/editorStore'
import { BlockPalette } from './BlockPalette'
import { EditorToolbar } from './EditorToolbar'
import { ChipStage } from './canvas/ChipStage'
import { FakeSpecForm } from '../specs/FakeSpecForm'
import { ExportPanel } from '../export/ExportPanel'
import { useAutosave } from './useAutosave'
import { useEditorShortcuts } from './useEditorShortcuts'

type Props = {
  project: Project
  persist: (project: Project) => void
}

export function EditorPage({ project, persist }: Props) {
  const store = useMemo(() => createEditorStore(project), [project])
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

  return (
    <main
      aria-label="Chip editor workspace"
      className="editor-shell min-h-screen bg-[var(--v2-bg)] text-[var(--v2-text)]"
    >
      <BlockPalette addBlock={state.addBlock} />
      <section aria-label="Product analysis stage" className="editor-center" role="region">
        <div className="editor-command-deck">
          <div>
            <p className="editor-kicker">Active project</p>
            <h1 className="editor-title">{state.project.name}</h1>
          </div>
          <div className="editor-readout-grid" aria-label="Project readouts">
            <span>{dieLabel}</span>
            <span>{blockCount} blocks</span>
            <span>{state.project.theme}</span>
          </div>
        </div>

        <EditorToolbar
          dieShape={state.project.die.shape}
          theme={state.project.theme}
          canUndo={state.past.length > 0}
          canRedo={state.future.length > 0}
          hasSelection={state.selectedBlockId !== null}
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
          <ChipStage
            project={state.project}
            selectedBlockId={state.selectedBlockId}
            onSelectBlock={state.select}
            onTransformBlock={state.transformBlock}
          />
        </div>
      </section>
      <aside aria-label="Inspector and export rail" className="editor-side-rail editor-inspector-rail">
        <FakeSpecForm spec={state.project.spec} onChange={state.setSpec} />
        <ExportPanel project={state.project} />
      </aside>
    </main>
  )
}

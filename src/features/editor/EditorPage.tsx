import { useMemo } from 'react'
import { useStore } from 'zustand'
import type { Project } from '../../domain/project'
import { createEditorStore } from '../../stores/editorStore'
import { BlockPalette } from './BlockPalette'
import { EditorToolbar } from './EditorToolbar'
import { ChipStage } from './canvas/ChipStage'
import { FakeSpecForm } from '../specs/FakeSpecForm'
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

  return (
    <main className="flex min-h-screen bg-[#03080b] text-[#d8f7ff]">
      <BlockPalette addBlock={state.addBlock} />
      <section className="flex flex-1 flex-col">
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
        <div className="p-6">
          <h1 className="mb-4 text-lg tracking-[0.25em] uppercase">{state.project.name}</h1>
          <ChipStage
            project={state.project}
            selectedBlockId={state.selectedBlockId}
            onSelectBlock={state.select}
            onTransformBlock={state.transformBlock}
          />
        </div>
      </section>
      <aside className="w-80 border-l border-cyan-900 bg-[#071015] p-4">
        <FakeSpecForm spec={state.project.spec} onChange={state.setSpec} />
      </aside>
    </main>
  )
}

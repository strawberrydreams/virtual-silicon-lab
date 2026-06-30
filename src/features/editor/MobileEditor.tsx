import { useMemo } from 'react'
import { useStore } from 'zustand'
import type { Project } from '../../domain/project'
import { createEditorStore } from '../../stores/editorStore'
import { isChip3DShowcaseAvailable } from '../../three/chip3dAvailability'
import Chip3DPreviewToggle from './Chip3DPreviewToggle'
import { MobileEditorPreview } from './MobileEditorPreview'
import { useAutosave } from './useAutosave'

// Mobile keeps 2D Konva authoring desktop-only, but this store-backed route lets
// the derived 3D showcase render now and receive authoring callbacks in later v11 milestones.
export function MobileEditor({
  project,
  persist,
}: {
  project: Project
  persist: (project: Project) => void
}) {
  const store = useMemo(() => createEditorStore(project), [project])
  const state = useStore(store)
  useAutosave(store, persist)

  const canShow3D = isChip3DShowcaseAvailable(state.project)

  return (
    <MobileEditorPreview
      project={state.project}
      chip3dSlot={canShow3D ? <Chip3DPreviewToggle project={state.project} /> : null}
    />
  )
}

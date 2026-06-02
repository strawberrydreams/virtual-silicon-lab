import { useEffect } from 'react'
import type { StoreApi } from 'zustand'
import { createDebouncer } from '../../lib/debounce'
import type { EditorState } from '../../stores/editorStore'
import type { Project } from '../../domain/project'

export function useAutosave(
  store: StoreApi<EditorState>,
  persist: (project: Project) => void,
  delayMs = 600,
) {
  useEffect(() => {
    const debouncer = createDebouncer(() => persist(store.getState().project), delayMs)
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.project !== previous.project) debouncer.schedule()
    })
    return () => {
      debouncer.cancel()
      unsubscribe()
    }
  }, [store, persist, delayMs])
}

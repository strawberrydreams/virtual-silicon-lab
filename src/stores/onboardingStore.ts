import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

const STORAGE_KEY = 'vsl.onboarding'

type PersistedOnboarding = {
  editorTourDismissed?: boolean
}

type OnboardingState = {
  editorTourDismissed: boolean
  dismissEditorTour: () => void
}

function readPersisted(): PersistedOnboarding {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return {}
    const parsed = JSON.parse(raw) as PersistedOnboarding
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function writePersisted(state: PersistedOnboarding) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Local persistence is best-effort; losing onboarding dismissal should not
    // break the editor.
  }
}

export function createOnboardingStore() {
  const persisted = readPersisted()
  return createStore<OnboardingState>((set) => ({
    editorTourDismissed: persisted.editorTourDismissed === true,
    dismissEditorTour() {
      writePersisted({ editorTourDismissed: true })
      set({ editorTourDismissed: true })
    },
  }))
}

const onboardingStore = createOnboardingStore()

export function useOnboardingStore() {
  return useStore(onboardingStore)
}

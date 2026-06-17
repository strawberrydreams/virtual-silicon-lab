import { beforeEach, describe, expect, it } from 'vitest'
import { createOnboardingStore } from './onboardingStore'

describe('onboardingStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with the editor tour visible, then persists dismissal', () => {
    const first = createOnboardingStore()
    expect(first.getState().editorTourDismissed).toBe(false)

    first.getState().dismissEditorTour()
    expect(first.getState().editorTourDismissed).toBe(true)
    expect(createOnboardingStore().getState().editorTourDismissed).toBe(true)
  })
})

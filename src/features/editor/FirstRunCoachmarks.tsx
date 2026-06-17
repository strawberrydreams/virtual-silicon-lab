import { useOnboardingStore } from '../../stores/onboardingStore'

export function FirstRunCoachmarks() {
  const onboarding = useOnboardingStore()
  if (onboarding.editorTourDismissed) return null

  return (
    <aside className="editor-coachmarks" aria-label="First-run editor tour">
      <div className="editor-coachmarks__panel">
        <p className="editor-kicker">First Run</p>
        <h2>Build a chip in four moves</h2>
        <ol>
          <li>Add a block from the left rail.</li>
          <li>Pick a finish in the command bar.</li>
          <li>Edit the fake spec in the inspector.</li>
          <li>Export a poster when the layout reads clean.</li>
        </ol>
        <div className="editor-coachmarks__actions">
          <button type="button" onClick={onboarding.dismissEditorTour}>
            Skip
          </button>
          <button type="button" onClick={onboarding.dismissEditorTour}>
            Done
          </button>
        </div>
      </div>
    </aside>
  )
}

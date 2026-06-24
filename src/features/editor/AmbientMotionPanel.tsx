import type { AmbientMotionBudget } from '../../visual/ambientEditorAnimation'

type Props = {
  enabled: boolean
  prefersReducedMotion: boolean
  budget: AmbientMotionBudget
  onChange: (enabled: boolean) => void
}

export function AmbientMotionPanel({ enabled, prefersReducedMotion, budget, onChange }: Props) {
  const status =
    budget.reason ??
    (prefersReducedMotion
      ? 'Reduced motion is on; ambient motion starts disabled.'
      : 'Glow pulse and trace shimmer are editor-only.')

  return (
    <div aria-label="Ambient motion controls" className="ambient-motion-panel">
      <div>
        <p className="editor-kicker">Canvas motion</p>
        <h2>Ambient Motion</h2>
      </div>
      <button
        aria-checked={enabled}
        className={enabled ? 'ambient-motion-panel__switch is-on' : 'ambient-motion-panel__switch'}
        onClick={() => onChange(!enabled)}
        role="switch"
        type="button"
      >
        <span aria-hidden="true" />
        Ambient motion
      </button>
      <p className="ambient-motion-panel__copy">{status}</p>
    </div>
  )
}

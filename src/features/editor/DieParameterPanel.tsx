import { useId, type KeyboardEvent } from 'react'
import type { Die, DieCorner, DieShapeParams } from '../../domain/project'
import {
  defaultDieShapeParams,
  resolveDieParameterControl,
  withDieNotchCorner,
  withDieParameterValue,
} from '../../domain/die/dieParameterControls'
import { resolveDieShapeParams } from '../../domain/die/dieShapeParams'

type Props = {
  die: Die
  onPreview: (params: DieShapeParams) => void
  onCommit: () => void
  onCancel: () => void
  onSet: (params: DieShapeParams) => void
}

const CORNERS: { corner: DieCorner; label: string; shortLabel: string }[] = [
  { corner: 'top-left', label: 'Top left', shortLabel: 'TL' },
  { corner: 'top-right', label: 'Top right', shortLabel: 'TR' },
  { corner: 'bottom-right', label: 'Bottom right', shortLabel: 'BR' },
  { corner: 'bottom-left', label: 'Bottom left', shortLabel: 'BL' },
]

const SHAPE_LABELS: Record<Die['shape'], string> = {
  rect: 'Rect',
  square: 'Square',
  circle: 'Circle',
  hexagon: 'Hexagon',
  octagon: 'Octagon',
  'rounded-rect': 'Rounded Rect',
  'chamfered-rect': 'Chamfered Rect',
  keyed: 'Keyed',
  'l-shape': 'L-Shape',
  plus: 'Plus',
}

const COMMIT_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])

export function DieParameterPanel({ die, onPreview, onCommit, onCancel, onSet }: Props) {
  const sliderId = useId()
  const control = resolveDieParameterControl(die)
  if (control === undefined) return null

  const currentParams = resolveDieShapeParams(die.shape, die.dieShapeParams)
  const defaults = defaultDieShapeParams(die.shape)
  const resetDisabled = JSON.stringify(currentParams) === JSON.stringify(defaults)

  const cancelOnEscape = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    onCancel()
  }

  return (
    <section aria-label="Die parameter controls" className="die-parameter-panel">
      <div className="die-parameter-panel__heading">
        <div>
          <p className="editor-kicker">Shape geometry</p>
          <h2>Die Parameters</h2>
        </div>
        <span>{SHAPE_LABELS[die.shape]}</span>
      </div>
      <label className="die-parameter-panel__slider" htmlFor={sliderId}>
        <span>{control.label}</span>
        <output htmlFor={sliderId}>{Math.round(control.value * 100)}%</output>
        <input
          id={sliderId}
          aria-label={control.label}
          max={control.max}
          min={control.min}
          step={control.step}
          type="range"
          value={control.value}
          onBlur={onCommit}
          onChange={(event) => {
            const params = withDieParameterValue(die, Number(event.target.value))
            if (params !== undefined) onPreview(params)
          }}
          onKeyDown={cancelOnEscape}
          onKeyUp={(event) => {
            if (COMMIT_KEYS.has(event.key)) onCommit()
          }}
          onPointerCancel={onCancel}
          onPointerUp={onCommit}
        />
      </label>
      {control.corner === undefined ? null : (
        <div aria-label="Notch corner" className="die-parameter-panel__corners" role="group">
          {CORNERS.map(({ corner, label, shortLabel }) => (
            <button
              key={corner}
              aria-label={label}
              aria-pressed={control.corner === corner}
              onClick={() => {
                const params = withDieNotchCorner(die, corner)
                if (params !== undefined) onSet(params)
              }}
              type="button"
            >
              {shortLabel}
            </button>
          ))}
        </div>
      )}
      <button
        aria-label="Reset die parameters"
        className="die-parameter-panel__reset"
        disabled={resetDisabled}
        onClick={() => {
          if (defaults !== undefined) onSet(defaults)
        }}
        type="button"
      >
        Reset to Default
      </button>
    </section>
  )
}

import { useMemo, useState } from 'react'
import type { StudioColorPaint, StudioColorSettings, StudioColorTarget } from '../../domain/project'

type Props = {
  colorSettings: StudioColorSettings
  onChange: (target: StudioColorTarget, paint: StudioColorPaint) => void
}

const TARGETS: { target: StudioColorTarget; label: string }[] = [
  { target: 'background', label: 'Background' },
  { target: 'package', label: 'Package' },
  { target: 'die', label: 'Die' },
  { target: 'block', label: 'Block' },
  { target: 'tile', label: 'Tile' },
  { target: 'trace', label: 'Bus' },
  { target: 'label', label: 'Label' },
  { target: 'mark', label: 'Mark' },
]

const fieldClass =
  'mt-1 w-full rounded border border-cyan-900 bg-[#050d12] px-2 py-1 text-sm text-cyan-100 outline-none focus:border-cyan-500'
const labelClass = 'block text-[11px] uppercase tracking-wider text-cyan-400'

function solidColor(paint: StudioColorPaint) {
  return paint.mode === 'solid' ? paint.color : paint.from
}

function gradientFrom(paint: StudioColorPaint) {
  return paint.mode === 'gradient' ? paint.from : paint.color
}

function gradientTo(paint: StudioColorPaint) {
  return paint.mode === 'gradient' ? paint.to : paint.color
}

export function ColorSettingsPanel({ colorSettings, onChange }: Props) {
  const [selectedTarget, setSelectedTarget] = useState<StudioColorTarget>('tile')
  const paint = colorSettings[selectedTarget]
  const selectedLabel = useMemo(
    () => TARGETS.find((target) => target.target === selectedTarget)?.label ?? 'Tile',
    [selectedTarget],
  )

  return (
    <section className="color-settings-panel" aria-label="Element color controls">
      <div>
        <p className="editor-kicker">Element colors</p>
        <h2>Color / Gradient</h2>
      </div>
      <div className="color-settings-panel__targets" role="group" aria-label="Color target">
        {TARGETS.map(({ target, label }) => (
          <button
            key={target}
            type="button"
            aria-pressed={selectedTarget === target}
            onClick={() => setSelectedTarget(target)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="color-settings-panel__modes"
        role="group"
        aria-label={`${selectedLabel} paint mode`}
      >
        <button
          type="button"
          aria-pressed={paint.mode === 'solid'}
          onClick={() => onChange(selectedTarget, { mode: 'solid', color: solidColor(paint) })}
        >
          Solid
        </button>
        <button
          type="button"
          aria-pressed={paint.mode === 'gradient'}
          onClick={() =>
            onChange(selectedTarget, {
              mode: 'gradient',
              from: gradientFrom(paint),
              to: gradientTo(paint),
            })
          }
        >
          Gradient
        </button>
      </div>
      {paint.mode === 'solid' ? (
        <label className={labelClass}>
          Solid color
          <input
            aria-label="Solid color"
            className={fieldClass}
            value={paint.color}
            onChange={(event) =>
              onChange(selectedTarget, { mode: 'solid', color: event.target.value })
            }
          />
        </label>
      ) : (
        <div className="studio-item-inspector__pair">
          <label className={labelClass}>
            Gradient from
            <input
              aria-label="Gradient from"
              className={fieldClass}
              value={paint.from}
              onChange={(event) =>
                onChange(selectedTarget, {
                  mode: 'gradient',
                  from: event.target.value,
                  to: paint.to,
                })
              }
            />
          </label>
          <label className={labelClass}>
            Gradient to
            <input
              aria-label="Gradient to"
              className={fieldClass}
              value={paint.to}
              onChange={(event) =>
                onChange(selectedTarget, {
                  mode: 'gradient',
                  from: paint.from,
                  to: event.target.value,
                })
              }
            />
          </label>
        </div>
      )}
    </section>
  )
}

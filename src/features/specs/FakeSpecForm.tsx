import { useEffect, useState } from 'react'
import type { FakeSpec } from '../../domain/project'
import { SPEC_EXAMPLES } from './specExamples'

function featureLines(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
}

type Props = {
  spec: FakeSpec
  onChange: (spec: FakeSpec) => void
}

const fieldClass =
  'mt-1 w-full rounded border border-cyan-900 bg-[#050d12] px-2 py-1 text-sm text-cyan-100 outline-none focus:border-cyan-500'
const labelClass = 'block text-[11px] uppercase tracking-wider text-cyan-400'

export function FakeSpecForm({ spec, onChange }: Props) {
  // The features textarea keeps raw text so newlines and blank lines survive
  // typing; `onChange` always receives the normalized array. Re-sync when the
  // features change from outside (an example button or undo/redo).
  const [featuresText, setFeaturesText] = useState(() => spec.features.join('\n'))
  useEffect(() => {
    if (featureLines(featuresText).join('\n') !== spec.features.join('\n')) {
      setFeaturesText(spec.features.join('\n'))
    }
  }, [spec.features]) // eslint-disable-line react-hooks/exhaustive-deps

  function emit(patch: Partial<FakeSpec>) {
    onChange({ ...spec, ...patch })
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-[0.25em] text-cyan-300">Fake Spec Sheet</h2>

      <div className="flex flex-wrap gap-2">
        {SPEC_EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            className="rounded border border-cyan-800 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-200 hover:border-cyan-500"
            onClick={() => onChange({ ...example.spec, features: [...example.spec.features] })}
          >
            {example.label}
          </button>
        ))}
      </div>

      <label className={labelClass}>
        Brand
        <input className={fieldClass} value={spec.brand} onChange={(event) => emit({ brand: event.target.value })} />
      </label>
      <label className={labelClass}>
        Series
        <input className={fieldClass} value={spec.series} onChange={(event) => emit({ series: event.target.value })} />
      </label>
      <label className={labelClass}>
        Generation
        <input
          className={fieldClass}
          value={spec.generation}
          onChange={(event) => emit({ generation: event.target.value })}
        />
      </label>
      <label className={labelClass}>
        Process
        <input className={fieldClass} value={spec.process} onChange={(event) => emit({ process: event.target.value })} />
      </label>
      <label className={labelClass}>
        Cores
        <input
          className={fieldClass}
          type="number"
          value={spec.cores}
          onChange={(event) => emit({ cores: Number(event.target.value) || 0 })}
        />
      </label>
      <label className={labelClass}>
        Bandwidth
        <input
          className={fieldClass}
          value={spec.bandwidth}
          onChange={(event) => emit({ bandwidth: event.target.value })}
        />
      </label>
      <label className={labelClass}>
        Features
        <textarea
          className={`${fieldClass} h-20 resize-none`}
          value={featuresText}
          onChange={(event) => {
            setFeaturesText(event.target.value)
            emit({ features: featureLines(event.target.value) })
          }}
        />
      </label>
      <label className={labelClass}>
        Description
        <textarea
          className={`${fieldClass} h-24 resize-none`}
          value={spec.description}
          onChange={(event) => emit({ description: event.target.value })}
        />
      </label>
    </div>
  )
}

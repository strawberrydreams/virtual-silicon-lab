import {
  CHIP_FINISHES,
  resolveChipFinishDescriptor,
  type ChipFinish,
} from '../../domain/material/chipFinish'

type Props = {
  finish: ChipFinish
  onChange: (finish: ChipFinish) => void
}

export function ChipFinishPanel({ finish, onChange }: Props) {
  return (
    <div aria-label="Chip finish controls" className="chip-finish-panel" role="group">
      <div>
        <p className="editor-kicker">Chip finish</p>
        <h2>Surface Finish</h2>
      </div>
      <div className="chip-finish-panel__grid">
        {CHIP_FINISHES.map((option) => {
          const descriptor = resolveChipFinishDescriptor(option)
          return (
            <button
              aria-pressed={option === finish}
              className={
                option === finish
                  ? 'chip-finish-panel__button chip-finish-panel__button--active'
                  : 'chip-finish-panel__button'
              }
              key={option}
              onClick={() => onChange(option)}
              type="button"
            >
              <span aria-hidden="true" className={`chip-finish-panel__swatch is-${option}`} />
              {descriptor.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

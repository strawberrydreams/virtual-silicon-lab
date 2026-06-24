import {
  CHIP_FINISHES,
  resolveChipFinishDescriptor,
  type ChipFinish,
} from '../../domain/material/chipFinish'
import type { Block } from '../../domain/project'

type Props = {
  block: Block
  chipFinish: ChipFinish
  onChange: (id: string, finish: ChipFinish | undefined) => void
}

export function BlockFinishPanel({ block, chipFinish, onChange }: Props) {
  const inherited = resolveChipFinishDescriptor(chipFinish)
  const activeFinish = block.finish

  return (
    <div aria-label="Selected tile material controls" className="chip-finish-panel" role="group">
      <div>
        <p className="editor-kicker">Tile material</p>
        <h2>Material Override</h2>
        <p className="studio-item-inspector__empty">Global: {inherited.label}</p>
      </div>
      <div className="chip-finish-panel__grid">
        <button
          aria-pressed={activeFinish === undefined}
          className={
            activeFinish === undefined
              ? 'chip-finish-panel__button chip-finish-panel__button--active'
              : 'chip-finish-panel__button'
          }
          onClick={() => onChange(block.id, undefined)}
          type="button"
        >
          Inherit chip finish: {inherited.label}
        </button>
        {CHIP_FINISHES.map((option) => {
          const descriptor = resolveChipFinishDescriptor(option)
          return (
            <button
              aria-pressed={option === activeFinish}
              className={
                option === activeFinish
                  ? 'chip-finish-panel__button chip-finish-panel__button--active'
                  : 'chip-finish-panel__button'
              }
              key={option}
              onClick={() => onChange(block.id, option)}
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

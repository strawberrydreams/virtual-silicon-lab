import { useState } from 'react'
import type { ChipFinish } from '../../domain/material/chipFinish'
import type { Block } from '../../domain/project'
import { BlockFinishPanel } from './BlockFinishPanel'

type Props = {
  block: Block | null
  chipFinish: ChipFinish
  onChange: (id: string, patch: Partial<Pick<Block, 'colorOverride' | 'imageDataUrl'>>) => void
  onSetBlockFinish: (id: string, finish: ChipFinish | undefined) => void
}

const fieldClass =
  'mt-1 w-full rounded border border-cyan-900 bg-[#050d12] px-2 py-1 text-sm text-cyan-100 outline-none focus:border-cyan-500'
const labelClass = 'block text-[11px] uppercase tracking-wider text-cyan-400'

export function BlockVisualPanel({ block, chipFinish, onChange, onSetBlockFinish }: Props) {
  const [imageUrl, setImageUrl] = useState(block?.imageDataUrl ?? '')
  // Reset the editable field when the selected tile (or its stored image) changes
  // from outside, derived during render rather than in an effect.
  const blockKey = `${block?.id ?? ''}:${block?.imageDataUrl ?? ''}`
  const [syncedKey, setSyncedKey] = useState(blockKey)
  if (syncedKey !== blockKey) {
    setSyncedKey(blockKey)
    setImageUrl(block?.imageDataUrl ?? '')
  }

  return (
    <section className="block-visual-panel" aria-label="Selected tile visual controls">
      <div>
        <p className="editor-kicker">Selected tile</p>
        <h2>Tile Visual</h2>
      </div>
      {block === null ? (
        <p className="studio-item-inspector__empty">
          Select a tile to add a custom image or material override.
        </p>
      ) : (
        <div className="studio-item-inspector__fields">
          <p className="studio-item-inspector__empty">{block.type}</p>
          <BlockFinishPanel block={block} chipFinish={chipFinish} onChange={onSetBlockFinish} />
          <label className={labelClass}>
            Tile image URL
            <input
              aria-label="Tile image URL"
              className={fieldClass}
              value={imageUrl}
              onChange={(event) => {
                setImageUrl(event.target.value)
                onChange(block.id, { imageDataUrl: event.target.value || undefined })
              }}
            />
          </label>
          <label className={labelClass}>
            Upload tile image
            <input
              aria-label="Upload tile image"
              className={fieldClass}
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.addEventListener('load', () => {
                  const result = typeof reader.result === 'string' ? reader.result : ''
                  setImageUrl(result)
                  onChange(block.id, { imageDataUrl: result || undefined })
                })
                reader.readAsDataURL(file)
              }}
            />
          </label>
          <button
            type="button"
            className="v2-inline-action"
            onClick={() => {
              setImageUrl('')
              onChange(block.id, { imageDataUrl: undefined })
            }}
          >
            Clear tile image
          </button>
        </div>
      )}
    </section>
  )
}

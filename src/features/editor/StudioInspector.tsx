import { useState } from 'react'
import type {
  Project,
  StudioSpray,
  StudioSprayBlend,
  StudioSticker,
  StudioStickerKind,
} from '../../domain/project'
import type { SelectedStudioItem } from '../../stores/editorStore'

const STICKER_KINDS: { kind: StudioStickerKind; label: string }[] = [
  { kind: 'badge', label: 'Badge' },
  { kind: 'mascot', label: 'Mascot' },
  { kind: 'warning', label: 'Warning' },
  { kind: 'label', label: 'Label' },
]

const SPRAY_BLENDS: { blend: StudioSprayBlend; label: string }[] = [
  { blend: 'screen', label: 'Screen' },
  { blend: 'lighten', label: 'Lighten' },
  { blend: 'overlay', label: 'Overlay' },
]

type Props = {
  project: Project
  selectedStudioItem: SelectedStudioItem | null
  onUpdateSticker: (
    id: string,
    patch: Partial<Pick<StudioSticker, 'kind' | 'text' | 'color' | 'rotation'>>,
  ) => void
  onUpdateSpray: (
    id: string,
    patch: Partial<Pick<StudioSpray, 'color' | 'intensity' | 'radius' | 'blend'>>,
  ) => void
}

const fieldClass =
  'mt-1 w-full rounded border border-cyan-900 bg-[#050d12] px-2 py-1 text-sm text-cyan-100 outline-none focus:border-cyan-500'
const labelClass = 'block text-[11px] uppercase tracking-wider text-cyan-400'

export function StudioInspector({
  project,
  selectedStudioItem,
  onUpdateSticker,
  onUpdateSpray,
}: Props) {
  const sticker =
    selectedStudioItem?.kind === 'sticker'
      ? project.studio.stickers.find((item) => item.id === selectedStudioItem.id)
      : undefined
  const spray =
    selectedStudioItem?.kind === 'spray'
      ? project.studio.sprays.find((item) => item.id === selectedStudioItem.id)
      : undefined

  return (
    <section aria-label="Studio item inspector" className="studio-item-inspector">
      <p className="editor-kicker">Selected studio item</p>
      <h2>Sticker / Spray Controls</h2>
      {sticker ? (
        <StickerFields sticker={sticker} onUpdate={(patch) => onUpdateSticker(sticker.id, patch)} />
      ) : spray ? (
        <SprayFields spray={spray} onUpdate={(patch) => onUpdateSpray(spray.id, patch)} />
      ) : (
        <p className="studio-item-inspector__empty">Select a sticker or spray on the die.</p>
      )}
    </section>
  )
}

function StickerFields({
  sticker,
  onUpdate,
}: {
  sticker: StudioSticker
  onUpdate: (patch: Partial<Pick<StudioSticker, 'kind' | 'text' | 'color' | 'rotation'>>) => void
}) {
  const [text, setText] = useState(sticker.text)
  const [rotation, setRotation] = useState(String(sticker.rotation))
  // Re-sync the editable fields when the selected sticker changes from outside
  // (selection switch or undo/redo), derived during render rather than in an effect.
  const stickerKey = `${sticker.id}:${sticker.text}:${sticker.rotation}`
  const [syncedKey, setSyncedKey] = useState(stickerKey)
  if (syncedKey !== stickerKey) {
    setSyncedKey(stickerKey)
    setText(sticker.text)
    setRotation(String(sticker.rotation))
  }

  return (
    <div className="studio-item-inspector__fields">
      <div className="studio-item-inspector__kinds" role="group" aria-label="Sticker kind">
        {STICKER_KINDS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            aria-pressed={sticker.kind === kind}
            onClick={() => onUpdate({ kind })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="studio-item-inspector__pair">
        <label className={labelClass}>
          Sticker x
          <input
            aria-label="Sticker x"
            className={fieldClass}
            type="number"
            value={sticker.x}
            readOnly
          />
        </label>
        <label className={labelClass}>
          Sticker y
          <input
            aria-label="Sticker y"
            className={fieldClass}
            type="number"
            value={sticker.y}
            readOnly
          />
        </label>
      </div>
      <label className={labelClass}>
        Sticker text
        <input
          aria-label="Sticker text"
          className={fieldClass}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            onUpdate({ text: event.target.value })
          }}
        />
      </label>
      <label className={labelClass}>
        Sticker color
        <input
          aria-label="Sticker color"
          className={fieldClass}
          type="color"
          value={sticker.color}
          onChange={(event) => onUpdate({ color: event.target.value })}
        />
      </label>
      <label className={labelClass}>
        Sticker rotation
        <input
          aria-label="Sticker rotation"
          className={fieldClass}
          type="number"
          value={rotation}
          onChange={(event) => {
            setRotation(event.target.value)
            onUpdate({ rotation: Number(event.target.value) || 0 })
          }}
        />
      </label>
    </div>
  )
}

function SprayFields({
  spray,
  onUpdate,
}: {
  spray: StudioSpray
  onUpdate: (patch: Partial<Pick<StudioSpray, 'color' | 'intensity' | 'radius' | 'blend'>>) => void
}) {
  const [radius, setRadius] = useState(String(spray.radius))
  const [intensity, setIntensity] = useState(String(spray.intensity))
  // Re-sync the editable fields when the selected spray changes from outside
  // (selection switch or undo/redo), derived during render rather than in an effect.
  const sprayKey = `${spray.id}:${spray.radius}:${spray.intensity}`
  const [syncedKey, setSyncedKey] = useState(sprayKey)
  if (syncedKey !== sprayKey) {
    setSyncedKey(sprayKey)
    setRadius(String(spray.radius))
    setIntensity(String(spray.intensity))
  }

  return (
    <div className="studio-item-inspector__fields">
      <div className="studio-item-inspector__pair">
        <label className={labelClass}>
          Spray x
          <input
            aria-label="Spray x"
            className={fieldClass}
            type="number"
            value={spray.x}
            readOnly
          />
        </label>
        <label className={labelClass}>
          Spray y
          <input
            aria-label="Spray y"
            className={fieldClass}
            type="number"
            value={spray.y}
            readOnly
          />
        </label>
      </div>
      <label className={labelClass}>
        Spray color
        <input
          aria-label="Spray color"
          className={fieldClass}
          type="color"
          value={spray.color}
          onChange={(event) => onUpdate({ color: event.target.value })}
        />
      </label>
      <label className={labelClass}>
        Spray radius
        <input
          aria-label="Spray radius"
          className={fieldClass}
          type="number"
          min={24}
          value={radius}
          onChange={(event) => {
            setRadius(event.target.value)
            onUpdate({ radius: Number(event.target.value) || 24 })
          }}
        />
      </label>
      <label className={labelClass}>
        Spray intensity
        <input
          aria-label="Spray intensity"
          className={fieldClass}
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={intensity}
          onChange={(event) => {
            setIntensity(event.target.value)
            onUpdate({ intensity: Number(event.target.value) || 0 })
          }}
        />
      </label>
      <div>
        <span className={labelClass}>Spray blend</span>
        <div className="studio-item-inspector__kinds mt-1" role="group" aria-label="Spray blend">
          {SPRAY_BLENDS.map(({ blend, label }) => (
            <button
              key={blend}
              type="button"
              aria-pressed={spray.blend === blend}
              onClick={() => onUpdate({ blend })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

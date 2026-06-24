import type { PresetId, PresetMetadata } from '../../presets/presetCatalog'
import { MiniChipPreview } from './MiniChipPreview'
import { chipThemeLabel } from '../../visual/themeFinish'

type Props = {
  preset: PresetMetadata
  onRemix: (id: PresetId) => void
}

export function PresetCard({ preset, onRemix }: Props) {
  return (
    <article className="v2-preset-card">
      <div className="v2-preset-card__top">
        <div>
          <p className="v2-meta">{chipThemeLabel(preset.theme)}</p>
          <h3>{preset.name}</h3>
          <p>{preset.tagline}</p>
        </div>
        {preset.featured && <span>Featured</span>}
      </div>
      <div style={{ filter: `drop-shadow(0 0 18px ${preset.accent}55)` }}>
        <MiniChipPreview shape={preset.dieShape} blocks={preset.previewBlocks} />
      </div>
      <p className="v2-meta">
        {preset.dieShape} / {chipThemeLabel(preset.theme)}
      </p>
      <button
        className="v2-inline-action"
        onClick={() => onRemix(preset.id)}
        style={{ borderColor: preset.accent, color: preset.accent }}
      >
        Remix {preset.name}
      </button>
    </article>
  )
}

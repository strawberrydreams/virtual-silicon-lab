import type { PresetId, PresetMetadata } from '../../presets/presetCatalog'

type Props = {
  preset: PresetMetadata
  onRemix: (id: PresetId) => void
}

const SHAPE_CLASSES: Record<PresetMetadata['dieShape'], string> = {
  rect: 'aspect-[3/2]',
  square: 'aspect-square',
  circle: 'aspect-square rounded-full',
  hexagon: 'aspect-square [clip-path:polygon(50%_0%,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]',
}

export function PresetCard({ preset, onRemix }: Props) {
  return (
    <article className="v2-preset-card">
      <div className="v2-preset-card__top">
        <div>
          <p className="v2-meta">{preset.theme}</p>
          <h3>{preset.name}</h3>
          <p>{preset.tagline}</p>
        </div>
        {preset.featured && <span>Hero</span>}
      </div>
      <div className="v2-preset-card__chip-frame" style={{ boxShadow: `0 0 24px ${preset.accent}55` }}>
        <div className={`v2-mini-chip ${SHAPE_CLASSES[preset.dieShape]}`}>
          {preset.previewBlocks.slice(0, 4).map((block) => (
            <span className="v2-mini-chip__tile" key={block}>
              {block}
            </span>
          ))}
        </div>
      </div>
      <p className="v2-meta">
        {preset.dieShape} / {preset.theme}
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

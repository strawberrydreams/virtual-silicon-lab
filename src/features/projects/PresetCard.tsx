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
    <article className="border border-slate-700 bg-slate-950/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">{preset.theme}</p>
          <h3 className="mt-2 text-sm font-semibold tracking-[0.18em] text-slate-100">{preset.name}</h3>
          <p className="mt-2 text-xs text-slate-400">{preset.tagline}</p>
        </div>
        {preset.featured && <span className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Hero</span>}
      </div>
      <div className="mx-auto mt-5 w-32 bg-slate-900 p-3" style={{ boxShadow: `0 0 24px ${preset.accent}55` }}>
        <div className={`grid grid-cols-2 gap-1 border border-slate-600 bg-slate-950/90 p-2 ${SHAPE_CLASSES[preset.dieShape]}`}>
          {preset.previewBlocks.slice(0, 4).map((block) => (
            <span className="truncate border border-slate-700 px-1 py-2 text-[8px] text-slate-300" key={block}>
              {block}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-slate-500">
        {preset.dieShape} / {preset.theme}
      </p>
      <button
        className="mt-4 border px-3 py-2 text-xs uppercase tracking-[0.2em]"
        onClick={() => onRemix(preset.id)}
        style={{ borderColor: preset.accent, color: preset.accent }}
      >
        Remix {preset.name}
      </button>
    </article>
  )
}

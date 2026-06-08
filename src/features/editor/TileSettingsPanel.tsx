import type { StudioContactStyle, StudioTileSettings } from '../../domain/project'

type Props = {
  tileSettings: StudioTileSettings
  onChange: (patch: Partial<StudioTileSettings>) => void
}

const CONTACT_STYLES: StudioContactStyle[] = ['minimal', 'balanced', 'dense']
const labelClass = 'block text-[11px] uppercase tracking-wider text-cyan-400'

function styleLabel(style: StudioContactStyle) {
  return style.charAt(0).toUpperCase() + style.slice(1)
}

export function TileSettingsPanel({ tileSettings, onChange }: Props) {
  return (
    <section className="tile-settings-panel" aria-label="Semi-auto tile detail">
      <div>
        <p className="editor-kicker">Semi-auto</p>
        <h2>Tile Detail</h2>
      </div>
      <div className="tile-settings-panel__fields">
        <label className={labelClass}>
          Detail density
          <input
            aria-label="Detail density"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tileSettings.detailDensity}
            onChange={(event) => onChange({ detailDensity: Number(event.target.value) })}
          />
        </label>
        <label className={labelClass}>
          Route intensity
          <input
            aria-label="Route intensity"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tileSettings.routeIntensity}
            onChange={(event) => onChange({ routeIntensity: Number(event.target.value) })}
          />
        </label>
        <div className="tile-settings-panel__contacts" role="group" aria-label="Contact style">
          {CONTACT_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              aria-pressed={tileSettings.contactStyle === style}
              onClick={() => onChange({ contactStyle: style })}
            >
              {styleLabel(style)}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

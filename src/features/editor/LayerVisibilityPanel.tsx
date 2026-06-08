import type { ChipLayerId, ChipLayerVisibility } from './layerVisibility'
import { CHIP_LAYER_IDS } from './layerVisibility'

type Props = {
  visibility: ChipLayerVisibility
  onToggle: (layer: ChipLayerId) => void
}

export function LayerVisibilityPanel({ visibility, onToggle }: Props) {
  return (
    <section aria-label="Layer visibility controls" className="editor-inspector-card layer-visibility-panel">
      <div>
        <p className="editor-kicker">Layer visibility</p>
        <h2>Layer Visibility</h2>
      </div>
      <div className="layer-visibility-panel__select">All Layers</div>
      <div className="layer-visibility-panel__buttons" role="group" aria-label="Visible layer toggles">
        {CHIP_LAYER_IDS.map((layer) => (
          <button aria-pressed={visibility[layer]} key={layer} type="button" onClick={() => onToggle(layer)}>
            {layer}
          </button>
        ))}
      </div>
    </section>
  )
}

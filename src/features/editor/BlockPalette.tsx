import type { BlockType, StudioStickerKind } from '../../domain/project'

const BLOCK_GROUPS: { label: string; blocks: BlockType[] }[] = [
  {
    label: 'Physical Tiles',
    blocks: ['CPU', 'GPU', 'DSP', 'SRAM', 'Cache', 'DAC', 'ADC', 'PLL', 'IO', 'USB'],
  },
  {
    label: 'Impossible Tiles',
    blocks: [
      'EmotionEngine',
      'DreamSynth',
      'QuantumMemory',
      'ConsciousnessProcessor',
      'RealityDistortionUnit',
      'TimeCore',
    ],
  },
]

const STICKER_KINDS: { kind: StudioStickerKind; label: string }[] = [
  { kind: 'badge', label: 'Round badge' },
  { kind: 'mascot', label: 'Mascot mark' },
  { kind: 'warning', label: 'Warning label' },
  { kind: 'label', label: 'Text label' },
]

const SPRAY_COLORS: { color: string; label: string }[] = [
  { color: '#ff70dc', label: 'Pink' },
  { color: '#70eeff', label: 'Cyan' },
  { color: '#ffd84d', label: 'Gold' },
  { color: '#9b7bff', label: 'Violet' },
]

type Props = {
  addBlock: (type: BlockType) => void
  addSticker: (kind: StudioStickerKind) => void
  addSpray: (color: string) => void
}

export function BlockPalette({ addBlock, addSticker, addSpray }: Props) {
  return (
    <aside aria-label="Creation rail" className="editor-side-rail editor-creation-rail">
      <div className="editor-rail-heading">
        <p className="editor-kicker">Studio kit</p>
        <h2>Tiles / Stickers / Spray</h2>
      </div>
      <section className="editor-studio-tools" aria-label="Studio decoration tools">
        <h3 className="editor-section-label">Decorate</h3>
        <div className="mt-2 grid gap-2">
          {STICKER_KINDS.map(({ kind, label }) => (
            <button
              className="editor-block-button"
              key={kind}
              type="button"
              onClick={() => addSticker(kind)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="editor-spray-swatches mt-2" role="group" aria-label="Spray colors">
          {SPRAY_COLORS.map(({ color, label }) => (
            <button
              key={color}
              type="button"
              aria-label={`Spray ${label}`}
              title={`Spray ${label}`}
              style={{ background: color }}
              onClick={() => addSpray(color)}
            />
          ))}
        </div>
      </section>
      <div className="mt-5 grid gap-5">
        {BLOCK_GROUPS.map((group) => (
          <section key={group.label}>
            <h3 className="editor-section-label">{group.label}</h3>
            <div className="mt-2 grid gap-2">
              {group.blocks.map((type) => (
                <button
                  className="editor-block-button"
                  key={type}
                  onClick={() => addBlock(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}

import type { BlockType } from '../../domain/project'

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

type Props = {
  addBlock: (type: BlockType) => void
  addSticker: () => void
  addSpray: () => void
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
          <button className="editor-block-button" type="button" onClick={addSticker}>
            Sticker badge
          </button>
          <button className="editor-block-button" type="button" onClick={addSpray}>
            Spray glow
          </button>
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

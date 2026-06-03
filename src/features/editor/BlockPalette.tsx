import type { BlockType } from '../../domain/project'

const BLOCK_GROUPS: { label: string; blocks: BlockType[] }[] = [
  {
    label: 'Real',
    blocks: ['CPU', 'GPU', 'DSP', 'SRAM', 'Cache', 'DAC', 'ADC', 'PLL', 'IO', 'USB'],
  },
  {
    label: 'Fantasy',
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

export function BlockPalette({ addBlock }: { addBlock: (type: BlockType) => void }) {
  return (
    <aside aria-label="Creation rail" className="editor-side-rail editor-creation-rail">
      <div className="editor-rail-heading">
        <p className="editor-kicker">Create</p>
        <h2>Block Library</h2>
      </div>
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

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
    <aside className="w-60 overflow-y-auto border-r border-cyan-900 bg-[#071015] p-4">
      <h2 className="text-xs tracking-[0.3em] text-cyan-300">BLOCK LIBRARY</h2>
      <div className="mt-4 grid gap-5">
        {BLOCK_GROUPS.map((group) => (
          <section key={group.label}>
            <h3 className="text-[10px] uppercase tracking-[0.28em] text-slate-500">{group.label}</h3>
            <div className="mt-2 grid gap-2">
              {group.blocks.map((type) => (
                <button
                  className="min-h-9 border border-cyan-950 bg-cyan-950/30 px-3 py-2 text-left text-[11px] leading-tight hover:border-cyan-400"
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

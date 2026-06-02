import type { BlockType } from '../../domain/project'

const BLOCK_TYPES: BlockType[] = ['CPU', 'GPU', 'SRAM', 'DreamSynth', 'QuantumMemory', 'TimeCore']

export function BlockPalette({ addBlock }: { addBlock: (type: BlockType) => void }) {
  return (
    <aside className="w-56 border-r border-cyan-900 bg-[#071015] p-4">
      <h2 className="text-xs tracking-[0.3em] text-cyan-300">BLOCK LIBRARY</h2>
      <div className="mt-4 grid gap-2">
        {BLOCK_TYPES.map((type) => (
          <button
            className="border border-cyan-950 bg-cyan-950/30 px-3 py-2 text-left text-xs"
            key={type}
            onClick={() => addBlock(type)}
          >
            {type}
          </button>
        ))}
      </div>
    </aside>
  )
}

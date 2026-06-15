import type { Block, BlockType } from '../../../domain/project'

// Pure Manhattan bus routing: a bundle of N parallel L-shaped wires from one block
// center to another, with a via dot at each wire's elbow. Shared by editor + export.
export type Point = { x: number; y: number }

export type BusBundle = {
  wires: number[][] // each wire is a polyline [x0,y0, x1,y1, x2,y2]
  vias: Point[] // elbow via per wire
}

export function busBundle(
  from: Point,
  to: Point,
  opts: { wires?: number; spacing?: number } = {},
): BusBundle {
  const count = Math.max(1, Math.round(opts.wires ?? 3))
  const spacing = opts.spacing ?? 3
  const wires: number[][] = []
  const vias: Point[] = []
  for (let index = 0; index < count; index += 1) {
    // Center the bundle so the middle wire is unshifted.
    const offset = (index - (count - 1) / 2) * spacing
    const runY = from.y + offset // horizontal run height
    const elbowX = to.x + offset // vertical run column / elbow
    // L-route: from → elbow (horizontal then vertical) → to.
    wires.push([from.x, runY, elbowX, runY, elbowX, to.y])
    vias.push({ x: elbowX, y: runY })
  }
  return { wires, vias }
}

export type BusPair = { from: Point; to: Point; kind: 'memory' | 'io' }

type RoutableBlock = Pick<Block, 'type' | 'x' | 'y' | 'w' | 'h'>

const COMPUTE_TYPES = new Set<BlockType>(['CPU', 'GPU', 'DSP', 'ConsciousnessProcessor'])
const MEMORY_TYPES = new Set<BlockType>(['SRAM', 'Cache', 'QuantumMemory'])
const IO_TYPES = new Set<BlockType>(['IO', 'USB', 'DAC', 'ADC', 'PLL'])

function blockCenter(block: RoutableBlock): Point {
  return { x: block.x + block.w / 2, y: block.y + block.h / 2 }
}

function nearest(from: Point, candidates: Point[]): Point {
  return candidates.reduce((best, point) =>
    Math.hypot(point.x - from.x, point.y - from.y) < Math.hypot(best.x - from.x, best.y - from.y)
      ? point
      : best,
  )
}

// Pick the orthogonal bus routes that connect each memory/io tile to its nearest
// compute tile, so the die shows a readable interconnect mesh (not one star). Pure
// and deterministic; the layer renders L-bundles + vias from these pairs.
// Chips without a compute tile anchor the mesh at their largest block instead,
// so memory/io-only designs (e.g. the M-7 and monolith presets) keep their wiring.
export function routedBusPairs(blocks: RoutableBlock[]): BusPair[] {
  if (blocks.length === 0) return []
  const computeBlocks = blocks.filter((block) => COMPUTE_TYPES.has(block.type))
  const anchorBlocks =
    computeBlocks.length > 0
      ? computeBlocks
      : [blocks.reduce((best, block) => (block.w * block.h > best.w * best.h ? block : best))]
  const anchorCenters = anchorBlocks.map(blockCenter)
  const anchorSet = new Set(anchorBlocks)
  const pairs: BusPair[] = []
  for (const block of blocks) {
    if (anchorSet.has(block)) continue
    if (MEMORY_TYPES.has(block.type)) {
      const to = blockCenter(block)
      pairs.push({ from: nearest(to, anchorCenters), to, kind: 'memory' })
    } else if (IO_TYPES.has(block.type)) {
      const to = blockCenter(block)
      pairs.push({ from: nearest(to, anchorCenters), to, kind: 'io' })
    }
  }
  return pairs
}

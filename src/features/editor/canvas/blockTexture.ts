import type { BlockType } from '../../../domain/project'

const MEMORY_TYPES = new Set<BlockType>(['QuantumMemory', 'SRAM', 'Cache'])

export function blockVisual(type: BlockType): 'memory' | 'standard' {
  return MEMORY_TYPES.has(type) ? 'memory' : 'standard'
}

export type Cell = { x: number; y: number; w: number; h: number }
export type MicroLine = { points: number[]; opacity: number }
export type TextureFamily =
  | 'compute'
  | 'parallel'
  | 'signal'
  | 'memory'
  | 'analog'
  | 'clock'
  | 'io'
  | 'expressive'
  | 'synthesis'
  | 'awareness'
  | 'distortion'
  | 'temporal'

export type BlockTexture = {
  family: TextureFamily
}

const TEXTURES: Record<BlockType, BlockTexture> = {
  CPU: { family: 'compute' },
  GPU: { family: 'parallel' },
  DSP: { family: 'signal' },
  SRAM: { family: 'memory' },
  Cache: { family: 'memory' },
  DAC: { family: 'analog' },
  ADC: { family: 'analog' },
  PLL: { family: 'clock' },
  IO: { family: 'io' },
  USB: { family: 'io' },
  EmotionEngine: { family: 'expressive' },
  DreamSynth: { family: 'synthesis' },
  QuantumMemory: { family: 'memory' },
  ConsciousnessProcessor: { family: 'awareness' },
  RealityDistortionUnit: { family: 'distortion' },
  TimeCore: { family: 'temporal' },
}

export function blockTexture(type: BlockType): BlockTexture {
  return TEXTURES[type]
}

export function memoryCells(width: number, height: number, cell = 10, gap = 4): Cell[] {
  const cells: Cell[] = []
  const step = cell + gap
  for (let y = gap; y + cell <= height; y += step) {
    for (let x = gap; x + cell <= width; x += step) {
      cells.push({ x, y, w: cell, h: cell })
    }
  }
  return cells
}

export function blockMicroLines(width: number, height: number, stride = 18): MicroLine[] {
  const lines: MicroLine[] = []
  for (let x = stride; x < width - stride / 2; x += stride) {
    lines.push({ points: [x, 6, x, Math.max(6, height - 6)], opacity: 0.12 })
  }
  for (let y = stride; y < height - stride / 2; y += stride) {
    lines.push({ points: [6, y, Math.max(6, width - 6), y], opacity: 0.08 })
  }
  return lines
}

// Logic standard-cell rows: short cells packed into horizontal bands, the way a
// placed-and-routed logic region (CPU/GPU) reads on a real die shot.
export function standardCellRows(
  width: number,
  height: number,
  opts: { rowH?: number; rowGap?: number; cellW?: number; cellGap?: number; inset?: number } = {},
): Cell[] {
  const rowH = opts.rowH ?? 7
  const rowGap = opts.rowGap ?? 4
  const cellW = opts.cellW ?? 6
  const cellGap = opts.cellGap ?? 3
  const inset = opts.inset ?? 4
  const cells: Cell[] = []
  for (let y = inset; y + rowH <= height - inset; y += rowH + rowGap) {
    for (let x = inset; x + cellW <= width - inset; x += cellW + cellGap) {
      cells.push({ x, y, w: cellW, h: rowH })
    }
  }
  return cells
}

// Parallel routing channels along one axis — the dense metal-layer look behind
// signal/parallel regions and inside bus corridors.
export function routingChannels(
  width: number,
  height: number,
  opts: { stride?: number; axis?: 'h' | 'v'; inset?: number; opacity?: number } = {},
): MicroLine[] {
  const stride = opts.stride ?? 6
  const axis = opts.axis ?? 'h'
  const inset = opts.inset ?? 6
  const opacity = opts.opacity ?? 0.4
  const lines: MicroLine[] = []
  if (axis === 'h') {
    for (let y = inset; y <= height - inset; y += stride) {
      lines.push({ points: [inset, y, Math.max(inset, width - inset), y], opacity })
    }
  } else {
    for (let x = inset; x <= width - inset; x += stride) {
      lines.push({ points: [x, inset, x, Math.max(inset, height - inset)], opacity })
    }
  }
  return lines
}

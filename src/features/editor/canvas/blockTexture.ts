import type { BlockType } from '../../../domain/project'

const MEMORY_TYPES = new Set<BlockType>(['QuantumMemory', 'SRAM', 'Cache'])

export function blockVisual(type: BlockType): 'memory' | 'standard' {
  return MEMORY_TYPES.has(type) ? 'memory' : 'standard'
}

export type Cell = { x: number; y: number; w: number; h: number }
export type MicroLine = { points: number[]; opacity: number }

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

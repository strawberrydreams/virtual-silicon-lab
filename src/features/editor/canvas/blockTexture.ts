import type { BlockType } from '../../../domain/project'

const MEMORY_TYPES = new Set<BlockType>(['QuantumMemory', 'SRAM', 'Cache'])

export function blockVisual(type: BlockType): 'memory' | 'standard' {
  return MEMORY_TYPES.has(type) ? 'memory' : 'standard'
}

export type Cell = { x: number; y: number; w: number; h: number }

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

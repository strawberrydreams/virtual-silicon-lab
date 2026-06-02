import { describe, expect, it } from 'vitest'
import { blockVisual, memoryCells } from './blockTexture'

describe('blockVisual', () => {
  it('marks memory-family blocks as memory texture', () => {
    expect(blockVisual('QuantumMemory')).toBe('memory')
    expect(blockVisual('SRAM')).toBe('memory')
    expect(blockVisual('Cache')).toBe('memory')
  })

  it('treats other blocks as standard', () => {
    expect(blockVisual('CPU')).toBe('standard')
    expect(blockVisual('ConsciousnessProcessor')).toBe('standard')
  })
})

describe('memoryCells', () => {
  it('tiles a regular grid of cells inside the block bounds', () => {
    const cells = memoryCells(40, 24, 10, 4)
    expect(cells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      expect(cell.x + cell.w).toBeLessThanOrEqual(40)
      expect(cell.y + cell.h).toBeLessThanOrEqual(24)
      expect(cell.w).toBe(10)
      expect(cell.h).toBe(10)
    }
  })

  it('returns no cells when the block is smaller than one cell', () => {
    expect(memoryCells(6, 6, 10, 4)).toEqual([])
  })
})

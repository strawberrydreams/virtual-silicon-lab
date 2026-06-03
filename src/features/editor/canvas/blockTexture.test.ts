import { describe, expect, it } from 'vitest'
import { blockMicroLines, blockVisual, memoryCells } from './blockTexture'

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

describe('blockMicroLines', () => {
  it('creates bounded micro routing lines for block surfaces', () => {
    const lines = blockMicroLines(80, 48, 20)
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      for (let index = 0; index < line.points.length; index += 2) {
        expect(line.points[index]).toBeGreaterThanOrEqual(0)
        expect(line.points[index]).toBeLessThanOrEqual(80)
        expect(line.points[index + 1]).toBeGreaterThanOrEqual(0)
        expect(line.points[index + 1]).toBeLessThanOrEqual(48)
      }
    }
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

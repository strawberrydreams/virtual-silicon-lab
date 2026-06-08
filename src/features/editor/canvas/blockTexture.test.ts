import { describe, expect, it } from 'vitest'
import {
  blockMicroLines,
  blockTexture,
  blockVisual,
  memoryCells,
  routingChannels,
  standardCellRows,
} from './blockTexture'

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

describe('blockTexture', () => {
  it('returns distinct render recipes for representative block families', () => {
    expect(blockTexture('CPU')).toEqual({ family: 'compute' })
    expect(blockTexture('GPU')).toEqual({ family: 'parallel' })
    expect(blockTexture('PLL')).toEqual({ family: 'clock' })
    expect(blockTexture('EmotionEngine')).toEqual({ family: 'expressive' })
    expect(blockTexture('TimeCore')).toEqual({ family: 'temporal' })
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

describe('standardCellRows', () => {
  it('packs logic cells in rows inside the block bounds', () => {
    const cells = standardCellRows(112, 72)
    expect(cells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeGreaterThanOrEqual(0)
      expect(cell.x + cell.w).toBeLessThanOrEqual(112)
      expect(cell.y + cell.h).toBeLessThanOrEqual(72)
    }
  })

  it('packs more cells as cell size shrinks', () => {
    const coarse = standardCellRows(112, 72, { cellW: 12, cellGap: 6 })
    const fine = standardCellRows(112, 72, { cellW: 4, cellGap: 2 })
    expect(fine.length).toBeGreaterThan(coarse.length)
  })

  it('returns no cells for a block smaller than the inset', () => {
    expect(standardCellRows(6, 6)).toEqual([])
  })
})

describe('routingChannels', () => {
  it('creates horizontal channels spanning the block within bounds', () => {
    const lines = routingChannels(80, 48, { stride: 6, axis: 'h' })
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

  it('packs more channels as stride shrinks', () => {
    const sparse = routingChannels(80, 48, { stride: 12 })
    const dense = routingChannels(80, 48, { stride: 4 })
    expect(dense.length).toBeGreaterThan(sparse.length)
  })
})

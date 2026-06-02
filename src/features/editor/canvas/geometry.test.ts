import { describe, expect, it } from 'vitest'
import { clampBlockToRect, snapToGrid } from './geometry'

describe('snapToGrid', () => {
  it('rounds coordinates to the nearest grid interval', () => {
    expect(snapToGrid(33, 16)).toBe(32)
    expect(snapToGrid(42, 16)).toBe(48)
  })
})

describe('clampBlockToRect', () => {
  it('keeps a block inside the die bounds', () => {
    expect(
      clampBlockToRect(
        { x: 940, y: -10, w: 120, h: 80 },
        { width: 960, height: 640 },
      ),
    ).toEqual({ x: 840, y: 0, w: 120, h: 80 })
  })
})

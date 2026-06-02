import { describe, expect, it } from 'vitest'
import { zoomAtPointer } from './viewport'

describe('zoomAtPointer', () => {
  it('zooms in toward the pointer and keeps that point stationary', () => {
    const result = zoomAtPointer({
      pointer: { x: 100, y: 100 },
      stagePos: { x: 0, y: 0 },
      oldScale: 1,
      deltaY: -100,
      scaleBy: 1.1,
    })

    expect(result.scale).toBeCloseTo(1.1, 5)
    // The world point under the pointer must map back to the same screen point.
    const worldX = (100 - result.pos.x) / result.scale
    expect(worldX).toBeCloseTo(100, 5)
  })

  it('clamps scale to the configured range', () => {
    const result = zoomAtPointer({
      pointer: { x: 0, y: 0 },
      stagePos: { x: 0, y: 0 },
      oldScale: 4,
      deltaY: -100,
      scaleBy: 1.1,
      min: 0.25,
      max: 4,
    })

    expect(result.scale).toBe(4)
  })
})

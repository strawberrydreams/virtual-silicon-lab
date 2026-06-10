import { describe, expect, it } from 'vitest'
import { stepZoom, zoomAtPointer } from './viewport'

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

describe('stepZoom', () => {
  it('steps the scale by the delta', () => {
    expect(stepZoom(1, 0.1)).toBeCloseTo(1.1, 5)
    expect(stepZoom(1, -0.1)).toBeCloseTo(0.9, 5)
  })

  it('shares the wheel-zoom limits so buttons never reverse a wheel zoom', () => {
    // After wheel-zooming to 4x, zoom-in must hold at 4x (not snap down).
    expect(stepZoom(4, 0.1)).toBe(4)
    // After wheel-zooming to 0.25x, zoom-out must hold at 0.25x (not snap up).
    expect(stepZoom(0.25, -0.1)).toBe(0.25)
  })
})

import { describe, expect, it } from 'vitest'
import type { Point } from './dieOutline'
import { clampBlockToPolygon, pointInPolygon } from './polygonClamp'

const square: Point[] = [
  { x: 0, y: 0 },
  { x: 600, y: 0 },
  { x: 600, y: 600 },
  { x: 0, y: 600 },
]

const lShape: Point[] = [
  { x: 0, y: 0 },
  { x: 600, y: 0 },
  { x: 600, y: 300 },
  { x: 300, y: 300 },
  { x: 300, y: 600 },
  { x: 0, y: 600 },
]

const corners = (block: { x: number; y: number; w: number; h: number; rotation?: number }) => {
  const radians = ((block.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [
    { x: 0, y: 0 },
    { x: block.w, y: 0 },
    { x: block.w, y: block.h },
    { x: 0, y: block.h },
  ].map((corner) => ({
    x: block.x + corner.x * cos - corner.y * sin,
    y: block.y + corner.x * sin + corner.y * cos,
  }))
}

describe('pointInPolygon', () => {
  it('returns true for a point inside a square', () => {
    expect(pointInPolygon({ x: 300, y: 300 }, square)).toBe(true)
  })

  it('returns false for a point outside a square', () => {
    expect(pointInPolygon({ x: 700, y: 300 }, square)).toBe(false)
  })

  it('returns false for a point inside the notch of an L-shape', () => {
    expect(pointInPolygon({ x: 450, y: 450 }, lShape)).toBe(false)
    expect(pointInPolygon({ x: 150, y: 450 }, lShape)).toBe(true)
  })

  it('treats polygon edges and vertices as inside', () => {
    expect(pointInPolygon({ x: 600, y: 300 }, square)).toBe(true)
    expect(pointInPolygon({ x: 600, y: 600 }, square)).toBe(true)
  })
})

describe('clampBlockToPolygon — translate', () => {
  it('leaves a block that already fits unchanged', () => {
    const result = clampBlockToPolygon({ x: 270, y: 270, w: 60, h: 60 }, square, { x: 300, y: 300 })
    expect(result).toEqual({ x: 270, y: 270, w: 60, h: 60 })
  })

  it('pulls a partially-outside block back inside the square', () => {
    const result = clampBlockToPolygon({ x: 560, y: 280, w: 80, h: 80 }, square, { x: 300, y: 300 })
    expect(corners(result).every((corner) => pointInPolygon(corner, square))).toBe(true)
  })

  it('contains every rotated corner after translating the block', () => {
    const rotation = 45
    const result = clampBlockToPolygon({ x: 570, y: 300, w: 100, h: 60, rotation }, square, {
      x: 300,
      y: 300,
    })
    expect(corners({ ...result, rotation }).every((corner) => pointInPolygon(corner, square))).toBe(
      true,
    )
  })
})

describe('clampBlockToPolygon — shrink and concave outlines', () => {
  it('shrinks and centers a block larger than the polygon', () => {
    const result = clampBlockToPolygon({ x: 0, y: 0, w: 1000, h: 1000 }, square, { x: 300, y: 300 })
    expect(result.w).toBeLessThan(1000)
    expect(corners(result).every((corner) => pointInPolygon(corner, square))).toBe(true)
  })

  it('keeps a block out of an L-shape notch', () => {
    const result = clampBlockToPolygon({ x: 420, y: 420, w: 80, h: 80 }, lShape, { x: 200, y: 200 })
    expect(corners(result).every((corner) => pointInPolygon(corner, lShape))).toBe(true)
  })
})

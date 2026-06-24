import { describe, expect, it } from 'vitest'
import type { Die, DieShape } from '../project'
import { outlineToPolygon, resolveDieOutline } from './dieOutline'

const die = (overrides: Partial<Die>): Die => ({
  shape: 'rect',
  width: 960,
  height: 640,
  background: 'grid-cyan',
  ...overrides,
})

describe('resolveDieOutline', () => {
  it('resolves a rectangle to four ordered line segments', () => {
    const outline = resolveDieOutline(die({ shape: 'rect' }))
    expect(outline.centroid).toEqual({ x: 480, y: 320 })
    expect(outline.segments).toEqual([
      { kind: 'line', from: { x: 0, y: 0 }, to: { x: 960, y: 0 } },
      { kind: 'line', from: { x: 960, y: 0 }, to: { x: 960, y: 640 } },
      { kind: 'line', from: { x: 960, y: 640 }, to: { x: 0, y: 640 } },
      { kind: 'line', from: { x: 0, y: 640 }, to: { x: 0, y: 0 } },
    ])
  })

  it('resolves a square through the rectangular outline', () => {
    const outline = resolveDieOutline(die({ shape: 'square', width: 600, height: 600 }))
    expect(outline.segments).toHaveLength(4)
    expect(outline.centroid).toEqual({ x: 300, y: 300 })
  })

  it('resolves a circle to one full arc', () => {
    const outline = resolveDieOutline(die({ shape: 'circle', width: 600, height: 600 }))
    expect(outline.segments).toEqual([
      {
        kind: 'arc',
        center: { x: 300, y: 300 },
        radius: 300,
        startAngle: 0,
        endAngle: Math.PI * 2,
        counterclockwise: false,
      },
    ])
  })

  it('resolves a hexagon to six line segments', () => {
    const outline = resolveDieOutline(die({ shape: 'hexagon', width: 600, height: 600 }))
    expect(outline.segments).toHaveLength(6)
    expect(outline.centroid).toEqual({ x: 300, y: 300 })
  })

  it.each([
    ['octagon', 8],
    ['chamfered-rect', 8],
    ['keyed', 5],
    ['l-shape', 6],
    ['plus', 12],
  ] satisfies [DieShape, number][])('resolves %s to %i ordered lines', (shape, count) => {
    const outline = resolveDieOutline(die({ shape, width: 600, height: 600 }))
    expect(outline.segments).toHaveLength(count)
    expect(outline.segments.every((segment) => segment.kind === 'line')).toBe(true)
  })

  it('resolves a rounded rectangle to alternating lines and quarter arcs', () => {
    const outline = resolveDieOutline(die({ shape: 'rounded-rect' }))
    expect(outline.segments.map((segment) => segment.kind)).toEqual([
      'line',
      'arc',
      'line',
      'arc',
      'line',
      'arc',
      'line',
      'arc',
    ])
  })

  it.each([
    'octagon',
    'rounded-rect',
    'chamfered-rect',
    'keyed',
    'l-shape',
    'plus',
  ] satisfies DieShape[])('keeps the %s polygon finite and inside die bounds', (shape) => {
    const width = shape === 'plus' || shape === 'octagon' ? 600 : 960
    const height = 600
    const polygon = outlineToPolygon(resolveDieOutline(die({ shape, width, height })))
    expect(polygon.length).toBeGreaterThanOrEqual(5)
    expect(
      polygon.every(
        (point) =>
          Number.isFinite(point.x) &&
          Number.isFinite(point.y) &&
          point.x >= 0 &&
          point.x <= width &&
          point.y >= 0 &&
          point.y <= height,
      ),
    ).toBe(true)
  })
})

describe('outlineToPolygon', () => {
  it('returns the four rectangle vertices in order', () => {
    const polygon = outlineToPolygon(resolveDieOutline(die({ shape: 'rect' })))
    expect(polygon).toEqual([
      { x: 0, y: 0 },
      { x: 960, y: 0 },
      { x: 960, y: 640 },
      { x: 0, y: 640 },
    ])
  })

  it('returns six vertices for a hexagon', () => {
    const polygon = outlineToPolygon(
      resolveDieOutline(die({ shape: 'hexagon', width: 600, height: 600 })),
    )
    expect(polygon).toHaveLength(6)
  })

  it('samples a circle into points that all sit on the radius', () => {
    const polygon = outlineToPolygon(
      resolveDieOutline(die({ shape: 'circle', width: 600, height: 600 })),
      32,
    )
    expect(polygon).toHaveLength(32)
    for (const point of polygon) {
      expect(Math.hypot(point.x - 300, point.y - 300)).toBeCloseTo(300, 6)
    }
  })

  it('flattens a rounded rectangle without duplicate junction or closing points', () => {
    const polygon = outlineToPolygon(resolveDieOutline(die({ shape: 'rounded-rect' })), 32)
    expect(polygon[0]).not.toEqual(polygon[polygon.length - 1])
    for (let index = 1; index < polygon.length; index += 1) {
      expect(polygon[index]).not.toEqual(polygon[index - 1])
    }
  })
})

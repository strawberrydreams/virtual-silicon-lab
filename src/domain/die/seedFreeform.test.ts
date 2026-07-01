import { describe, expect, it } from 'vitest'
import type { Die } from '../project'
import { seedFreeformFromDie } from './seedFreeform'

const die = (overrides: Partial<Die>): Die => ({
  shape: 'rect',
  width: 100,
  height: 200,
  background: 'grid-cyan',
  ...overrides,
})

describe('seedFreeformFromDie', () => {
  it('converts a rectangle into its four normalized corners', () => {
    expect(seedFreeformFromDie(die({ shape: 'rect' }))).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ])
  })

  it('converts a concave plus into more than four normalized vertices within [0,1]', () => {
    const vertices = seedFreeformFromDie(die({ shape: 'plus' }))
    expect(vertices.length).toBeGreaterThan(4)
    for (const vertex of vertices) {
      expect(vertex.x).toBeGreaterThanOrEqual(0)
      expect(vertex.x).toBeLessThanOrEqual(1)
      expect(vertex.y).toBeGreaterThanOrEqual(0)
      expect(vertex.y).toBeLessThanOrEqual(1)
    }
  })

  it('flattens an arc-based circle into many normalized vertices', () => {
    const vertices = seedFreeformFromDie(die({ shape: 'circle' }))
    expect(vertices.length).toBeGreaterThan(8)
    for (const vertex of vertices) {
      expect(vertex.x).toBeGreaterThanOrEqual(0)
      expect(vertex.y).toBeGreaterThanOrEqual(0)
    }
  })
})

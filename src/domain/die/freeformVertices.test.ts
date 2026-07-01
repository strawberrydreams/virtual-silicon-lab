import { describe, expect, it } from 'vitest'
import { resolveFreeformVertices } from './freeformVertices'

describe('resolveFreeformVertices', () => {
  it('keeps valid vertices and clamps each component to [0,1]', () => {
    expect(
      resolveFreeformVertices({
        vertices: [
          { x: 0.2, y: 0.1 },
          { x: 1.4, y: -0.3 },
          { x: 0.5, y: 0.9 },
        ],
      }),
    ).toEqual([
      { x: 0.2, y: 0.1 },
      { x: 1, y: 0 },
      { x: 0.5, y: 0.9 },
    ])
  })

  it('drops malformed vertices before counting', () => {
    expect(
      resolveFreeformVertices({
        vertices: [
          { x: 0, y: 0 },
          { x: Number.NaN, y: 0.5 },
          { x: 'nope', y: 0.5 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
      }),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ])
  })

  it('falls back to a unit rectangle when fewer than three vertices survive', () => {
    expect(resolveFreeformVertices({ vertices: [{ x: 0.2, y: 0.2 }] })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ])
  })

  it('falls back when given a non-object or missing vertices', () => {
    expect(resolveFreeformVertices(undefined)).toHaveLength(4)
    expect(resolveFreeformVertices({})).toHaveLength(4)
  })
})

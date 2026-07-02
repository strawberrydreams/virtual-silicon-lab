import { describe, expect, it } from 'vitest'
import { isDieShape, isParametricDieShape, resolveDieShapeParams } from './dieShapeParams'

describe('die shape classification', () => {
  it('recognizes every persisted die shape', () => {
    expect(isDieShape('rect')).toBe(true)
    expect(isDieShape('rounded-rect')).toBe(true)
    expect(isDieShape('plus')).toBe(true)
    expect(isDieShape('triangle')).toBe(false)
  })

  it('separates parametric shapes from legacy shapes', () => {
    expect(isParametricDieShape('rounded-rect')).toBe(true)
    expect(isParametricDieShape('circle')).toBe(false)
  })

  it('recognizes the freeform shape but does not treat it as parametric', () => {
    expect(isDieShape('freeform')).toBe(true)
    expect(isParametricDieShape('freeform')).toBe(false)
  })
})

describe('resolveDieShapeParams', () => {
  it('supplies shape-specific defaults', () => {
    expect(resolveDieShapeParams('rounded-rect', undefined)).toEqual({ cornerRadius: 0.12 })
    expect(resolveDieShapeParams('l-shape', undefined)).toEqual({
      notch: { corner: 'bottom-right', size: 0.5 },
    })
  })

  it('clamps finite values to each safe range', () => {
    expect(resolveDieShapeParams('chamfered-rect', { chamfer: 99 })).toEqual({ chamfer: 0.35 })
    expect(resolveDieShapeParams('plus', { armWidth: 0 })).toEqual({ armWidth: 0.24 })
  })

  it('replaces malformed values and corners with defaults', () => {
    expect(
      resolveDieShapeParams('keyed', {
        notch: { corner: 'bad', size: Number.NaN },
      }),
    ).toEqual({ notch: { corner: 'top-left', size: 0.14 } })
    expect(resolveDieShapeParams('octagon', { chamfer: Number.POSITIVE_INFINITY })).toEqual({
      chamfer: 0.18,
    })
  })

  it('ignores parameters for legacy shapes', () => {
    expect(resolveDieShapeParams('rect', { chamfer: 0.2 })).toBeUndefined()
  })
})

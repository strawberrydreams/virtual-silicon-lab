import { describe, expect, it } from 'vitest'
import type { Die, DieShape } from '../project'
import {
  defaultDieShapeParams,
  resolveDieParameterControl,
  withDieNotchCorner,
  withDieParameterValue,
} from './dieParameterControls'

function die(shape: DieShape, dieShapeParams?: Die['dieShapeParams']): Die {
  return { shape, width: 960, height: 640, background: 'test', dieShapeParams }
}

describe('die parameter controls', () => {
  it.each([
    ['octagon', 'Corner Cut', 0.08, 0.35, 0.18],
    ['rounded-rect', 'Corner Radius', 0.02, 0.45, 0.12],
    ['chamfered-rect', 'Corner Cut', 0.02, 0.35, 0.1],
    ['keyed', 'Notch Size', 0.04, 0.35, 0.14],
    ['l-shape', 'Notch Size', 0.3, 0.65, 0.5],
    ['plus', 'Arm Width', 0.24, 0.6, 0.36],
  ] as const)('describes %s', (shape, label, min, max, value) => {
    expect(resolveDieParameterControl(die(shape))).toMatchObject({
      label,
      min,
      max,
      step: 0.01,
      value,
      defaultValue: value,
    })
  })

  it('exposes resolved notch corners', () => {
    expect(resolveDieParameterControl(die('keyed'))?.corner).toBe('top-left')
    expect(resolveDieParameterControl(die('l-shape'))?.corner).toBe('bottom-right')
    expect(
      resolveDieParameterControl(die('keyed', { notch: { corner: 'bottom-left', size: 0.2 } })),
    ).toMatchObject({ value: 0.2, corner: 'bottom-left' })
  })

  it.each(['rect', 'square', 'circle', 'hexagon'] as const)(
    'does not describe legacy shape %s',
    (shape) => {
      expect(resolveDieParameterControl(die(shape))).toBeUndefined()
      expect(defaultDieShapeParams(shape)).toBeUndefined()
    },
  )

  it('updates a scalar parameter through the existing resolver', () => {
    expect(withDieParameterValue(die('rounded-rect'), 0.24)).toEqual({ cornerRadius: 0.24 })
    expect(withDieParameterValue(die('octagon'), 99)).toEqual({ chamfer: 0.35 })
  })

  it('updates notch size without losing its corner', () => {
    expect(
      withDieParameterValue(die('keyed', { notch: { corner: 'bottom-left', size: 0.2 } }), 0.27),
    ).toEqual({ notch: { corner: 'bottom-left', size: 0.27 } })
  })

  it('updates notch corner without losing its size', () => {
    expect(withDieNotchCorner(die('l-shape'), 'top-right')).toEqual({
      notch: { corner: 'top-right', size: 0.5 },
    })
    expect(
      withDieNotchCorner(
        die('keyed', { notch: { corner: 'top-left', size: 0.22 } }),
        'bottom-right',
      ),
    ).toEqual({ notch: { corner: 'bottom-right', size: 0.22 } })
  })

  it('returns normalized defaults for reset', () => {
    expect(defaultDieShapeParams('plus')).toEqual({ armWidth: 0.36 })
    expect(defaultDieShapeParams('keyed')).toEqual({
      notch: { corner: 'top-left', size: 0.14 },
    })
  })
})

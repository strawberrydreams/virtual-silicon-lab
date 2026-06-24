import type { Die, DieCorner, DieShape, DieShapeParams } from '../project'
import { resolveDieShapeParams } from './dieShapeParams'

export type DieParameterControl = {
  label: string
  min: number
  max: number
  step: 0.01
  value: number
  defaultValue: number
  corner?: DieCorner
}

export function defaultDieShapeParams(shape: DieShape): DieShapeParams | undefined {
  return resolveDieShapeParams(shape, undefined)
}

export function resolveDieParameterControl(die: Die): DieParameterControl | undefined {
  const params = resolveDieShapeParams(die.shape, die.dieShapeParams)
  switch (die.shape) {
    case 'octagon':
      return {
        label: 'Corner Cut',
        min: 0.08,
        max: 0.35,
        step: 0.01,
        value: params?.chamfer ?? 0.18,
        defaultValue: 0.18,
      }
    case 'rounded-rect':
      return {
        label: 'Corner Radius',
        min: 0.02,
        max: 0.45,
        step: 0.01,
        value: params?.cornerRadius ?? 0.12,
        defaultValue: 0.12,
      }
    case 'chamfered-rect':
      return {
        label: 'Corner Cut',
        min: 0.02,
        max: 0.35,
        step: 0.01,
        value: params?.chamfer ?? 0.1,
        defaultValue: 0.1,
      }
    case 'keyed':
      return {
        label: 'Notch Size',
        min: 0.04,
        max: 0.35,
        step: 0.01,
        value: params?.notch?.size ?? 0.14,
        defaultValue: 0.14,
        corner: params?.notch?.corner ?? 'top-left',
      }
    case 'l-shape':
      return {
        label: 'Notch Size',
        min: 0.3,
        max: 0.65,
        step: 0.01,
        value: params?.notch?.size ?? 0.5,
        defaultValue: 0.5,
        corner: params?.notch?.corner ?? 'bottom-right',
      }
    case 'plus':
      return {
        label: 'Arm Width',
        min: 0.24,
        max: 0.6,
        step: 0.01,
        value: params?.armWidth ?? 0.36,
        defaultValue: 0.36,
      }
    case 'rect':
    case 'square':
    case 'circle':
    case 'hexagon':
      return undefined
  }
}

export function withDieParameterValue(die: Die, value: number): DieShapeParams | undefined {
  const current = resolveDieShapeParams(die.shape, die.dieShapeParams)
  switch (die.shape) {
    case 'octagon':
    case 'chamfered-rect':
      return resolveDieShapeParams(die.shape, { chamfer: value })
    case 'rounded-rect':
      return resolveDieShapeParams(die.shape, { cornerRadius: value })
    case 'keyed':
    case 'l-shape':
      return resolveDieShapeParams(die.shape, {
        notch: { corner: current?.notch?.corner, size: value },
      })
    case 'plus':
      return resolveDieShapeParams(die.shape, { armWidth: value })
    case 'rect':
    case 'square':
    case 'circle':
    case 'hexagon':
      return undefined
  }
}

export function withDieNotchCorner(die: Die, corner: DieCorner): DieShapeParams | undefined {
  if (die.shape !== 'keyed' && die.shape !== 'l-shape') return undefined
  const current = resolveDieShapeParams(die.shape, die.dieShapeParams)
  return resolveDieShapeParams(die.shape, {
    notch: { corner, size: current?.notch?.size },
  })
}

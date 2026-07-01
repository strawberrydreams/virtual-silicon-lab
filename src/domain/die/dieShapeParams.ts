import type { DieCorner, DieShape, DieShapeParams } from '../project'

export const LEGACY_DIE_SHAPES = ['rect', 'square', 'circle', 'hexagon'] as const
export const PARAMETRIC_DIE_SHAPES = [
  'octagon',
  'rounded-rect',
  'chamfered-rect',
  'keyed',
  'l-shape',
  'plus',
] as const

const DIE_SHAPES = [...LEGACY_DIE_SHAPES, ...PARAMETRIC_DIE_SHAPES, 'freeform'] as const
const DIE_CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const

export function isDieShape(value: unknown): value is DieShape {
  return typeof value === 'string' && (DIE_SHAPES as readonly string[]).includes(value)
}

export function isParametricDieShape(shape: DieShape): boolean {
  return (PARAMETRIC_DIE_SHAPES as readonly string[]).includes(shape)
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function finiteInRange(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function corner(value: unknown, fallback: DieCorner): DieCorner {
  return typeof value === 'string' && (DIE_CORNERS as readonly string[]).includes(value)
    ? (value as DieCorner)
    : fallback
}

export function resolveDieShapeParams(shape: DieShape, value: unknown): DieShapeParams | undefined {
  const params = record(value)
  switch (shape) {
    case 'octagon':
      return { chamfer: finiteInRange(params.chamfer, 0.18, 0.08, 0.35) }
    case 'rounded-rect':
      return { cornerRadius: finiteInRange(params.cornerRadius, 0.12, 0.02, 0.45) }
    case 'chamfered-rect':
      return { chamfer: finiteInRange(params.chamfer, 0.1, 0.02, 0.35) }
    case 'keyed': {
      const notch = record(params.notch)
      return {
        notch: {
          corner: corner(notch.corner, 'top-left'),
          size: finiteInRange(notch.size, 0.14, 0.04, 0.35),
        },
      }
    }
    case 'l-shape': {
      const notch = record(params.notch)
      return {
        notch: {
          corner: corner(notch.corner, 'bottom-right'),
          size: finiteInRange(notch.size, 0.5, 0.3, 0.65),
        },
      }
    }
    case 'plus':
      return { armWidth: finiteInRange(params.armWidth, 0.36, 0.24, 0.6) }
    case 'rect':
    case 'square':
    case 'circle':
    case 'hexagon':
      return undefined
  }
}

import type { Die } from '../../domain/project'
import type { PosterFormat } from './posterCompositions'
import { resolvePosterComposition } from './posterCompositions'

export const DIE_EXPORT_PIXEL_RATIO = 4
export const POSTER_EXPORT = {
  logicalWidth: 1600,
  logicalHeight: 900,
  pixelRatio: 2,
  pixelWidth: 3200,
  pixelHeight: 1800,
} as const

export function dieExportSize(die: Die) {
  return {
    logicalWidth: die.width,
    logicalHeight: die.height,
    pixelRatio: DIE_EXPORT_PIXEL_RATIO,
    pixelWidth: die.width * DIE_EXPORT_PIXEL_RATIO,
    pixelHeight: die.height * DIE_EXPORT_PIXEL_RATIO,
  }
}

export function posterChipPlacement(die: Die, format: PosterFormat = 'press-hero') {
  const placement = resolvePosterComposition(die, format).chip
  return { x: placement.x, y: placement.y, scale: placement.scale }
}

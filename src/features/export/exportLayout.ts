import type { Die } from '../../domain/project'

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

export function posterChipPlacement(die: Die) {
  const maxWidth = 900
  const maxHeight = 620
  const scale = Math.min(maxWidth / die.width, maxHeight / die.height)
  return { x: 80, y: 180, scale }
}

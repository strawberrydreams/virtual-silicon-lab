import type { Die } from '../../domain/project'

export type PosterFormat = 'press-hero' | 'architecture-slide' | 'product-closeup'

export type PosterRegion = {
  x: number
  y: number
  width: number
  height: number
}

export type PosterChipRegion = PosterRegion & {
  scale: number
}

export type PosterComposition = {
  format: PosterFormat
  label: string
  backgroundBand: PosterRegion
  chip: PosterChipRegion
  title: PosterRegion
  specs: PosterRegion
  footer: PosterRegion
  titleSize: number
  specSize: number
}

const LOGICAL_POSTER_WIDTH = 1600
const LOGICAL_POSTER_HEIGHT = 900

export const POSTER_FORMATS: readonly { id: PosterFormat; label: string }[] = [
  { id: 'press-hero', label: 'Press Hero' },
  { id: 'architecture-slide', label: 'Architecture Slide' },
  { id: 'product-closeup', label: 'Product Closeup' },
]

function scaleFor(die: Die, box: PosterRegion) {
  return Math.min(box.width / die.width, box.height / die.height)
}

function chipRegion(die: Die, region: PosterRegion): PosterChipRegion {
  return { ...region, scale: scaleFor(die, region) }
}

export function resolvePosterComposition(die: Die, format: PosterFormat = 'press-hero'): PosterComposition {
  switch (format) {
    case 'architecture-slide':
      return {
        format,
        label: 'Architecture Slide',
        backgroundBand: { x: 0, y: 0, width: LOGICAL_POSTER_WIDTH, height: LOGICAL_POSTER_HEIGHT },
        chip: chipRegion(die, { x: 430, y: 174, width: 780, height: 560 }),
        title: { x: 70, y: 64, width: 700, height: 150 },
        specs: { x: 70, y: 260, width: 280, height: 420 },
        footer: { x: 70, y: 820, width: 980, height: 40 },
        titleSize: 34,
        specSize: 16,
      }
    case 'product-closeup':
      return {
        format,
        label: 'Product Closeup',
        backgroundBand: { x: 0, y: 0, width: LOGICAL_POSTER_WIDTH, height: LOGICAL_POSTER_HEIGHT },
        chip: chipRegion(die, { x: 140, y: 134, width: 1080, height: 720 }),
        title: { x: 96, y: 58, width: 880, height: 120 },
        specs: { x: 1170, y: 92, width: 360, height: 520 },
        footer: { x: 96, y: 820, width: 920, height: 40 },
        titleSize: 38,
        specSize: 17,
      }
    case 'press-hero':
      return {
        format,
        label: 'Press Hero',
        backgroundBand: { x: 0, y: 0, width: LOGICAL_POSTER_WIDTH, height: LOGICAL_POSTER_HEIGHT },
        chip: chipRegion(die, { x: 80, y: 180, width: 900, height: 620 }),
        title: { x: 80, y: 72, width: 880, height: 130 },
        specs: { x: 1060, y: 210, width: 450, height: 560 },
        footer: { x: 80, y: 840, width: 980, height: 40 },
        titleSize: 42,
        specSize: 18,
      }
  }
}

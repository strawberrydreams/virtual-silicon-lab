import { describe, expect, it } from 'vitest'
import type { Die } from '../../domain/project'
import { POSTER_EXPORT } from './exportLayout'
import { POSTER_FORMATS, resolvePosterComposition } from './posterCompositions'

const die: Die = { shape: 'rect', width: 920, height: 600, background: 'military' }

describe('posterCompositions', () => {
  it('defines three selectable poster formats', () => {
    expect(POSTER_FORMATS.map((format) => format.id)).toEqual([
      'press-hero',
      'architecture-slide',
      'product-closeup',
    ])
  })

  it('keeps every composition region inside the logical poster canvas', () => {
    for (const format of POSTER_FORMATS) {
      const composition = resolvePosterComposition(die, format.id)
      for (const region of [composition.chip, composition.title, composition.specs, composition.footer]) {
        expect(region.x).toBeGreaterThanOrEqual(0)
        expect(region.y).toBeGreaterThanOrEqual(0)
        expect(region.x + region.width).toBeLessThanOrEqual(POSTER_EXPORT.logicalWidth)
        expect(region.y + region.height).toBeLessThanOrEqual(POSTER_EXPORT.logicalHeight)
      }
    }
  })

  it('uses distinct chip placement intent by format', () => {
    const pressHero = resolvePosterComposition(die, 'press-hero')
    const architecture = resolvePosterComposition(die, 'architecture-slide')
    const closeup = resolvePosterComposition(die, 'product-closeup')

    expect(pressHero.chip.scale).toBeLessThan(closeup.chip.scale)
    expect(architecture.chip.x).toBeGreaterThan(pressHero.chip.x)
    expect(closeup.specs.y).toBeLessThan(pressHero.specs.y)
  })
})

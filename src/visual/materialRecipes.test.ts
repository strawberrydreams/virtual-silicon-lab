import { describe, expect, it } from 'vitest'
import type { ChipFinish } from '../domain/material/chipFinish'
import type { StyleTheme } from '../domain/project'
import { resolveMaterialRecipe } from './materialRecipes'

const themes: StyleTheme[] = ['neon', 'retro', 'military', 'keynote', 'mono']
const finishes: ChipFinish[] = ['matte', 'satin', 'gloss', 'metallic']

describe('resolveMaterialRecipe', () => {
  it('returns a complete deterministic material recipe for every finish', () => {
    for (const theme of themes) {
      for (const finish of finishes) {
        const recipe = resolveMaterialRecipe(theme, finish)
        expect(recipe.theme).toBe(theme)
        expect(recipe.finish).toBe(finish)
        expect(recipe.package.fill).toMatch(/^#/)
        expect(recipe.substrate.stroke).toMatch(/^#/)
        expect(recipe.dieBase.fillStops.length).toBeGreaterThanOrEqual(2)
        expect(recipe.metalTrace.color).toMatch(/^#/)
        expect(recipe.microTile.opacity).toBeGreaterThan(0)
        expect(recipe.glassGlow.opacity).toBeGreaterThan(0)
        expect(recipe.readoutLabel.subduedColor).toMatch(/^#/)
        expect(resolveMaterialRecipe(theme, finish)).toEqual(recipe)
      }
    }
  })

  it('changes surface qualities without changing the theme palette', () => {
    const matte = resolveMaterialRecipe('neon', 'matte')
    const gloss = resolveMaterialRecipe('neon', 'gloss')
    const metallic = resolveMaterialRecipe('neon', 'metallic')

    expect(matte.package.fill).toBe(gloss.package.fill)
    expect(matte.metalTrace.color).toBe(gloss.metalTrace.color)
    expect(gloss.glassGlow.blur).toBeGreaterThan(matte.glassGlow.blur)
    expect(gloss.package.shadowBlur).toBeGreaterThan(matte.package.shadowBlur)
    expect(metallic.dieBase.strokeWidth).toBeGreaterThan(gloss.dieBase.strokeWidth)
  })

  it('defaults omitted finish from the theme', () => {
    expect(resolveMaterialRecipe('military')).toEqual(resolveMaterialRecipe('military', 'matte'))
  })

  it('keeps high-glow themes brighter than restrained themes', () => {
    expect(resolveMaterialRecipe('neon').glassGlow.blur).toBeGreaterThan(
      resolveMaterialRecipe('mono').glassGlow.blur,
    )
    expect(resolveMaterialRecipe('keynote').package.shadowBlur).toBeGreaterThan(
      resolveMaterialRecipe('military').package.shadowBlur,
    )
  })

  it('exposes a theme-driven filler palette for the dense floorplan', () => {
    const recipe = resolveMaterialRecipe('neon')
    expect(recipe.fillerCell.accentColors).toEqual(['#22d3ee', '#34d399', '#fbbf24'])
    expect(recipe.fillerCell.fill).toBe('#070f1d')
    expect(recipe.fillerCell.opacity).toBeGreaterThan(0)
  })
})

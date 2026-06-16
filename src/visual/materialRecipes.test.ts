import { describe, expect, it } from 'vitest'
import type { StyleTheme } from '../domain/project'
import { resolveMaterialRecipe } from './materialRecipes'

const themes: StyleTheme[] = ['neon', 'retro', 'military', 'keynote', 'mono']

describe('resolveMaterialRecipe', () => {
  it('returns a complete deterministic material recipe for every chip theme', () => {
    for (const theme of themes) {
      const recipe = resolveMaterialRecipe(theme)
      expect(recipe.theme).toBe(theme)
      expect(recipe.package.fill).toMatch(/^#/)
      expect(recipe.substrate.stroke).toMatch(/^#/)
      expect(recipe.dieBase.fillStops.length).toBeGreaterThanOrEqual(2)
      expect(recipe.metalTrace.color).toMatch(/^#/)
      expect(recipe.microTile.opacity).toBeGreaterThan(0)
      expect(recipe.glassGlow.opacity).toBeGreaterThan(0)
      expect(recipe.readoutLabel.subduedColor).toMatch(/^#/)
      expect(resolveMaterialRecipe(theme)).toEqual(recipe)
    }
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

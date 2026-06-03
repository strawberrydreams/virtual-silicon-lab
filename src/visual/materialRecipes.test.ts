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
      expect(recipe.readoutLabel.color).toMatch(/^#/)
      expect(resolveMaterialRecipe(theme)).toEqual(recipe)
    }
  })

  it('keeps high-glow themes brighter than restrained themes', () => {
    expect(resolveMaterialRecipe('neon').glassGlow.blur).toBeGreaterThan(resolveMaterialRecipe('mono').glassGlow.blur)
    expect(resolveMaterialRecipe('keynote').package.shadowBlur).toBeGreaterThan(
      resolveMaterialRecipe('military').package.shadowBlur,
    )
  })
})

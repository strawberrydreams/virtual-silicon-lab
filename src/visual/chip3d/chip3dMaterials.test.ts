import { describe, expect, it } from 'vitest'
import type { ChipFinish } from '../../domain/material/chipFinish'
import type { StyleTheme } from '../../domain/project'
import { resolveMaterialRecipe } from '../materialRecipes'
import { resolveChip3DStyle } from './chip3dMaterials'

const THEMES: StyleTheme[] = ['neon', 'retro', 'military', 'keynote', 'mono']
const FINISHES: ChipFinish[] = ['matte', 'satin', 'gloss', 'metallic']

function isHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

describe('resolveChip3DStyle', () => {
  it('resolves bounded PBR params for every theme and finish', () => {
    for (const theme of THEMES) {
      for (const finish of FINISHES) {
        const { materials, environment } = resolveChip3DStyle(theme, finish)
        expect(environment.exposure).toBeGreaterThan(0)
        expect(environment.exposure).toBeLessThanOrEqual(2)
        expect(environment.bloom.threshold).toBeGreaterThanOrEqual(0)
        expect(environment.bloom.threshold).toBeLessThanOrEqual(1)
        expect(environment.bloom.strength).toBeGreaterThanOrEqual(0)
        expect(environment.bloom.strength).toBeLessThanOrEqual(2)
        expect(environment.bloom.radius).toBeGreaterThanOrEqual(0)
        expect(environment.bloom.radius).toBeLessThanOrEqual(1)
        for (const role of ['package', 'dieBase', 'blockReal', 'blockFantasy'] as const) {
          const m = materials[role]
          expect(isHex(m.color), `${theme}/${finish}/${role} color`).toBe(true)
          expect(m.metalness).toBeGreaterThanOrEqual(0)
          expect(m.metalness).toBeLessThanOrEqual(1)
          expect(m.roughness).toBeGreaterThanOrEqual(0)
          expect(m.roughness).toBeLessThanOrEqual(1)
          expect(m.emissiveIntensity).toBeGreaterThanOrEqual(0)
          expect(isHex(m.emissive), `${theme}/${finish}/${role} emissive`).toBe(true)
        }
      }
    }
  })

  it('applies shared finish semantics to PBR materials', () => {
    const matte = resolveChip3DStyle('neon', 'matte')
    const gloss = resolveChip3DStyle('neon', 'gloss')
    const metallic = resolveChip3DStyle('neon', 'metallic')

    expect(metallic.materials.dieBase.metalness).toBeGreaterThan(gloss.materials.dieBase.metalness)
    expect(matte.materials.dieBase.roughness).toBeGreaterThan(gloss.materials.dieBase.roughness)
    expect(gloss.environment.bloom.strength).toBeGreaterThan(matte.environment.bloom.strength)
  })

  it('defaults omitted finish from the theme for 3D', () => {
    expect(resolveChip3DStyle('military')).toEqual(resolveChip3DStyle('military', 'matte'))
  })

  it('derives fantasy emissive intensity from finish-adjusted glow', () => {
    const matteRecipe = resolveMaterialRecipe('neon', 'matte')
    const glossRecipe = resolveMaterialRecipe('neon', 'gloss')
    const matte = resolveChip3DStyle('neon', 'matte')
    const gloss = resolveChip3DStyle('neon', 'gloss')

    expect(glossRecipe.glassGlow.opacity).toBeGreaterThan(matteRecipe.glassGlow.opacity)
    expect(gloss.materials.blockFantasy.emissiveIntensity).toBeGreaterThan(
      matte.materials.blockFantasy.emissiveIntensity,
    )
  })

  it('makes only fantasy blocks emissive, and metal blocks more metallic than the package', () => {
    for (const theme of THEMES) {
      const { materials } = resolveChip3DStyle(theme)
      expect(materials.blockFantasy.emissiveIntensity).toBeGreaterThan(0)
      expect(materials.package.emissiveIntensity).toBe(0)
      expect(materials.dieBase.emissiveIntensity).toBe(0)
      expect(materials.blockReal.emissiveIntensity).toBe(0)
      expect(materials.blockReal.metalness).toBeGreaterThan(materials.package.metalness)
    }
  })

  it('derives a non-empty environment with neon blooming stronger than mono', () => {
    const neon = resolveChip3DStyle('neon').environment
    const mono = resolveChip3DStyle('mono').environment
    expect(isHex(neon.topColor)).toBe(true)
    expect(isHex(neon.bottomColor)).toBe(true)
    expect(neon.exposure).toBeGreaterThan(0)
    expect(neon.bloom.threshold).toBeGreaterThanOrEqual(0)
    expect(neon.bloom.strength).toBeGreaterThan(mono.bloom.strength)
  })

  it('sources fantasy emissive from the theme glow color', () => {
    // neon glow hue is #22d3ee (tokens.glow.shadowColor === recipe.glassGlow.color)
    expect(resolveChip3DStyle('neon').materials.blockFantasy.emissive.toLowerCase()).toBe('#22d3ee')
  })
})

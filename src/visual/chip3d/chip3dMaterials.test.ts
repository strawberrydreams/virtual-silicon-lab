import { describe, expect, it } from 'vitest'
import type { StyleTheme } from '../../domain/project'
import { resolveChip3DStyle } from './chip3dMaterials'

const THEMES: StyleTheme[] = ['neon', 'retro', 'military', 'keynote', 'mono']

function isHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

describe('resolveChip3DStyle', () => {
  it('resolves bounded PBR params for every theme', () => {
    for (const theme of THEMES) {
      const { materials } = resolveChip3DStyle(theme)
      for (const role of ['package', 'dieBase', 'blockReal', 'blockFantasy'] as const) {
        const m = materials[role]
        expect(isHex(m.color), `${theme}/${role} color`).toBe(true)
        expect(m.metalness).toBeGreaterThanOrEqual(0)
        expect(m.metalness).toBeLessThanOrEqual(1)
        expect(m.roughness).toBeGreaterThanOrEqual(0)
        expect(m.roughness).toBeLessThanOrEqual(1)
        expect(m.emissiveIntensity).toBeGreaterThanOrEqual(0)
        expect(isHex(m.emissive), `${theme}/${role} emissive`).toBe(true)
      }
    }
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

import { describe, expect, it } from 'vitest'
import type { StyleTheme } from '../project'
import {
  CHIP_FINISHES,
  defaultFinishForTheme,
  isChipFinish,
  resolveChipFinish,
  resolveChipFinishDescriptor,
} from './chipFinish'

const THEMES: StyleTheme[] = ['neon', 'retro', 'military', 'keynote', 'mono']

describe('chip finish domain', () => {
  it('defines the complete v9-M4 finish catalog', () => {
    expect(CHIP_FINISHES).toEqual(['matte', 'satin', 'gloss', 'metallic'])
  })

  it('derives a stable default finish from each theme', () => {
    expect(
      Object.fromEntries(THEMES.map((theme) => [theme, defaultFinishForTheme(theme)])),
    ).toEqual({
      neon: 'gloss',
      retro: 'satin',
      military: 'matte',
      keynote: 'metallic',
      mono: 'gloss',
    })
  })

  it('validates and normalizes persisted finish values', () => {
    expect(isChipFinish('metallic')).toBe(true)
    expect(isChipFinish('glass')).toBe(false)
    expect(resolveChipFinish('metallic', 'neon')).toBe('metallic')
    expect(resolveChipFinish(undefined, 'military')).toBe('matte')
    expect(resolveChipFinish('glass', 'keynote')).toBe('metallic')
  })

  it('resolves bounded deterministic descriptors for every finish', () => {
    for (const finish of CHIP_FINISHES) {
      const descriptor = resolveChipFinishDescriptor(finish)
      expect(descriptor.finish).toBe(finish)
      expect(descriptor.label.length).toBeGreaterThan(0)
      expect(descriptor.twoD.shadowScale).toBeGreaterThan(0)
      expect(descriptor.twoD.shadowScale).toBeLessThanOrEqual(2)
      expect(descriptor.twoD.glowScale).toBeGreaterThan(0)
      expect(descriptor.twoD.glowScale).toBeLessThanOrEqual(2)
      expect(descriptor.twoD.traceOpacityScale).toBeGreaterThan(0)
      expect(descriptor.twoD.traceOpacityScale).toBeLessThanOrEqual(2)
      expect(descriptor.twoD.microTileOpacityScale).toBeGreaterThan(0)
      expect(descriptor.twoD.microTileOpacityScale).toBeLessThanOrEqual(2)
      expect(descriptor.twoD.packageHighlightOpacity).toBeGreaterThanOrEqual(0)
      expect(descriptor.twoD.packageHighlightOpacity).toBeLessThanOrEqual(1)
      expect(descriptor.twoD.dieStrokeScale).toBeGreaterThan(0)
      expect(descriptor.twoD.dieStrokeScale).toBeLessThanOrEqual(2)
      expect(descriptor.pbr.bloomStrengthScale).toBeGreaterThan(0)
      expect(descriptor.pbr.bloomStrengthScale).toBeLessThanOrEqual(2)
      expect(descriptor.pbr.exposure).toBeGreaterThan(0)
      expect(descriptor.pbr.exposure).toBeLessThanOrEqual(2)
      for (const role of ['package', 'dieBase', 'blockReal', 'blockFantasy'] as const) {
        expect(descriptor.pbr[role].metalness).toBeGreaterThanOrEqual(0)
        expect(descriptor.pbr[role].metalness).toBeLessThanOrEqual(1)
        expect(descriptor.pbr[role].roughness).toBeGreaterThanOrEqual(0)
        expect(descriptor.pbr[role].roughness).toBeLessThanOrEqual(1)
      }
      expect(resolveChipFinishDescriptor(finish)).toEqual(descriptor)
    }
  })

  it('makes metallic more metallic and matte rougher than gloss', () => {
    const metallic = resolveChipFinishDescriptor('metallic')
    const matte = resolveChipFinishDescriptor('matte')
    const gloss = resolveChipFinishDescriptor('gloss')

    expect(metallic.pbr.dieBase.metalness).toBeGreaterThan(gloss.pbr.dieBase.metalness)
    expect(matte.pbr.dieBase.roughness).toBeGreaterThan(gloss.pbr.dieBase.roughness)
    expect(gloss.twoD.glowScale).toBeGreaterThan(matte.twoD.glowScale)
  })
})

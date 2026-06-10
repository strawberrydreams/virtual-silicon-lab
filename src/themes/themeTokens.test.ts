import { describe, expect, it } from 'vitest'
import type { StyleTheme } from '../domain/project'
import { THEMES, resolveTheme } from './themeTokens'

const ALL_THEMES: StyleTheme[] = ['neon', 'retro', 'military', 'keynote', 'mono']

describe('theme catalog', () => {
  it('defines tokens for every theme', () => {
    for (const theme of ALL_THEMES) {
      expect(THEMES[theme]).toBeDefined()
      expect(THEMES[theme].name).toBe(theme)
    }
  })

  it('resolveTheme returns the matching token set', () => {
    expect(resolveTheme('keynote')).toBe(THEMES.keynote)
  })

  it('keeps every accent budget within 1..3 hues', () => {
    for (const theme of ALL_THEMES) {
      expect(THEMES[theme].accents.length).toBeGreaterThanOrEqual(1)
      expect(THEMES[theme].accents.length).toBeLessThanOrEqual(3)
    }
  })

  it('uses valid glow and gradient values', () => {
    for (const theme of ALL_THEMES) {
      const t = THEMES[theme]
      expect(t.glow.shadowBlur).toBeGreaterThanOrEqual(0)
      expect(t.glow.shadowOpacity).toBeGreaterThanOrEqual(0)
      expect(t.glow.shadowOpacity).toBeLessThanOrEqual(1)
      expect(t.dieFill.length).toBeGreaterThanOrEqual(2)
      for (const stop of [...t.dieFill, ...t.background]) {
        expect(stop.offset).toBeGreaterThanOrEqual(0)
        expect(stop.offset).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('neon blueprint palette', () => {
  it('uses cyan + green + amber accents (no magenta/purple)', () => {
    const neon = resolveTheme('neon')
    expect(neon.accents).toEqual(['#22d3ee', '#34d399', '#fbbf24'])
  })

  it('keeps a bright cyan die edge and a near-black navy backdrop', () => {
    const neon = resolveTheme('neon')
    expect(neon.dieStroke).toBe('#2dd4ee')
    expect(neon.background[1].color).toBe('#03050c')
  })
})

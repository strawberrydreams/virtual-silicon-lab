import { describe, expect, it } from 'vitest'
import { DEFAULT_PAGE_THEME, PAGE_THEME_NAMES, pageThemes, resolvePageTheme } from './pageThemes'

const TOKEN_GROUPS = [
  'background',
  'surface',
  'border',
  'text',
  'accent',
  'glow',
  'focus',
  'canvas',
  'hero',
] as const

describe('pageThemes', () => {
  it('defaults to the laboratory page theme', () => {
    expect(DEFAULT_PAGE_THEME).toBe('laboratory')
    expect(resolvePageTheme(undefined).name).toBe('laboratory')
    expect(resolvePageTheme('not-a-theme').name).toBe('laboratory')
  })

  it('defines a complete token contract for every page theme', () => {
    const referenceKeys = Object.keys(pageThemes.laboratory.tokens)

    for (const themeName of PAGE_THEME_NAMES) {
      expect(Object.keys(pageThemes[themeName].tokens)).toEqual(referenceKeys)
      for (const group of TOKEN_GROUPS) {
        expect(pageThemes[themeName].tokens[group]).toBeTruthy()
      }
      expect(pageThemes[themeName].cssVariables['--v2-bg']).toMatch(/^#/)
      expect(pageThemes[themeName].cssVariables['--v2-accent']).toMatch(/^#/)
    }
  })

  it('keeps page themes visually distinct', () => {
    expect(pageThemes.laboratory.cssVariables['--v2-bg']).not.toBe(
      pageThemes.anime.cssVariables['--v2-bg'],
    )
    expect(pageThemes.anime.cssVariables['--v2-accent']).not.toBe(
      pageThemes.space.cssVariables['--v2-accent'],
    )
  })
})

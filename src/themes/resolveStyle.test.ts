import { describe, expect, it } from 'vitest'
import type { Block, Decoration } from '../domain/project'
import { THEMES } from './themeTokens'
import { resolveBlockStyle, resolveDecorationStyle } from './resolveStyle'

const tokens = THEMES.neon

function block(overrides: Partial<Block> = {}): Block {
  return {
    id: 'b1',
    type: 'CPU',
    category: 'real',
    x: 0,
    y: 0,
    w: 100,
    h: 60,
    rotation: 0,
    glow: true,
    zIndex: 0,
    ...overrides,
  }
}

describe('resolveBlockStyle', () => {
  it('uses theme block fill by category', () => {
    expect(resolveBlockStyle(block(), tokens, false).fill).toBe(tokens.blockFill.real)
    expect(resolveBlockStyle(block({ category: 'fantasy' }), tokens, false).fill).toBe(tokens.blockFill.fantasy)
  })

  it('lets colorOverride win over the theme fill', () => {
    expect(resolveBlockStyle(block({ colorOverride: '#123456' }), tokens, false).fill).toBe('#123456')
  })

  it('applies the select stroke when selected', () => {
    expect(resolveBlockStyle(block(), tokens, true).stroke).toBe(tokens.selectStroke)
  })

  it('drops the shadow when glow is off', () => {
    expect(resolveBlockStyle(block({ glow: false }), tokens, false).shadowBlur).toBe(0)
  })

  it('gives fantasy blocks the signature accent glow and a stronger blur than real blocks', () => {
    const fantasy = resolveBlockStyle(block({ category: 'fantasy' }), tokens, false)
    const real = resolveBlockStyle(block(), tokens, false)
    expect(fantasy.shadowColor).toBe(tokens.accents[0])
    expect(fantasy.shadowBlur).toBeGreaterThan(real.shadowBlur)
  })

  it('uses colorOverride for the glow color when present', () => {
    const styled = resolveBlockStyle(block({ category: 'fantasy', colorOverride: '#ff2bd6' }), tokens, false)
    expect(styled.shadowColor).toBe('#ff2bd6')
  })
})

describe('resolveDecorationStyle', () => {
  it('falls back to the signature accent for an uncolored neon line and uses additive blend', () => {
    const decoration: Decoration = { id: 'd', kind: 'neonLine', points: [0, 0, 10, 10], color: '', zIndex: 0 }
    const style = resolveDecorationStyle(decoration, tokens)
    expect(style.color).toBe(tokens.accents[0])
    expect(style.blend).toBe('lighter')
  })

  it('uses the theme text color for labels', () => {
    const decoration: Decoration = { id: 'd', kind: 'label', x: 0, y: 0, text: 'X', zIndex: 0 }
    expect(resolveDecorationStyle(decoration, tokens).color).toBe(tokens.text)
  })
})

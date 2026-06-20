import { describe, expect, it } from 'vitest'
import type { AiLayoutContext } from '@domain/ai/aiLayoutSuggestion'
import type { AiChipContext } from '@domain/ai/aiSpecDraft'
import type { AiVariationContext } from '@domain/ai/aiVariationContext'
import { createFakeProvider } from '../src/ai/fakeProvider'

describe('createFakeProvider', () => {
  it('returns a deterministic, valid-shaped draft derived from the prompt', async () => {
    const provider = createFakeProvider()
    const a = await provider.generateChipDraft({ prompt: 'a neon dream chip' })
    const b = await provider.generateChipDraft({ prompt: 'a neon dream chip' })
    expect(a).toEqual(b)
    expect(a.dieShape).toBe('rect')
    expect(a.blocks.length).toBeGreaterThan(0)
    expect(a.blocks.every((blk) => typeof blk.type === 'string')).toBe(true)
    expect(a.name).toContain('neon')
  })

  it('derives a deterministic theme from the prompt', async () => {
    const provider = createFakeProvider()
    expect((await provider.generateChipDraft({ prompt: 'a calm mono chip' })).theme).toBe('mono')
    expect((await provider.generateChipDraft({ prompt: 'a neon dream chip' })).theme).toBe('neon')
  })
})

describe('createFakeProvider.generateSpecCopy', () => {
  const context: AiChipContext = {
    name: 'NEON DREAM',
    theme: 'neon',
    dieShape: 'hexagon',
    blockTypes: ['CPU', 'Cache', 'DreamSynth'],
  }

  it('returns a deterministic spec draft derived from the chip context', async () => {
    const provider = createFakeProvider()
    const a = await provider.generateSpecCopy({ context })
    const b = await provider.generateSpecCopy({ context })
    expect(a).toEqual(b)
    expect(typeof a.brand).toBe('string')
    expect(a.brand).toContain('NEON')
    expect(Array.isArray(a.features)).toBe(true)
  })
})

describe('createFakeProvider.generateLayoutSuggestions', () => {
  const context: AiLayoutContext = {
    dieShape: 'rect',
    blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
  }

  it('returns deterministic suggestions for new block types', async () => {
    const provider = createFakeProvider()
    const a = await provider.generateLayoutSuggestions({ context })
    const b = await provider.generateLayoutSuggestions({ context })
    expect(a).toEqual(b)
    expect(a.suggestions.length).toBeGreaterThan(0)
    expect(a.suggestions.every((suggestion) => typeof suggestion.type === 'string')).toBe(true)
    expect(a.suggestions.some((suggestion) => suggestion.type === 'CPU')).toBe(false)
  })
})

describe('createFakeProvider.generateVariations', () => {
  const context: AiVariationContext = {
    name: 'NOVA',
    theme: 'neon',
    dieShape: 'rect',
    blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
  }

  it('returns deterministic variations that keep the layout but vary the theme', async () => {
    const provider = createFakeProvider()
    const a = await provider.generateVariations({ context, count: 3 })
    const b = await provider.generateVariations({ context, count: 3 })

    expect(a).toEqual(b)
    expect(a.variations).toHaveLength(3)
    expect(a.variations.every((variation) => variation.blocks.length === 1)).toBe(true)
    expect(new Set(a.variations.map((variation) => variation.theme)).size).toBeGreaterThan(1)
  })

  it('honors the requested count', async () => {
    const provider = createFakeProvider()

    expect((await provider.generateVariations({ context, count: 2 })).variations).toHaveLength(2)
  })
})

import { describe, expect, it } from 'vitest'
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
})

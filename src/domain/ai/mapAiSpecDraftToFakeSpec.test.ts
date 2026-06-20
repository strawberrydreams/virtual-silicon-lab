import { describe, expect, it } from 'vitest'
import { mapAiSpecDraftToFakeSpec } from './mapAiSpecDraftToFakeSpec'
import type { AiSpecDraft } from './aiSpecDraft'

describe('mapAiSpecDraftToFakeSpec', () => {
  it('passes a well-formed draft through, trimming strings', () => {
    const draft: AiSpecDraft = {
      brand: '  AURORA  ',
      series: 'C-1',
      generation: '3rd-gen',
      process: '0.5nm soul-etched',
      cores: 88,
      bandwidth: 'infinity TB/s',
      features: ['Dream Engine', 'Lucid Cache'],
      description: 'Parallel consciousness processing.',
    }
    const spec = mapAiSpecDraftToFakeSpec(draft)
    expect(spec.brand).toBe('AURORA')
    expect(spec.series).toBe('C-1')
    expect(spec.cores).toBe(88)
    expect(spec.features).toEqual(['Dream Engine', 'Lucid Cache'])
  })

  it('fills defaults for a fully empty draft', () => {
    const spec = mapAiSpecDraftToFakeSpec({})
    expect(typeof spec.brand).toBe('string')
    expect(spec.brand.length).toBeGreaterThan(0)
    expect(spec.cores).toBe(8)
    expect(spec.features).toEqual([])
    expect(typeof spec.description).toBe('string')
  })

  it('coerces a non-integer / negative core count to a clamped integer', () => {
    expect(mapAiSpecDraftToFakeSpec({ cores: -5 }).cores).toBe(0)
    expect(mapAiSpecDraftToFakeSpec({ cores: 12.9 }).cores).toBe(12)
    expect(mapAiSpecDraftToFakeSpec({ cores: 1e9 }).cores).toBe(4096)
    expect(mapAiSpecDraftToFakeSpec({ cores: Number.NaN }).cores).toBe(8)
  })

  it('bounds the features array (count + per-item length) and drops empties', () => {
    const draft: AiSpecDraft = {
      features: ['  one  ', '', '   ', 'two', 'three', 'four', 'five', 'six', 'seven'],
    }
    const spec = mapAiSpecDraftToFakeSpec(draft)
    expect(spec.features).toHaveLength(6)
    expect(spec.features[0]).toBe('one')
    expect(spec.features.every((f) => f.length <= 80)).toBe(true)
  })

  it('caps over-long strings', () => {
    const long = 'x'.repeat(500)
    const spec = mapAiSpecDraftToFakeSpec({ brand: long, description: long })
    expect(spec.brand.length).toBeLessThanOrEqual(80)
    expect(spec.description.length).toBeLessThanOrEqual(280)
  })

  it('survives wrong-typed fields by falling back to defaults', () => {
    const spec = mapAiSpecDraftToFakeSpec({
      brand: 123 as unknown as string,
      features: 'not an array' as unknown as string[],
    })
    expect(typeof spec.brand).toBe('string')
    expect(spec.features).toEqual([])
  })
})

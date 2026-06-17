import { describe, expect, it } from 'vitest'
import { validateHandle } from '../src/profiles/validation'

describe('profile handle validation', () => {
  it('accepts valid handles, normalizes case, and rejects bad or reserved handles', () => {
    expect(validateHandle('Neon_Maker7')).toEqual({ ok: true, value: 'neon_maker7' })
    expect(validateHandle('ab').ok).toBe(false)
    expect(validateHandle('has space').ok).toBe(false)
    expect(validateHandle('admin').ok).toBe(false)
    expect(validateHandle('gallery').ok).toBe(false)
  })
})

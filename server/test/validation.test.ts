import { describe, expect, it } from 'vitest'
import {
  validateDisplayName,
  validateEmail,
  validateLoginInput,
  validatePassword,
  validateSignupInput,
} from '../src/accounts/validation'

describe('validateEmail', () => {
  it('trims and lowercases a valid email', () => {
    expect(validateEmail('  Ada@Example.COM ')).toEqual({ ok: true, value: 'ada@example.com' })
  })

  it.each(['', 'no-at-sign', 'a@b', 'spaces in@mail.com', 42, null])('rejects %j', (raw) => {
    expect(validateEmail(raw).ok).toBe(false)
  })

  it('rejects emails longer than 254 chars', () => {
    expect(validateEmail(`${'a'.repeat(250)}@b.com`).ok).toBe(false)
  })
})

describe('validateDisplayName', () => {
  it('trims and accepts 1-40 chars', () => {
    expect(validateDisplayName('  Ada  ')).toEqual({ ok: true, value: 'Ada' })
  })

  it.each(['', '   ', 'x'.repeat(41), 7])('rejects %j', (raw) => {
    expect(validateDisplayName(raw).ok).toBe(false)
  })
})

describe('validatePassword', () => {
  it('accepts 8-200 chars without trimming', () => {
    expect(validatePassword(' spaced pass ')).toEqual({ ok: true, value: ' spaced pass ' })
  })

  it.each(['short7!', 'x'.repeat(201), 99])('rejects %j', (raw) => {
    expect(validatePassword(raw).ok).toBe(false)
  })
})

describe('composite inputs', () => {
  it('validates a full signup body', () => {
    expect(
      validateSignupInput({ email: 'Ada@Example.com', displayName: ' Ada ', password: 'hunter22hunter22' }),
    ).toEqual({
      ok: true,
      value: { email: 'ada@example.com', displayName: 'Ada', password: 'hunter22hunter22' },
    })
  })

  it('rejects non-object bodies and missing fields', () => {
    expect(validateSignupInput(null).ok).toBe(false)
    expect(validateSignupInput({ email: 'a@b.co' }).ok).toBe(false)
    expect(validateLoginInput({ email: 'a@b.co' }).ok).toBe(false)
  })

  it('login keeps the raw password but normalizes the email', () => {
    expect(validateLoginInput({ email: 'A@B.co', password: 'whatever' })).toEqual({
      ok: true,
      value: { email: 'a@b.co', password: 'whatever' },
    })
  })
})

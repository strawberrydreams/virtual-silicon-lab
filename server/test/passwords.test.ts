import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../src/accounts/passwords'

describe('password hashing', () => {
  it('hashes with argon2id and verifies the original password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(await verifyPassword(hash, 'wrong password')).toBe(false)
  })

  it('returns false for a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword('not-a-hash', 'anything')).toBe(false)
  })
})

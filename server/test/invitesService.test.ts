import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { createInviteCode, listInviteCodes, redeemInviteCode, revokeInviteCode } from '../src/invites/service'
import { generateInviteCode, validateMaxUses } from '../src/invites/validation'
import { migrations } from '../src/migrations'

function db() {
  const database = openDatabase(':memory:')
  runMigrations(database, migrations)
  database
    .prepare('INSERT INTO users (id,email,display_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?)')
    .run('admin', 'admin@test.com', 'Admin', 'hash', 0, 0)
  return database
}

describe('invite validation', () => {
  it('generates a 12-char A-Z2-7 code', () => {
    expect(generateInviteCode()).toMatch(/^[A-Z2-7]{12}$/)
  })

  it('accepts 1..1000 max uses, rejects others', () => {
    expect(validateMaxUses(5)).toEqual({ ok: true, value: 5 })
    expect(validateMaxUses(0).ok).toBe(false)
    expect(validateMaxUses(1001).ok).toBe(false)
    expect(validateMaxUses(2.5).ok).toBe(false)
  })
})

describe('invite service', () => {
  it('creates and lists a code', () => {
    const database = db()
    const code = createInviteCode(
      database,
      { createdBy: 'admin', maxUses: 2, expiresAt: null, note: 'beta' },
      () => 100,
    )

    expect(code.code).toMatch(/^[A-Z2-7]{12}$/)
    expect(listInviteCodes(database).map((entry) => entry.code)).toContain(code.code)
  })

  it('redeems atomically until exhausted, then fails', () => {
    const database = db()
    const code = createInviteCode(
      database,
      { createdBy: 'admin', maxUses: 2, expiresAt: null, note: null },
      () => 100,
    )

    expect(redeemInviteCode(database, code.code, () => 100)).toBe('ok')
    expect(redeemInviteCode(database, code.code, () => 100)).toBe('ok')
    expect(redeemInviteCode(database, code.code, () => 100)).toBe('exhausted')
  })

  it('rejects unknown, revoked, and expired codes', () => {
    const database = db()
    expect(redeemInviteCode(database, 'NOPENOPENOPE', () => 100)).toBe('invalid')

    const expired = createInviteCode(
      database,
      { createdBy: 'admin', maxUses: 5, expiresAt: 50, note: null },
      () => 10,
    )
    expect(redeemInviteCode(database, expired.code, () => 100)).toBe('expired')

    const revoked = createInviteCode(
      database,
      { createdBy: 'admin', maxUses: 5, expiresAt: null, note: null },
      () => 10,
    )
    expect(revokeInviteCode(database, revoked.code)).toBe(true)
    expect(redeemInviteCode(database, revoked.code, () => 100)).toBe('invalid')
  })
})

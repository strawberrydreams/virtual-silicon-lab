import { describe, expect, it } from 'vitest'
import { issueToken, consumeToken } from '../src/accounts/tokens'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

function seedDb() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  db.prepare('INSERT INTO users (id,email,display_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?)')
    .run('u1', 'u@test.com', 'User', 'hash', 0, 0)
  return db
}

describe('account tokens', () => {
  it('issues a token, consumes it once, then rejects reuse', () => {
    const db = seedDb()
    const token = issueToken(db, 'email_verification_tokens', 'u1', 1_000, () => 0)
    expect(db.prepare('SELECT token_hash FROM email_verification_tokens').get()).not.toEqual({
      token_hash: token,
    })
    expect(consumeToken(db, 'email_verification_tokens', token, () => 100)).toBe('u1')
    expect(consumeToken(db, 'email_verification_tokens', token, () => 100)).toBeNull()
  })

  it('rejects expired tokens', () => {
    const db = seedDb()
    const token = issueToken(db, 'password_reset_tokens', 'u1', 50, () => 0)
    expect(consumeToken(db, 'password_reset_tokens', token, () => 100)).toBeNull()
  })
})

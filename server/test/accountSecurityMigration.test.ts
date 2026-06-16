import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

describe('010_account_security', () => {
  it('adds email verification and password reset token storage', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    const userColumns = (
      db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
    ).map((column) => column.name)
    expect(userColumns).toContain('email_verified_at')
    expect(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'email_verification_tokens'",
        )
        .get(),
    ).toBeDefined()
    expect(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'password_reset_tokens'",
        )
        .get(),
    ).toBeDefined()
  })
})

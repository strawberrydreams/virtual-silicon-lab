import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

describe('008_invite_codes', () => {
  it('creates invite_codes and users.invited_via_code', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)

    const inviteColumns = (
      db.prepare('PRAGMA table_info(invite_codes)').all() as { name: string }[]
    ).map((column) => column.name)
    expect(inviteColumns).toEqual(
      expect.arrayContaining([
        'code',
        'created_by',
        'max_uses',
        'used_count',
        'expires_at',
        'note',
        'created_at',
      ]),
    )

    const userColumns = (
      db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
    ).map((column) => column.name)
    expect(userColumns).toContain('invited_via_code')
  })
})

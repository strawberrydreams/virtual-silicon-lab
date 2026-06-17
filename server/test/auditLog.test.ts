import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { listAudit, recordAudit } from '../src/moderation/auditLog'

describe('audit log', () => {
  it('records and lists audit entries newest-first', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    db.prepare('INSERT INTO users (id,email,display_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?)')
      .run('admin', 'admin@test.com', 'Admin', 'hash', 0, 0)

    recordAudit(
      db,
      { adminUserId: 'admin', action: 'hide_chip', targetType: 'chip', targetId: 'c1', detail: null },
      () => 1,
    )
    recordAudit(
      db,
      {
        adminUserId: 'admin',
        action: 'ban_user',
        targetType: 'user',
        targetId: 'u1',
        detail: 'spam',
      },
      () => 2,
    )

    const rows = listAudit(db, 10)
    expect(rows.map((row) => row.action)).toEqual(['ban_user', 'hide_chip'])
    expect(rows[0]).toEqual(
      expect.objectContaining({
        adminUserId: 'admin',
        targetType: 'user',
        targetId: 'u1',
        detail: 'spam',
        createdAt: 2,
      }),
    )
  })
})

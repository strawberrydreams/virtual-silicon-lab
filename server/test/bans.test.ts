import { describe, expect, it } from 'vitest'
import {
  createAccount,
  createSession,
  getSessionUser,
  verifyCredentials,
} from '../src/accounts/service'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { banUser, isUserBanned, unbanUser } from '../src/moderation/bans'

async function dbWithUser() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  const user = await createAccount(
    db,
    { email: 'user@test.com', displayName: 'User', password: 'hunter22hunter22' },
    () => 1,
  )
  if (user === 'email-taken') throw new Error('seed user unexpectedly exists')
  return { db, user }
}

describe('user bans', () => {
  it('bans a user, revokes sessions, blocks login, then unbans', async () => {
    const { db, user } = await dbWithUser()
    const token = createSession(db, user.id, () => 10)

    expect(banUser(db, user.id, 'admin', 'spam', () => 100)).toBe(true)
    expect(isUserBanned(db, user.id)).toBe(true)
    expect(getSessionUser(db, token, () => 200)).toBeNull()
    expect(await verifyCredentials(db, 'user@test.com', 'hunter22hunter22')).toBeNull()

    expect(unbanUser(db, user.id, 'admin', () => 300)).toBe(true)
    expect(isUserBanned(db, user.id)).toBe(false)
    expect(await verifyCredentials(db, 'user@test.com', 'hunter22hunter22')).toEqual(
      expect.objectContaining({ id: user.id, email: 'user@test.com' }),
    )
  })

  it('does not resolve an existing session if the user is banned before revocation runs', async () => {
    const { db, user } = await dbWithUser()
    const token = createSession(db, user.id, () => 10)
    db.prepare('UPDATE users SET banned_at = ?, banned_reason = ? WHERE id = ?').run(
      100,
      'race',
      user.id,
    )

    expect(getSessionUser(db, token, () => 200)).toBeNull()
  })
})

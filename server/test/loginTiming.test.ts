import { describe, expect, it, vi } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { verifyCredentials } from '../src/accounts/service'
import { verifyPassword } from '../src/accounts/passwords'

vi.mock('../src/accounts/passwords', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn().mockResolvedValue(false),
}))

describe('login timing equalization', () => {
  it('runs a password verifier even when the email is unknown', async () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)

    await expect(verifyCredentials(db, 'ghost@example.com', 'candidate-password')).resolves.toBeNull()

    expect(verifyPassword).toHaveBeenCalledTimes(1)
  })
})

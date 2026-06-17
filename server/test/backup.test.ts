import { mkdtempSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { backupDatabase } from '../src/ops/backup'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
  tempDirs.length = 0
})

describe('backupDatabase', () => {
  it('creates a readable SQLite copy with matching data', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vsl-backup-'))
    tempDirs.push(dir)
    const srcPath = join(dir, 'source.sqlite')
    const destPath = join(dir, 'backup.sqlite')
    const source = openDatabase(srcPath)
    runMigrations(source, migrations)
    source
      .prepare(
        'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
      )
      .run('u1', 'ada@example.com', 'Ada', 'hash', 0, 0)

    await backupDatabase(srcPath, destPath)

    const backup = openDatabase(destPath)
    expect(backup.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 1 })
    source.close()
    backup.close()
  })
})

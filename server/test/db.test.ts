import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../src/db'

describe('openDatabase', () => {
  let dir: string

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('creates missing parent directories and the database file', () => {
    dir = mkdtempSync(join(tmpdir(), 'vsl-db-'))
    const dbPath = join(dir, 'nested', 'vsl.sqlite')
    const db = openDatabase(dbPath)
    expect(existsSync(dbPath)).toBe(true)
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal')
    db.close()
  })
})

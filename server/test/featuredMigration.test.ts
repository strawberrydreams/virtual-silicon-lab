import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

describe('011_featured', () => {
  it('adds featured_at to published chips and indexes it', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    const columns = (
      db.prepare('PRAGMA table_info(published_chips)').all() as { name: string }[]
    ).map((column) => column.name)

    expect(columns).toContain('featured_at')
    expect(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_published_chips_featured'",
        )
        .get(),
    ).toBeDefined()
  })
})

import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import {
  deleteSyncedProject,
  listSyncedProjectsSince,
  pushSyncedProject,
} from '../src/sync/service'

function freshDb() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('u1', 'a@b.c', 'A', 'h', 1, 1)
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('u2', 'b@b.c', 'B', 'h', 1, 1)
  return db
}

describe('sync service', () => {
  it('pushes a new project and reads it back', () => {
    const db = freshDb()
    const record = pushSyncedProject(db, 'u1', 'p1', '{"id":"p1"}', 100)
    expect(record).toEqual({
      projectId: 'p1',
      projectJson: '{"id":"p1"}',
      updatedAt: 100,
      deleted: false,
    })
  })

  it('accepts a push with a newer updatedAt and overwrites the json', () => {
    const db = freshDb()
    pushSyncedProject(db, 'u1', 'p1', '{"v":1}', 100)
    const record = pushSyncedProject(db, 'u1', 'p1', '{"v":2}', 200)
    expect(record).toEqual({
      projectId: 'p1',
      projectJson: '{"v":2}',
      updatedAt: 200,
      deleted: false,
    })
  })

  it('rejects a push with an older updatedAt (last-write-wins) and returns the stored winner', () => {
    const db = freshDb()
    pushSyncedProject(db, 'u1', 'p1', '{"v":2}', 200)
    const record = pushSyncedProject(db, 'u1', 'p1', '{"v":1}', 100)
    expect(record).toEqual({
      projectId: 'p1',
      projectJson: '{"v":2}',
      updatedAt: 200,
      deleted: false,
    })
  })

  it('tombstones a project on delete and clears the tombstone on a newer push', () => {
    const db = freshDb()
    pushSyncedProject(db, 'u1', 'p1', '{"v":1}', 100)
    const deleted = deleteSyncedProject(db, 'u1', 'p1', 150)
    expect(deleted.deleted).toBe(true)
    expect(deleted.updatedAt).toBe(150)
    const revived = pushSyncedProject(db, 'u1', 'p1', '{"v":3}', 200)
    expect(revived).toEqual({
      projectId: 'p1',
      projectJson: '{"v":3}',
      updatedAt: 200,
      deleted: false,
    })
  })

  it('creates a tombstone even when the project was never pushed', () => {
    const db = freshDb()
    const deleted = deleteSyncedProject(db, 'u1', 'ghost', 50)
    expect(deleted).toEqual({
      projectId: 'ghost',
      projectJson: '',
      updatedAt: 50,
      deleted: true,
    })
  })

  it('lists only rows changed strictly after since, ascending', () => {
    const db = freshDb()
    pushSyncedProject(db, 'u1', 'p1', '{"v":1}', 100)
    pushSyncedProject(db, 'u1', 'p2', '{"v":1}', 200)
    pushSyncedProject(db, 'u1', 'p3', '{"v":1}', 300)
    const since150 = listSyncedProjectsSince(db, 'u1', 150).map((r) => r.projectId)
    expect(since150).toEqual(['p2', 'p3'])
    const all = listSyncedProjectsSince(db, 'u1', 0).map((r) => r.projectId)
    expect(all).toEqual(['p1', 'p2', 'p3'])
  })

  it('scopes every read and write to the given user', () => {
    const db = freshDb()
    pushSyncedProject(db, 'u1', 'p1', '{"owner":"u1"}', 100)
    pushSyncedProject(db, 'u2', 'p1', '{"owner":"u2"}', 100)
    expect(listSyncedProjectsSince(db, 'u2', 0)).toEqual([
      { projectId: 'p1', projectJson: '{"owner":"u2"}', updatedAt: 100, deleted: false },
    ])
    // u2 deleting its p1 must not affect u1's p1
    deleteSyncedProject(db, 'u2', 'p1', 300)
    const u1 = listSyncedProjectsSince(db, 'u1', 0)
    expect(u1).toEqual([
      { projectId: 'p1', projectJson: '{"owner":"u1"}', updatedAt: 100, deleted: false },
    ])
  })

  it('rejects a stale delete (older deletedAt) and leaves the newer row intact', () => {
    const db = freshDb()
    pushSyncedProject(db, 'u1', 'p1', '{"v":2}', 200)
    const result = deleteSyncedProject(db, 'u1', 'p1', 100)
    expect(result).toEqual({
      projectId: 'p1',
      projectJson: '{"v":2}',
      updatedAt: 200,
      deleted: false,
    })
  })
})

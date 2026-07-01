import type Database from 'better-sqlite3'

export type SyncedProjectRecord = {
  projectId: string
  projectJson: string
  updatedAt: number
  deleted: boolean
}

type SyncedProjectRow = {
  project_id: string
  project_json: string
  updated_at: number
  deleted_at: number | null
}

const SELECT_ONE =
  'SELECT project_id, project_json, updated_at, deleted_at FROM synced_projects WHERE user_id = ? AND project_id = ?'

function mapRow(row: SyncedProjectRow): SyncedProjectRecord {
  return {
    projectId: row.project_id,
    projectJson: row.project_json,
    updatedAt: row.updated_at,
    deleted: row.deleted_at !== null,
  }
}

export function listSyncedProjectsSince(
  db: Database.Database,
  userId: string,
  since: number,
): SyncedProjectRecord[] {
  const rows = db
    .prepare(
      'SELECT project_id, project_json, updated_at, deleted_at FROM synced_projects WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC',
    )
    .all(userId, since) as SyncedProjectRow[]
  return rows.map(mapRow)
}

export function pushSyncedProject(
  db: Database.Database,
  userId: string,
  projectId: string,
  projectJson: string,
  updatedAt: number,
): SyncedProjectRecord {
  const existing = db.prepare(SELECT_ONE).get(userId, projectId) as SyncedProjectRow | undefined
  if (existing === undefined || updatedAt >= existing.updated_at) {
    db.prepare(
      `INSERT INTO synced_projects (user_id, project_id, project_json, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, NULL)
       ON CONFLICT(user_id, project_id)
       DO UPDATE SET project_json = excluded.project_json, updated_at = excluded.updated_at, deleted_at = NULL`,
    ).run(userId, projectId, projectJson, updatedAt)
  }
  return mapRow(db.prepare(SELECT_ONE).get(userId, projectId) as SyncedProjectRow)
}

export function deleteSyncedProject(
  db: Database.Database,
  userId: string,
  projectId: string,
  deletedAt: number,
): SyncedProjectRecord {
  const existing = db.prepare(SELECT_ONE).get(userId, projectId) as SyncedProjectRow | undefined
  if (existing === undefined) {
    db.prepare(
      `INSERT INTO synced_projects (user_id, project_id, project_json, updated_at, deleted_at)
       VALUES (?, ?, '', ?, ?)`,
    ).run(userId, projectId, deletedAt, deletedAt)
  } else if (deletedAt >= existing.updated_at) {
    db.prepare(
      'UPDATE synced_projects SET updated_at = ?, deleted_at = ? WHERE user_id = ? AND project_id = ?',
    ).run(deletedAt, deletedAt, userId, projectId)
  }
  return mapRow(db.prepare(SELECT_ONE).get(userId, projectId) as SyncedProjectRow)
}

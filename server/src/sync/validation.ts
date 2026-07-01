export type SyncPushValidation =
  | { ok: true; projectJson: string; updatedAt: number }
  | { ok: false; message: string }

export function validateSyncPush(body: unknown, urlProjectId: string): SyncPushValidation {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'Body must be a project object.' }
  }
  const record = body as Record<string, unknown>
  if (record.id !== urlProjectId) {
    return { ok: false, message: 'Project id must match the URL.' }
  }
  if (typeof record.updatedAt !== 'number' || !Number.isFinite(record.updatedAt)) {
    return { ok: false, message: 'Project updatedAt must be a finite number.' }
  }
  return { ok: true, projectJson: JSON.stringify(body), updatedAt: record.updatedAt }
}

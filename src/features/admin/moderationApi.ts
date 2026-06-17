export type AdminReport = {
  id: string
  publishedChipId: string
  reporterUserId: string | null
  reason: string | null
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: number
  resolvedAt: number | null
  resolvedBy: string | null
  chipSlug: string
  chipTitle: string
}

export type ModerationChip = {
  id: string
  slug: string
  title: string
  ownerDisplayName: string
  ownerUserId: string
  ownerBannedAt: number | null
  isPublic: boolean
  moderationStatus: 'visible' | 'hidden'
  updatedAt: number
}

export type CommentReport = {
  id: string
  commentId: string
  commentBody: string
  commentAuthorDisplayName: string
  commentAuthorUserId: string
  chipSlug: string
  chipTitle: string
  reason: string | null
  createdAt: number
}

export type AuditEntry = {
  id: string
  adminUserId: string | null
  action: string
  targetType: string
  targetId: string
  detail: string | null
  createdAt: number
}

export type ModerationApi = {
  listReports: (status: 'open' | 'resolved' | 'dismissed') => Promise<AdminReport[]>
  resolveReport: (id: string, status: 'resolved' | 'dismissed') => Promise<void>
  listChips: () => Promise<ModerationChip[]>
  hideChip: (id: string, reason?: string) => Promise<void>
  unhideChip: (id: string) => Promise<void>
  deleteChip: (id: string) => Promise<void>
  featureChip: (id: string) => Promise<void>
  unfeatureChip: (id: string) => Promise<void>
  listCommentReports: () => Promise<CommentReport[]>
  hideComment: (id: string) => Promise<void>
  banUser: (id: string, reason?: string) => Promise<void>
  unbanUser: (id: string) => Promise<void>
  listAudit: () => Promise<AuditEntry[]>
}

async function ok(res: Response): Promise<Response> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? `Request failed (${res.status}).`)
  }
  return res
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

export const liveModerationApi: ModerationApi = {
  async listReports(status) {
    const res = await ok(await fetch(`/api/admin/reports?status=${status}`, { method: 'GET' }))
    return ((await res.json()) as { reports: AdminReport[] }).reports
  },
  async resolveReport(id, status) {
    await ok(await fetch(`/api/admin/reports/${id}`, jsonInit('PATCH', { status })))
  },
  async listChips() {
    const res = await ok(await fetch('/api/admin/published-chips', { method: 'GET' }))
    return ((await res.json()) as { chips: ModerationChip[] }).chips
  },
  async hideChip(id, reason) {
    await ok(
      await fetch(
        `/api/admin/published-chips/${id}/hide`,
        jsonInit('POST', { reason: reason ?? null }),
      ),
    )
  },
  async unhideChip(id) {
    await ok(await fetch(`/api/admin/published-chips/${id}/unhide`, jsonInit('POST', {})))
  },
  async deleteChip(id) {
    await ok(await fetch(`/api/admin/published-chips/${id}`, { method: 'DELETE' }))
  },
  async featureChip(id) {
    await ok(await fetch(`/api/admin/published-chips/${id}/feature`, { method: 'POST' }))
  },
  async unfeatureChip(id) {
    await ok(await fetch(`/api/admin/published-chips/${id}/unfeature`, { method: 'POST' }))
  },
  async listCommentReports() {
    const res = await ok(await fetch('/api/admin/comment-reports', { method: 'GET' }))
    return ((await res.json()) as { reports: CommentReport[] }).reports
  },
  async hideComment(id) {
    await ok(await fetch(`/api/admin/comments/${id}/hide`, { method: 'POST' }))
  },
  async banUser(id, reason) {
    await ok(await fetch(`/api/admin/users/${id}/ban`, jsonInit('POST', { reason: reason ?? null })))
  },
  async unbanUser(id) {
    await ok(await fetch(`/api/admin/users/${id}/unban`, { method: 'POST' }))
  },
  async listAudit() {
    const res = await ok(await fetch('/api/admin/audit-log', { method: 'GET' }))
    return ((await res.json()) as { entries: AuditEntry[] }).entries
  },
}

import type { Project } from '../../domain/project'

export type SyncedProjectDto = {
  projectId: string
  updatedAt: number
  deleted: boolean
  project: Project | null
}

export class SyncApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'SyncApiError'
  }
}

export class ServerUnreachableError extends Error {
  constructor() {
    super('Sync server is unreachable.')
    this.name = 'ServerUnreachableError'
  }
}

export type SyncApi = {
  pull: (since: number) => Promise<SyncedProjectDto[]>
  push: (project: Project) => Promise<SyncedProjectDto>
  remove: (projectId: string) => Promise<SyncedProjectDto>
}

// A proxy in front of a down API server answers with a gateway error instead of
// failing the fetch, so both paths map to "unreachable".
const GATEWAY_ERROR_STATUSES = new Set([502, 503, 504])

async function request(path: string, init?: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await fetch(path, init)
  } catch {
    throw new ServerUnreachableError()
  }
  if (GATEWAY_ERROR_STATUSES.has(res.status)) throw new ServerUnreachableError()
  return res
}

async function toApiError(res: Response): Promise<SyncApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    if (typeof body.error?.code === 'string' && typeof body.error.message === 'string') {
      return new SyncApiError(body.error.code, body.error.message)
    }
  } catch {
    // non-JSON body falls through to the generic error
  }
  return new SyncApiError('UNKNOWN', `Request failed (${res.status}).`)
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

function normalizeSince(since: number): number {
  return Number.isFinite(since) ? Math.max(0, Math.floor(since)) : 0
}

export const liveSyncApi: SyncApi = {
  async pull(since) {
    const res = await request(`/api/sync/projects?since=${normalizeSince(since)}`)
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { projects: SyncedProjectDto[] }
    return body.projects
  },
  async push(project) {
    const res = await request(
      `/api/sync/projects/${encodeURIComponent(project.id)}`,
      jsonInit('PUT', project),
    )
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { project: SyncedProjectDto }
    return body.project
  },
  async remove(projectId) {
    const res = await request(`/api/sync/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { project: SyncedProjectDto }
    return body.project
  },
}

import type { Project } from '../../domain/project'

export type PublishedChip = {
  id: string
  ownerUserId: string
  sourceProjectId: string
  slug: string
  title: string
  dieImageUrl: string
  posterImageUrl: string
  isPublic: boolean
  shareUrl: string | null
  version: number
  createdAt: number
  updatedAt: number
  publishedAt: number
}

export type PublishInput = {
  project: Project
  title: string
  dieImageDataUrl: string
  posterImageDataUrl: string
  isPublic: boolean
}

export class PublishApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'PublishApiError'
  }
}

export class ServerUnreachableError extends Error {
  constructor() {
    super('Share server is unreachable.')
    this.name = 'ServerUnreachableError'
  }
}

export type PublishApi = {
  getForProject: (projectId: string) => Promise<PublishedChip | null>
  publish: (input: PublishInput) => Promise<PublishedChip>
  setVisibility: (projectId: string, isPublic: boolean) => Promise<PublishedChip>
  unpublish: (projectId: string) => Promise<void>
}

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

async function toApiError(res: Response): Promise<PublishApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    if (typeof body.error?.code === 'string' && typeof body.error.message === 'string') {
      return new PublishApiError(body.error.code, body.error.message)
    }
  } catch {
    // non-JSON body falls through to the generic error
  }
  return new PublishApiError('UNKNOWN', `Request failed (${res.status}).`)
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

async function expectChip(res: Response): Promise<PublishedChip> {
  if (!res.ok) throw await toApiError(res)
  const body = (await res.json()) as { chip: PublishedChip }
  return body.chip
}

async function expectOk(res: Response): Promise<void> {
  if (!res.ok) throw await toApiError(res)
}

export const livePublishApi: PublishApi = {
  async getForProject(projectId) {
    const res = await request(`/api/published-chips/source/${encodeURIComponent(projectId)}`)
    if (res.status === 404) return null
    return expectChip(res)
  },
  async publish(input) {
    return expectChip(await request('/api/published-chips', jsonInit('POST', input)))
  },
  async setVisibility(projectId, isPublic) {
    return expectChip(
      await request(
        `/api/published-chips/source/${encodeURIComponent(projectId)}`,
        jsonInit('PATCH', { isPublic }),
      ),
    )
  },
  async unpublish(projectId) {
    await expectOk(
      await request(`/api/published-chips/source/${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
      }),
    )
  },
}

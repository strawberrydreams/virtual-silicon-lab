import type { Project } from '../../domain/project'

export type GallerySort = 'trending' | 'top' | 'newest'

export type GalleryChipSummary = {
  id: string
  slug: string
  title: string
  ownerDisplayName: string
  dieImageUrl: string
  posterImageUrl: string
  version: number
  updatedAt: number
  publishedAt: number
  likeCount: number
}

export type GalleryChipDetail = GalleryChipSummary & {
  commentCount: number
  likedByMe: boolean
  project: Project
}

export class GalleryApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'GalleryApiError'
  }
}

export class ServerUnreachableError extends Error {
  constructor() {
    super('Share server is unreachable.')
    this.name = 'ServerUnreachableError'
  }
}

export type GalleryApi = {
  list: (sort?: GallerySort) => Promise<GalleryChipSummary[]>
  get: (slug: string) => Promise<GalleryChipDetail | null>
}

const GATEWAY_ERROR_STATUSES = new Set([502, 503, 504])

async function request(path: string): Promise<Response> {
  let res: Response
  try {
    res = await fetch(path)
  } catch {
    throw new ServerUnreachableError()
  }
  if (GATEWAY_ERROR_STATUSES.has(res.status)) throw new ServerUnreachableError()
  return res
}

async function toApiError(res: Response): Promise<GalleryApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    if (typeof body.error?.code === 'string' && typeof body.error.message === 'string') {
      return new GalleryApiError(body.error.code, body.error.message)
    }
  } catch {
    // non-JSON body falls through to the generic error
  }
  return new GalleryApiError('UNKNOWN', `Request failed (${res.status}).`)
}

export const liveGalleryApi: GalleryApi = {
  async list(sort) {
    const res = await request(sort === undefined ? '/api/gallery' : `/api/gallery?sort=${sort}`)
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { chips: GalleryChipSummary[] }
    return body.chips
  },
  async get(slug) {
    const res = await request(`/api/gallery/${encodeURIComponent(slug)}`)
    if (res.status === 404) return null
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { chip: GalleryChipDetail }
    return body.chip
  },
}

export type LikeState = { likeCount: number; likedByMe: boolean }

export type GalleryComment = {
  id: string
  publishedChipId: string
  authorUserId: string
  authorDisplayName: string
  body: string
  createdAt: number
}

export type ReactionsApi = {
  like: (chipId: string) => Promise<LikeState>
  unlike: (chipId: string) => Promise<LikeState>
  listComments: (chipId: string) => Promise<GalleryComment[]>
  createComment: (chipId: string, body: string) => Promise<GalleryComment>
  deleteComment: (chipId: string, commentId: string) => Promise<void>
  reportChip: (chipId: string, reason: string) => Promise<void>
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

export const liveReactionsApi: ReactionsApi = {
  async like(chipId) {
    const res = await ok(await fetch(`/api/published-chips/${chipId}/like`, { method: 'POST' }))
    return (await res.json()) as LikeState
  },
  async unlike(chipId) {
    const res = await ok(await fetch(`/api/published-chips/${chipId}/like`, { method: 'DELETE' }))
    return (await res.json()) as LikeState
  },
  async listComments(chipId) {
    const res = await ok(await fetch(`/api/published-chips/${chipId}/comments`, { method: 'GET' }))
    return ((await res.json()) as { comments: GalleryComment[] }).comments
  },
  async createComment(chipId, body) {
    const res = await ok(await fetch(`/api/published-chips/${chipId}/comments`, jsonInit('POST', { body })))
    return ((await res.json()) as { comment: GalleryComment }).comment
  },
  async deleteComment(chipId, commentId) {
    await ok(await fetch(`/api/published-chips/${chipId}/comments/${commentId}`, { method: 'DELETE' }))
  },
  async reportChip(chipId, reason) {
    await ok(await fetch('/api/reports', jsonInit('POST', { publishedChipId: chipId, reason })))
  },
}

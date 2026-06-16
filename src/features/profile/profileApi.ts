import type { AuthUser } from '../account/authApi'

export type PublicProfileChip = {
  slug: string
  title: string
  posterImageUrl: string
}

export type PublicProfile = {
  handle: string
  displayName: string
  chips: PublicProfileChip[]
}

export class ProfileApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ProfileApiError'
  }
}

export type ProfileApi = {
  get: (handle: string) => Promise<PublicProfile | null>
  setHandle: (handle: string) => Promise<AuthUser>
}

async function toApiError(res: Response): Promise<ProfileApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    if (typeof body.error?.code === 'string' && typeof body.error.message === 'string') {
      return new ProfileApiError(body.error.code, body.error.message)
    }
  } catch {
    // non-JSON body falls through
  }
  return new ProfileApiError('UNKNOWN', `Request failed (${res.status}).`)
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

export const liveProfileApi: ProfileApi = {
  async get(handle) {
    const res = await fetch(`/api/profiles/${encodeURIComponent(handle)}`)
    if (res.status === 404) return null
    if (!res.ok) throw await toApiError(res)
    return ((await res.json()) as { profile: PublicProfile }).profile
  },
  async setHandle(handle) {
    const res = await fetch('/api/me/handle', jsonInit('PATCH', { handle }))
    if (!res.ok) throw await toApiError(res)
    return ((await res.json()) as { user: AuthUser }).user
  },
}

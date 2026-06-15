export type ContestStatus = 'draft' | 'submission' | 'voting' | 'results'

export type ContestSummary = {
  id: string
  title: string
  theme: string
  status: ContestStatus
  entryCount: number
  voteCount: number
  createdAt: number
}

export type ContestEntry = {
  entryId: string
  publishedChipId: string
  slug: string
  title: string
  ownerDisplayName: string
  posterImageUrl: string
  voteCount: number
  rank: number
}

export type ContestDetail = {
  id: string
  title: string
  theme: string
  status: ContestStatus
  createdAt: number
  entries: ContestEntry[]
  myEntryId: string | null
  myVoteEntryId: string | null
}

export type MyChip = {
  id: string
  slug: string
  title: string
  posterImageUrl: string
}

export type ContestsApi = {
  list: () => Promise<ContestSummary[]>
  get: (id: string) => Promise<ContestDetail>
  enter: (contestId: string, publishedChipId: string) => Promise<void>
  withdraw: (contestId: string, entryId: string) => Promise<void>
  vote: (contestId: string, entryId: string) => Promise<void>
  unvote: (contestId: string) => Promise<void>
  listMyChips: () => Promise<MyChip[]>
  create: (input: { title: string; theme: string }) => Promise<{ id: string }>
  setStatus: (id: string, status: ContestStatus) => Promise<void>
  remove: (id: string) => Promise<void>
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

export const liveContestsApi: ContestsApi = {
  async list() {
    const res = await ok(await fetch('/api/contests', { method: 'GET' }))
    return ((await res.json()) as { contests: ContestSummary[] }).contests
  },
  async get(id) {
    const res = await ok(await fetch(`/api/contests/${id}`, { method: 'GET' }))
    return ((await res.json()) as { contest: ContestDetail }).contest
  },
  async enter(contestId, publishedChipId) {
    await ok(
      await fetch(`/api/contests/${contestId}/entries`, jsonInit('POST', { publishedChipId })),
    )
  },
  async withdraw(contestId, entryId) {
    await ok(await fetch(`/api/contests/${contestId}/entries/${entryId}`, { method: 'DELETE' }))
  },
  async vote(contestId, entryId) {
    await ok(await fetch(`/api/contests/${contestId}/vote`, jsonInit('POST', { entryId })))
  },
  async unvote(contestId) {
    await ok(await fetch(`/api/contests/${contestId}/vote`, { method: 'DELETE' }))
  },
  async listMyChips() {
    const res = await ok(await fetch('/api/published-chips/mine', { method: 'GET' }))
    return ((await res.json()) as { chips: MyChip[] }).chips
  },
  async create(input) {
    const res = await ok(await fetch('/api/admin/contests', jsonInit('POST', input)))
    return ((await res.json()) as { contest: { id: string } }).contest
  },
  async setStatus(id, status) {
    await ok(await fetch(`/api/admin/contests/${id}`, jsonInit('PATCH', { status })))
  },
  async remove(id) {
    await ok(await fetch(`/api/admin/contests/${id}`, { method: 'DELETE' }))
  },
}

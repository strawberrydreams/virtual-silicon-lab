export type InviteCode = {
  code: string
  createdBy: string | null
  maxUses: number
  usedCount: number
  expiresAt: number | null
  note: string | null
  createdAt: number
}

export type CreateInviteInput = {
  maxUses: number
  expiresAt?: number | null
  note?: string | null
}

export type InviteApi = {
  list: () => Promise<InviteCode[]>
  create: (input: CreateInviteInput) => Promise<InviteCode>
  revoke: (code: string) => Promise<void>
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

export const liveInviteApi: InviteApi = {
  async list() {
    const res = await ok(await fetch('/api/admin/invite-codes', { method: 'GET' }))
    return ((await res.json()) as { inviteCodes: InviteCode[] }).inviteCodes
  },
  async create(input) {
    const res = await ok(
      await fetch(
        '/api/admin/invite-codes',
        jsonInit('POST', {
          maxUses: input.maxUses,
          expiresAt: input.expiresAt ?? null,
          note: input.note ?? null,
        }),
      ),
    )
    return ((await res.json()) as { inviteCode: InviteCode }).inviteCode
  },
  async revoke(code) {
    await ok(await fetch(`/api/admin/invite-codes/${encodeURIComponent(code)}`, { method: 'DELETE' }))
  },
}

export type AuthUser = { id: string; email: string; displayName: string; createdAt: number }

export class AuthApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AuthApiError'
  }
}

export class ServerUnreachableError extends Error {
  constructor() {
    super('Share server is unreachable.')
    this.name = 'ServerUnreachableError'
  }
}

export type AuthApi = {
  me: () => Promise<AuthUser | null>
  signup: (input: { email: string; displayName: string; password: string }) => Promise<AuthUser>
  login: (input: { email: string; password: string }) => Promise<AuthUser>
  logout: () => Promise<void>
  updateDisplayName: (displayName: string) => Promise<AuthUser>
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>
  deleteAccount: (password: string) => Promise<void>
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, init)
  } catch {
    // Local-first: an absent share server is a normal state, surfaced as one error type.
    throw new ServerUnreachableError()
  }
}

async function toApiError(res: Response): Promise<AuthApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    if (typeof body.error?.code === 'string' && typeof body.error.message === 'string') {
      return new AuthApiError(body.error.code, body.error.message)
    }
  } catch {
    // non-JSON body falls through to the generic error
  }
  return new AuthApiError('UNKNOWN', `Request failed (${res.status}).`)
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

async function expectUser(res: Response): Promise<AuthUser> {
  if (!res.ok) throw await toApiError(res)
  const body = (await res.json()) as { user: AuthUser }
  return body.user
}

async function expectOk(res: Response): Promise<void> {
  if (!res.ok) throw await toApiError(res)
}

export const liveAuthApi: AuthApi = {
  async me() {
    const res = await request('/api/me')
    if (res.status === 401) return null
    return expectUser(res)
  },
  async signup(input) {
    return expectUser(await request('/api/auth/signup', jsonInit('POST', input)))
  },
  async login(input) {
    return expectUser(await request('/api/auth/login', jsonInit('POST', input)))
  },
  async logout() {
    await expectOk(await request('/api/auth/logout', { method: 'POST' }))
  },
  async updateDisplayName(displayName) {
    return expectUser(await request('/api/me', jsonInit('PATCH', { displayName })))
  },
  async changePassword(input) {
    await expectOk(await request('/api/me', jsonInit('PATCH', input)))
  },
  async deleteAccount(password) {
    await expectOk(await request('/api/me', jsonInit('DELETE', { password })))
  },
}

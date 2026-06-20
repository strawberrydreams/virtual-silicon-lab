import type { AiChipContext } from '../../domain/ai/aiSpecDraft'
import type { FakeSpec } from '../../domain/project'

export class AiApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AiApiError'
  }
}

export class AiServerUnreachableError extends Error {
  constructor() {
    super('AI server is unreachable.')
    this.name = 'AiServerUnreachableError'
  }
}

export type AiCopyApi = {
  generateCopy: (context: AiChipContext) => Promise<FakeSpec>
}

const GATEWAY_ERROR_STATUSES = new Set([502, 503, 504])

async function toApiError(res: Response): Promise<AiApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    if (typeof body.error?.code === 'string' && typeof body.error.message === 'string') {
      return new AiApiError(body.error.code, body.error.message)
    }
  } catch {
    // non-JSON body falls through to the generic error
  }
  return new AiApiError('UNKNOWN', `Request failed (${res.status}).`)
}

export const liveAiCopyApi: AiCopyApi = {
  async generateCopy(context) {
    let res: Response
    try {
      res = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context }),
      })
    } catch {
      throw new AiServerUnreachableError()
    }
    if (GATEWAY_ERROR_STATUSES.has(res.status)) throw new AiServerUnreachableError()
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { spec: FakeSpec }
    return body.spec
  },
}

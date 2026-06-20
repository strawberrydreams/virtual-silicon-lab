import type { Project } from '../../domain/project'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'

export type AiDraftApi = {
  generateDraft: (prompt: string) => Promise<Project>
}

const GATEWAY_ERROR_STATUSES = new Set([502, 503, 504])

async function toApiError(res: Response): Promise<AiApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    if (typeof body.error?.code === 'string' && typeof body.error.message === 'string') {
      return new AiApiError(body.error.code, body.error.message)
    }
  } catch {
    // Non-JSON bodies fall through to a stable generic error.
  }
  return new AiApiError('UNKNOWN', `Request failed (${res.status}).`)
}

export const liveAiDraftApi: AiDraftApi = {
  async generateDraft(prompt) {
    let res: Response
    try {
      res = await fetch('/api/ai/generate-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
    } catch {
      throw new AiServerUnreachableError()
    }
    if (GATEWAY_ERROR_STATUSES.has(res.status)) throw new AiServerUnreachableError()
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { project: Project }
    return body.project
  },
}

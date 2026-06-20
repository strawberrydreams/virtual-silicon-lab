import type { AiLayoutContext, AiLayoutSuggestion } from '../../domain/ai/aiLayoutSuggestion'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'

export type AiSuggestApi = {
  generateSuggestions: (context: AiLayoutContext) => Promise<AiLayoutSuggestion[]>
}

const GATEWAY_ERROR_STATUSES = new Set([502, 503, 504])

async function toApiError(res: Response): Promise<AiApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    if (typeof body.error?.code === 'string' && typeof body.error.message === 'string') {
      return new AiApiError(body.error.code, body.error.message)
    }
  } catch {
    // Non-JSON bodies fall through to the stable generic error.
  }
  return new AiApiError('UNKNOWN', `Request failed (${res.status}).`)
}

export const liveAiSuggestApi: AiSuggestApi = {
  async generateSuggestions(context) {
    let res: Response
    try {
      res = await fetch('/api/ai/suggest-layout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context }),
      })
    } catch {
      throw new AiServerUnreachableError()
    }
    if (GATEWAY_ERROR_STATUSES.has(res.status)) throw new AiServerUnreachableError()
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { suggestions: AiLayoutSuggestion[] }
    return body.suggestions
  },
}

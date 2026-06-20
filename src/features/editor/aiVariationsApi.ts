import type { AiVariationContext } from '../../domain/ai/aiVariationContext'
import type { Project } from '../../domain/project'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'

export { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'

export type AiVariationsApi = {
  generateVariations: (context: AiVariationContext, count: number) => Promise<Project[]>
}

const GATEWAY_ERROR_STATUSES = new Set([502, 503, 504])

async function toApiError(response: Response): Promise<AiApiError> {
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } }
    if (typeof body.error?.code === 'string' && typeof body.error.message === 'string') {
      return new AiApiError(body.error.code, body.error.message)
    }
  } catch {
    // Non-JSON bodies fall through to the generic error.
  }
  return new AiApiError('UNKNOWN', `Request failed (${response.status}).`)
}

export const liveAiVariationsApi: AiVariationsApi = {
  async generateVariations(context, count) {
    let response: Response
    try {
      response = await fetch('/api/ai/generate-variations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context, count }),
      })
    } catch {
      throw new AiServerUnreachableError()
    }
    if (GATEWAY_ERROR_STATUSES.has(response.status)) throw new AiServerUnreachableError()
    if (!response.ok) throw await toApiError(response)
    const body = (await response.json()) as { variations: Project[] }
    return body.variations
  },
}

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiLayoutContext } from '../../domain/ai/aiLayoutSuggestion'
import { AiServerUnreachableError } from '../specs/aiCopyApi'
import { liveAiSuggestApi } from './aiSuggestApi'

const context: AiLayoutContext = { dieShape: 'rect', blocks: [] }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('liveAiSuggestApi.generateSuggestions', () => {
  it('POSTs the context and returns the suggestions on success', async () => {
    const suggestions = [{ type: 'Cache', x: 0.5, y: 0.5, w: 0.2, h: 0.2 }]
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ suggestions }), { status: 200 }),
    )
    const result = await liveAiSuggestApi.generateSuggestions(context)
    expect(result).toEqual(suggestions)
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/ai/suggest-layout')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ context })
  })

  it('maps an error body to AiApiError with its code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'too many' } }), {
        status: 429,
      }),
    )
    await expect(liveAiSuggestApi.generateSuggestions(context)).rejects.toMatchObject({
      name: 'AiApiError',
      code: 'QUOTA_EXCEEDED',
    })
  })

  it('throws AiServerUnreachableError when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))
    await expect(liveAiSuggestApi.generateSuggestions(context)).rejects.toBeInstanceOf(
      AiServerUnreachableError,
    )
  })

  it('throws AiServerUnreachableError on a gateway status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }))
    await expect(liveAiSuggestApi.generateSuggestions(context)).rejects.toBeInstanceOf(
      AiServerUnreachableError,
    )
  })
})

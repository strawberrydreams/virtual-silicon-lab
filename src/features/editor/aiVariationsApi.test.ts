import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiVariationContext } from '../../domain/ai/aiVariationContext'
import { AiServerUnreachableError, liveAiVariationsApi } from './aiVariationsApi'

const context: AiVariationContext = {
  name: 'X',
  theme: 'neon',
  dieShape: 'rect',
  blocks: [],
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('liveAiVariationsApi.generateVariations', () => {
  it('POSTs the context and count and returns variations on success', async () => {
    const variations = [{ id: 'a' }, { id: 'b' }]
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ variations }), { status: 200 }),
    )

    const result = await liveAiVariationsApi.generateVariations(context, 2)

    expect(result).toEqual(variations)
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/ai/generate-variations')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ context, count: 2 })
  })

  it('maps an error body to AiApiError with its code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'too many' } }), {
        status: 429,
      }),
    )

    await expect(liveAiVariationsApi.generateVariations(context, 3)).rejects.toMatchObject({
      name: 'AiApiError',
      code: 'QUOTA_EXCEEDED',
    })
  })

  it('throws AiServerUnreachableError when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))

    await expect(liveAiVariationsApi.generateVariations(context, 3)).rejects.toBeInstanceOf(
      AiServerUnreachableError,
    )
  })

  it('throws AiServerUnreachableError on a gateway status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }))

    await expect(liveAiVariationsApi.generateVariations(context, 3)).rejects.toBeInstanceOf(
      AiServerUnreachableError,
    )
  })
})

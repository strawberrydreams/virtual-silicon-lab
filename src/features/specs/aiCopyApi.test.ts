import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiChipContext } from '../../domain/ai/aiSpecDraft'
import { AiServerUnreachableError, liveAiCopyApi } from './aiCopyApi'

const context: AiChipContext = { theme: 'neon', dieShape: 'rect', blockTypes: ['CPU'] }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('liveAiCopyApi.generateCopy', () => {
  it('POSTs the context and returns the spec on success', async () => {
    const spec = { brand: 'X', series: 'Y', generation: 'g', process: 'p', cores: 4, bandwidth: 'b', features: [], description: 'd' }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ spec }), { status: 200 }),
    )
    const result = await liveAiCopyApi.generateCopy(context)
    expect(result).toEqual(spec)
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/ai/generate-copy')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ context })
  })

  it('maps an error body to AiApiError with its code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'too many' } }), {
        status: 429,
      }),
    )
    await expect(liveAiCopyApi.generateCopy(context)).rejects.toMatchObject({
      name: 'AiApiError',
      code: 'QUOTA_EXCEEDED',
    })
  })

  it('throws AiServerUnreachableError when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))
    await expect(liveAiCopyApi.generateCopy(context)).rejects.toBeInstanceOf(AiServerUnreachableError)
  })

  it('throws AiServerUnreachableError on a gateway status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }))
    await expect(liveAiCopyApi.generateCopy(context)).rejects.toBeInstanceOf(AiServerUnreachableError)
  })
})

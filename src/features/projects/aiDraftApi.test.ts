import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { AiServerUnreachableError } from '../specs/aiCopyApi'
import { liveAiDraftApi } from './aiDraftApi'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('liveAiDraftApi.generateDraft', () => {
  it('POSTs the prompt and returns the project on success', async () => {
    const project = createProject('Prompted', 'p1', 0)
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ project }), { status: 200 }),
    )
    const result = await liveAiDraftApi.generateDraft('a neon chip')
    expect(result).toEqual(project)
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/ai/generate-draft')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ prompt: 'a neon chip' })
  })

  it('maps an error body to AiApiError with its code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'too many' } }), {
        status: 429,
      }),
    )
    await expect(liveAiDraftApi.generateDraft('x')).rejects.toMatchObject({
      name: 'AiApiError',
      code: 'QUOTA_EXCEEDED',
    })
  })

  it('throws AiServerUnreachableError when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))
    await expect(liveAiDraftApi.generateDraft('x')).rejects.toBeInstanceOf(AiServerUnreachableError)
  })

  it('throws AiServerUnreachableError on a gateway status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }))
    await expect(liveAiDraftApi.generateDraft('x')).rejects.toBeInstanceOf(AiServerUnreachableError)
  })
})

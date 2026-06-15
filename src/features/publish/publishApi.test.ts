import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { ServerUnreachableError, livePublishApi } from './publishApi'

const chip = {
  id: 'pub1',
  ownerUserId: 'u1',
  sourceProjectId: 'project-1',
  slug: 'ada-chip-deadbeef',
  title: 'Ada Chip',
  dieImageUrl: 'data:image/png;base64,AAAA',
  posterImageUrl: 'data:image/png;base64,BBBB',
  isPublic: false,
  shareUrl: null,
  version: 1,
  createdAt: 1_000,
  updatedAt: 1_000,
  publishedAt: 0,
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('livePublishApi', () => {
  it('surfaces the server shareUrl for a public chip', async () => {
    const publicChip = { ...chip, isPublic: true, shareUrl: 'http://localhost/s/ada-chip-deadbeef' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { chip: publicChip })))

    const result = await livePublishApi.getForProject('project-1')
    expect(result?.shareUrl).toBe('http://localhost/s/ada-chip-deadbeef')
  })

  it('loads an existing publish record and returns null on 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { chip }))
        .mockResolvedValueOnce(
          jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'Nope.' } }),
        ),
    )

    expect(await livePublishApi.getForProject('project-1')).toEqual(chip)
    expect(await livePublishApi.getForProject('missing')).toBeNull()
  })

  it('publishes project JSON and PNG data URLs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { chip }))
    vi.stubGlobal('fetch', fetchMock)

    expect(
      await livePublishApi.publish({
        project: createProject('Ada Chip', 'project-1', 1_000),
        title: 'Ada Chip',
        dieImageDataUrl: 'data:image/png;base64,AAAA',
        posterImageDataUrl: 'data:image/png;base64,BBBB',
        isPublic: false,
      }),
    ).toEqual(chip)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/published-chips',
      expect.objectContaining({ method: 'POST', headers: { 'content-type': 'application/json' } }),
    )
  })

  it('maps server error bodies to PublishApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(400, { error: { code: 'INVALID_INPUT', message: 'Bad snapshot.' } }),
        ),
    )

    await expect(livePublishApi.setVisibility('project-1', true)).rejects.toMatchObject({
      name: 'PublishApiError',
      code: 'INVALID_INPUT',
      message: 'Bad snapshot.',
    })
  })

  it.each([502, 503, 504])('treats %i as an unreachable share server', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status })))
    await expect(livePublishApi.getForProject('project-1')).rejects.toThrowError(
      ServerUnreachableError,
    )
  })

  it('unpublishes with DELETE', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(livePublishApi.unpublish('project-1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/published-chips/source/project-1', {
      method: 'DELETE',
    })
  })
})

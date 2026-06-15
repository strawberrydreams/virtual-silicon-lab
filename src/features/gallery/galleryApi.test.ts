import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { GalleryApiError, liveGalleryApi, ServerUnreachableError } from './galleryApi'

const summary = {
  id: 'pub1',
  slug: 'ada-chip-deadbeef',
  title: 'Ada Chip',
  ownerDisplayName: 'Ada',
  dieImageUrl: 'data:image/png;base64,AAAA',
  posterImageUrl: 'data:image/png;base64,BBBB',
  version: 1,
  updatedAt: 2_000,
  publishedAt: 2_000,
}

const detail = { ...summary, project: createProject('Ada Chip', 'project-1', 1_000) }

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('liveGalleryApi', () => {
  it('lists public gallery chips', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { chips: [summary] })))

    expect(await liveGalleryApi.list()).toEqual([summary])
  })

  it('forwards the sort query param to the gallery endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { chips: [] }))
      .mockResolvedValueOnce(jsonResponse(200, { chips: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await liveGalleryApi.list('top')
    expect(fetchMock).toHaveBeenCalledWith('/api/gallery?sort=top')

    await liveGalleryApi.list()
    expect(fetchMock).toHaveBeenCalledWith('/api/gallery')
  })

  it('loads detail by slug and maps 404 to null', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { chip: detail }))
        .mockResolvedValueOnce(
          jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'Missing.' } }),
        ),
    )

    expect(await liveGalleryApi.get('ada-chip-deadbeef')).toEqual(detail)
    expect(await liveGalleryApi.get('missing')).toBeNull()
  })

  it('loads lineage by slug and maps 404 to null', async () => {
    const lineage = {
      ancestors: [
        { slug: 'parent', title: 'Parent', ownerDisplayName: 'Ada', posterImageUrl: '/p.png' },
      ],
      children: [],
      childCount: 0,
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, lineage))
      .mockResolvedValueOnce(
        jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'Missing.' } }),
      )
    vi.stubGlobal('fetch', fetchMock)

    expect(await liveGalleryApi.getLineage('child-slug')).toEqual(lineage)
    expect(fetchMock).toHaveBeenCalledWith('/api/gallery/child-slug/lineage')
    expect(await liveGalleryApi.getLineage('missing')).toBeNull()
  })

  it('maps server error bodies to GalleryApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(500, { error: { code: 'BROKEN', message: 'Gallery failed.' } }),
        ),
    )

    await expect(liveGalleryApi.list()).rejects.toMatchObject({
      name: 'GalleryApiError',
      code: 'BROKEN',
      message: 'Gallery failed.',
    })
  })

  it.each([502, 503, 504])('treats %i as an unreachable share server', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status })))
    await expect(liveGalleryApi.list()).rejects.toThrowError(ServerUnreachableError)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { liveSyncApi, ServerUnreachableError } from './syncApi'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('liveSyncApi.pull', () => {
  it('requests the delta and returns the projects array', async () => {
    const dto = {
      projectId: 'p1',
      updatedAt: 100,
      deleted: false,
      project: createProject('Chip', 'p1', 100),
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { projects: [dto] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await liveSyncApi.pull(150)

    expect(result).toEqual([dto])
    expect(fetchMock).toHaveBeenCalledWith('/api/sync/projects?since=150', undefined)
  })

  it('normalizes a negative, fractional, or non-finite since to a non-negative integer', async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(200, { projects: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await liveSyncApi.pull(-5)
    await liveSyncApi.pull(1.9)
    await liveSyncApi.pull(Number.NaN)

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/sync/projects?since=0',
      '/api/sync/projects?since=1',
      '/api/sync/projects?since=0',
    ])
  })

  it('throws a SyncApiError carrying the server error code on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } }),
        ),
    )

    await expect(liveSyncApi.pull(0)).rejects.toMatchObject({
      name: 'SyncApiError',
      code: 'UNAUTHORIZED',
    })
  })

  it('throws ServerUnreachableError when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')))
    await expect(liveSyncApi.pull(0)).rejects.toBeInstanceOf(ServerUnreachableError)
  })

  it('throws ServerUnreachableError on a gateway status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    await expect(liveSyncApi.pull(0)).rejects.toBeInstanceOf(ServerUnreachableError)
  })
})

describe('liveSyncApi.push', () => {
  it('PUTs the project to its id and returns the stored record', async () => {
    const project = createProject('Chip', 'p1', 200)
    const dto = { projectId: 'p1', updatedAt: 200, deleted: false, project }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { project: dto }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await liveSyncApi.push(project)

    expect(result).toEqual(dto)
    expect(fetchMock).toHaveBeenCalledWith('/api/sync/projects/p1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(project),
    })
  })

  it('throws a SyncApiError on a non-ok push response', async () => {
    const project = createProject('Chip', 'p1', 200)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(400, { error: { code: 'INVALID_INPUT', message: 'bad body' } }),
        ),
    )
    await expect(liveSyncApi.push(project)).rejects.toMatchObject({
      name: 'SyncApiError',
      code: 'INVALID_INPUT',
    })
  })
})

describe('liveSyncApi.remove', () => {
  it('DELETEs the project id and returns the tombstone record', async () => {
    const dto = { projectId: 'p1', updatedAt: 300, deleted: true, project: null }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { project: dto }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await liveSyncApi.remove('p1')

    expect(result).toEqual(dto)
    expect(fetchMock).toHaveBeenCalledWith('/api/sync/projects/p1', { method: 'DELETE' })
  })

  it('throws a SyncApiError on a non-ok remove response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } }),
        ),
    )
    await expect(liveSyncApi.remove('p1')).rejects.toMatchObject({
      name: 'SyncApiError',
      code: 'UNAUTHORIZED',
    })
  })
})

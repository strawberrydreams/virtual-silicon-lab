import { describe, expect, it, vi } from 'vitest'
import type { Project } from '../../domain/project'
import { createProject } from '../../domain/projectFactory'
import type { ProjectRepository } from '../../storage/projectRepository'
import type { SyncApi, SyncedProjectDto } from './syncApi'
import { ServerUnreachableError } from './syncApi'
import { createSyncingRepository, type SyncAuthGate } from './syncingRepository'

function memoryRepo(seed: Project[] = []): ProjectRepository {
  const byId = new Map(seed.map((p) => [p.id, p]))
  return {
    list: async () => [...byId.values()],
    get: async (id) => byId.get(id),
    save: async (p) => void byId.set(p.id, p),
    remove: async (id) => void byId.delete(id),
  }
}

function fakeApi(overrides: Partial<SyncApi> = {}): SyncApi {
  const dto = (p: Project): SyncedProjectDto => ({
    projectId: p.id,
    updatedAt: p.updatedAt,
    deleted: false,
    project: p,
  })
  return {
    pull: vi.fn(async () => []),
    push: vi.fn(async (p) => dto(p)),
    remove: vi.fn(async (id) => ({ projectId: id, updatedAt: 0, deleted: true, project: null })),
    ...overrides,
  }
}

describe('createSyncingRepository', () => {
  it('pushes to the server on save when authenticated', async () => {
    const local = memoryRepo()
    const api = fakeApi()
    const gate: SyncAuthGate = { authenticated: true }
    const repo = createSyncingRepository(local, api, gate)
    const project = createProject('Chip', 'p1', 100)

    await repo.save(project)

    expect(await local.get('p1')).toEqual(project)
    expect(api.push).toHaveBeenCalledWith(project)
  })

  it('tombstones on the server on remove when authenticated', async () => {
    const project = createProject('Chip', 'p1', 100)
    const local = memoryRepo([project])
    const api = fakeApi()
    const repo = createSyncingRepository(local, api, { authenticated: true })

    await repo.remove('p1')

    expect(await local.get('p1')).toBeUndefined()
    expect(api.remove).toHaveBeenCalledWith('p1')
  })

  it('does not call the server when anonymous', async () => {
    const local = memoryRepo()
    const api = fakeApi()
    const repo = createSyncingRepository(local, api, { authenticated: false })
    const project = createProject('Chip', 'p1', 100)

    await repo.save(project)
    await repo.remove('p1')

    expect(api.push).not.toHaveBeenCalled()
    expect(api.remove).not.toHaveBeenCalled()
    expect(await local.list()).toEqual([])
  })

  it('keeps the local write when the server push fails (offline is swallowed)', async () => {
    const local = memoryRepo()
    const api = fakeApi({
      push: vi.fn(async () => {
        throw new ServerUnreachableError()
      }),
    })
    const repo = createSyncingRepository(local, api, { authenticated: true })
    const project = createProject('Chip', 'p1', 100)

    await expect(repo.save(project)).resolves.toBeUndefined()
    expect(await local.get('p1')).toEqual(project)
  })

  it('passes list and get through to the local repository', async () => {
    const project = createProject('Chip', 'p1', 100)
    const local = memoryRepo([project])
    const repo = createSyncingRepository(local, fakeApi(), { authenticated: true })

    expect(await repo.list()).toEqual([project])
    expect(await repo.get('p1')).toEqual(project)
  })
})

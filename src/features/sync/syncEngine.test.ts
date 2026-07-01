import { describe, expect, it, vi } from 'vitest'
import type { Project } from '../../domain/project'
import { createProject } from '../../domain/projectFactory'
import type { ProjectRepository } from '../../storage/projectRepository'
import type { SyncApi, SyncedProjectDto } from './syncApi'
import { runSyncPass } from './syncEngine'

function memoryRepo(seed: Project[] = []): ProjectRepository {
  const byId = new Map(seed.map((p) => [p.id, p]))
  return {
    list: async () => [...byId.values()],
    get: async (id) => byId.get(id),
    save: async (p) => void byId.set(p.id, p),
    remove: async (id) => void byId.delete(id),
  }
}

function liveDto(p: Project): SyncedProjectDto {
  return { projectId: p.id, updatedAt: p.updatedAt, deleted: false, project: p }
}

function fakeApi(
  pullResult: SyncedProjectDto[],
  push: SyncApi['push'] = vi.fn(async (p: Project) => liveDto(p)),
): SyncApi {
  return {
    pull: vi.fn(async () => pullResult),
    push,
    remove: vi.fn(async (id) => ({ projectId: id, updatedAt: 0, deleted: true, project: null })),
  }
}

describe('runSyncPass', () => {
  it('applies a remote-only live project into the local repo', async () => {
    const remote = createProject('Remote', 'r1', 500)
    const local = memoryRepo()
    const api = fakeApi([liveDto(remote)])

    await runSyncPass(local, api)

    expect(await local.get('r1')).toEqual(remote)
    expect(api.pull).toHaveBeenCalledWith(0)
  })

  it('applies the server copy when it is newer than local', async () => {
    const localOld = createProject('Chip', 'p1', 100)
    const remoteNew = { ...createProject('Chip', 'p1', 300), name: 'Newer' }
    const local = memoryRepo([localOld])
    const api = fakeApi([liveDto(remoteNew)])

    await runSyncPass(local, api)

    expect(await local.get('p1')).toEqual(remoteNew)
  })

  it('pushes a local project that is newer than the server copy', async () => {
    const localNew = createProject('Chip', 'p1', 300)
    const remoteOld = createProject('Chip', 'p1', 100)
    const push = vi.fn(async (p: Project) => liveDto(p))
    const local = memoryRepo([localNew])
    const api = fakeApi([liveDto(remoteOld)], push)

    await runSyncPass(local, api)

    expect(push).toHaveBeenCalledWith(localNew)
  })

  it('removes a local project when the server has a newer tombstone', async () => {
    const localProject = createProject('Chip', 'p1', 100)
    const local = memoryRepo([localProject])
    const api = fakeApi([{ projectId: 'p1', updatedAt: 200, deleted: true, project: null }])

    await runSyncPass(local, api)

    expect(await local.get('p1')).toBeUndefined()
  })

  it('does nothing for an in-sync project (equal updatedAt)', async () => {
    const project = createProject('Chip', 'p1', 100)
    const push = vi.fn(async (p: Project) => liveDto(p))
    const local = memoryRepo([project])
    const api = fakeApi([liveDto(project)], push)

    await runSyncPass(local, api)

    expect(await local.get('p1')).toEqual(project)
    expect(push).not.toHaveBeenCalled()
  })
})

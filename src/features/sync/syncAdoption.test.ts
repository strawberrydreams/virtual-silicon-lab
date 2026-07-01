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

function inMemoryServer(seed: Project[] = []) {
  const rows = new Map<string, SyncedProjectDto>(
    seed.map((p) => [
      p.id,
      { projectId: p.id, updatedAt: p.updatedAt, deleted: false, project: p },
    ]),
  )
  const push = vi.fn(async (project: Project): Promise<SyncedProjectDto> => {
    const existing = rows.get(project.id)
    if (existing === undefined || project.updatedAt >= existing.updatedAt) {
      const stored: SyncedProjectDto = {
        projectId: project.id,
        updatedAt: project.updatedAt,
        deleted: false,
        project,
      }
      rows.set(project.id, stored)
      return stored
    }
    return existing
  })
  const remove = vi.fn(async (projectId: string): Promise<SyncedProjectDto> => {
    const existing = rows.get(projectId)
    const tombstone: SyncedProjectDto = {
      projectId,
      updatedAt: existing?.updatedAt ?? 0,
      deleted: true,
      project: null,
    }
    rows.set(projectId, tombstone)
    return tombstone
  })
  const pull = vi.fn(async () => [...rows.values()])
  const api: SyncApi = { pull, push, remove }
  return { api, rows, push, pull }
}

describe('first-login adoption', () => {
  it('uploads every anonymous local project on the first sync when the server is empty', async () => {
    const p1 = createProject('A', 'a1', 100)
    const p2 = createProject('B', 'b1', 200)
    const local = memoryRepo([p1, p2])
    const { api, push, rows } = inMemoryServer()

    await runSyncPass(local, api)

    expect(push.mock.calls.map((call) => call[0].id).sort()).toEqual(['a1', 'b1'])
    expect(rows.get('a1')?.project).toEqual(p1)
    expect(rows.get('b1')?.project).toEqual(p2)
    expect((await local.list()).map((p) => p.id).sort()).toEqual(['a1', 'b1'])
  })

  it('uploads local projects and applies server projects together, losing neither', async () => {
    const localOnly = createProject('Local', 'l1', 100)
    const serverOnly = createProject('Server', 's1', 500)
    const local = memoryRepo([localOnly])
    const { api, push } = inMemoryServer([serverOnly])

    await runSyncPass(local, api)

    expect(push).toHaveBeenCalledWith(localOnly)
    expect(await local.get('s1')).toEqual(serverOnly)
    expect(await local.get('l1')).toEqual(localOnly)
  })

  it('is idempotent: a second pass pushes nothing new and leaves local state stable', async () => {
    const p1 = createProject('A', 'a1', 100)
    const p2 = createProject('B', 'b1', 200)
    const local = memoryRepo([p1, p2])
    const { api, push } = inMemoryServer()

    await runSyncPass(local, api)
    const pushesAfterFirst = push.mock.calls.length
    await runSyncPass(local, api)

    expect(push.mock.calls.length).toBe(pushesAfterFirst)
    expect((await local.list()).map((p) => p.id).sort()).toEqual(['a1', 'b1'])
  })
})

import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../../domain/project'
import { createProject } from '../../domain/projectFactory'
import type { ProjectRepository } from '../../storage/projectRepository'
import { ProjectStoreProvider } from '../../stores/projectStoreContext'
import type { SyncApi, SyncedProjectDto } from './syncApi'
import { ServerUnreachableError } from './syncApi'
import { SyncEngine } from './syncEngine'
import type { SyncAuthGate } from './syncingRepository'
import { createSyncStatusStore } from './syncStatusStore'

const { authState } = vi.hoisted(() => ({ authState: { status: 'anonymous' as string } }))
vi.mock('../../stores/authStoreContext', () => ({
  useAuthStore: () => authState,
}))

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

afterEach(() => {
  authState.status = 'anonymous'
  vi.restoreAllMocks()
})

describe('SyncEngine', () => {
  it('does not sync while anonymous', () => {
    authState.status = 'anonymous'
    const local = memoryRepo()
    const api: SyncApi = { pull: vi.fn(async () => []), push: vi.fn(), remove: vi.fn() }
    const gate: SyncAuthGate = { authenticated: false }
    const statusStore = createSyncStatusStore()

    render(
      <ProjectStoreProvider repository={local}>
        <SyncEngine local={local} api={api} gate={gate} statusStore={statusStore} />
      </ProjectStoreProvider>,
    )

    expect(api.pull).not.toHaveBeenCalled()
    expect(gate.authenticated).toBe(false)
  })

  it('flips the gate and pulls remote projects into the store when authenticated', async () => {
    authState.status = 'authenticated'
    const remote = createProject('Remote', 'r1', 500)
    const local = memoryRepo()
    const api: SyncApi = {
      pull: vi.fn(async () => [liveDto(remote)]),
      push: vi.fn(),
      remove: vi.fn(),
    }
    const gate: SyncAuthGate = { authenticated: false }
    const statusStore = createSyncStatusStore()

    render(
      <ProjectStoreProvider repository={local}>
        <SyncEngine local={local} api={api} gate={gate} statusStore={statusStore} />
      </ProjectStoreProvider>,
    )

    await waitFor(() => expect(gate.authenticated).toBe(true))
    await waitFor(async () => expect(await local.get('r1')).toEqual(remote))
    expect(api.pull).toHaveBeenCalledWith(0)
  })
})

describe('SyncEngine status', () => {
  it('reports synced after a successful pass', async () => {
    authState.status = 'authenticated'
    const local = memoryRepo()
    const api: SyncApi = { pull: vi.fn(async () => []), push: vi.fn(), remove: vi.fn() }
    const gate: SyncAuthGate = { authenticated: false }
    const statusStore = createSyncStatusStore()

    render(
      <ProjectStoreProvider repository={local}>
        <SyncEngine local={local} api={api} gate={gate} statusStore={statusStore} />
      </ProjectStoreProvider>,
    )

    await waitFor(() => expect(statusStore.getState().status).toBe('synced'))
  })

  it('reports offline when the server is unreachable', async () => {
    authState.status = 'authenticated'
    const local = memoryRepo()
    const api: SyncApi = {
      pull: vi.fn(async () => {
        throw new ServerUnreachableError()
      }),
      push: vi.fn(),
      remove: vi.fn(),
    }
    const statusStore = createSyncStatusStore()

    render(
      <ProjectStoreProvider repository={local}>
        <SyncEngine
          local={local}
          api={api}
          gate={{ authenticated: false }}
          statusStore={statusStore}
        />
      </ProjectStoreProvider>,
    )

    await waitFor(() => expect(statusStore.getState().status).toBe('offline'))
  })

  it('reports error on a non-network failure', async () => {
    authState.status = 'authenticated'
    const local = memoryRepo()
    const api: SyncApi = {
      pull: vi.fn(async () => {
        throw new Error('boom')
      }),
      push: vi.fn(),
      remove: vi.fn(),
    }
    const statusStore = createSyncStatusStore()

    render(
      <ProjectStoreProvider repository={local}>
        <SyncEngine
          local={local}
          api={api}
          gate={{ authenticated: false }}
          statusStore={statusStore}
        />
      </ProjectStoreProvider>,
    )

    await waitFor(() => expect(statusStore.getState().status).toBe('error'))
  })
})

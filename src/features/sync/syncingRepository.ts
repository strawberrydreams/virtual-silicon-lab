import type { ProjectRepository } from '../../storage/projectRepository'
import type { SyncApi } from './syncApi'

export type SyncAuthGate = { authenticated: boolean }

// Local writes are authoritative: persist to the local repository first, then
// mirror to sync best-effort only when the user is authenticated.
export function createSyncingRepository(
  local: ProjectRepository,
  api: SyncApi,
  gate: SyncAuthGate,
): ProjectRepository {
  async function bestEffort(action: () => Promise<unknown>): Promise<void> {
    try {
      await action()
    } catch {
      // A later sync pass reconciles transient/offline failures.
    }
  }

  return {
    list: () => local.list(),
    get: (id) => local.get(id),
    async save(project) {
      await local.save(project)
      if (gate.authenticated) await bestEffort(() => api.push(project))
    },
    async remove(id) {
      await local.remove(id)
      if (gate.authenticated) await bestEffort(() => api.remove(id))
    },
  }
}

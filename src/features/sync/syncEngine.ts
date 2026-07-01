import { useEffect } from 'react'
import { reconcile, type SyncMeta } from '../../domain/sync/reconcile'
import type { ProjectRepository } from '../../storage/projectRepository'
import { useAuthStore } from '../../stores/authStoreContext'
import { useProjectStoreApi } from '../../stores/projectStoreContext'
import { ServerUnreachableError, type SyncApi } from './syncApi'
import type { SyncStatusStore } from './syncStatusStore'
import type { SyncAuthGate } from './syncingRepository'

const SYNC_INTERVAL_MS = 30_000

// Pulls the complete server snapshot and reconciles it against the raw local
// repository. Remote applies use the raw repo so they do not echo back as pushes.
export async function runSyncPass(local: ProjectRepository, api: SyncApi): Promise<void> {
  const [localProjects, remote] = await Promise.all([local.list(), api.pull(0)])

  const localMeta: SyncMeta[] = localProjects.map((project) => ({
    id: project.id,
    updatedAt: project.updatedAt,
  }))
  const remoteMeta: SyncMeta[] = remote.map((record) => ({
    id: record.projectId,
    updatedAt: record.updatedAt,
    deleted: record.deleted,
  }))
  const plan = reconcile(localMeta, remoteMeta)

  const remoteById = new Map(remote.map((record) => [record.projectId, record]))
  const localById = new Map(localProjects.map((project) => [project.id, project]))

  for (const id of plan.toApply) {
    const record = remoteById.get(id)
    if (record !== undefined && record.project !== null) await local.save(record.project)
  }
  for (const id of plan.toDeleteLocal) {
    await local.remove(id)
  }
  for (const id of plan.toPush) {
    const project = localById.get(id)
    if (project !== undefined) await api.push(project)
  }
}

export function SyncEngine({
  local,
  api,
  gate,
  statusStore,
}: {
  local: ProjectRepository
  api: SyncApi
  gate: SyncAuthGate
  statusStore: SyncStatusStore
}): null {
  const auth = useAuthStore()
  const projectStore = useProjectStoreApi()
  const authenticated = auth.status === 'authenticated'

  useEffect(() => {
    gate.authenticated = authenticated
  }, [authenticated, gate])

  useEffect(() => {
    if (!authenticated) {
      statusStore.setState({ status: 'idle' })
      return
    }

    let cancelled = false
    async function pass() {
      statusStore.setState({ status: 'syncing' })
      try {
        await runSyncPass(local, api)
        if (!cancelled) await projectStore.getState().load()
        if (!cancelled) statusStore.setState({ status: 'synced' })
      } catch (error) {
        if (!cancelled) {
          statusStore.setState({
            status: error instanceof ServerUnreachableError ? 'offline' : 'error',
          })
        }
      }
    }

    void pass()
    const interval = window.setInterval(() => void pass(), SYNC_INTERVAL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void pass()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [authenticated, local, api, projectStore, statusStore])

  return null
}

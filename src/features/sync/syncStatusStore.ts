import { createStore } from 'zustand/vanilla'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

export function createSyncStatusStore() {
  return createStore<{ status: SyncStatus }>(() => ({ status: 'idle' }))
}

export type SyncStatusStore = ReturnType<typeof createSyncStatusStore>

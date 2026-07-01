import { useStore } from 'zustand'
import type { SyncStatus, SyncStatusStore } from './syncStatusStore'

const LABELS: Record<Exclude<SyncStatus, 'idle'>, string> = {
  syncing: 'Syncing...',
  synced: 'Synced',
  offline: 'Offline',
  error: 'Sync error',
}

export function SyncStatusIndicator({ store }: { store: SyncStatusStore }) {
  const { status } = useStore(store)
  if (status === 'idle') return null
  return (
    <span className="sync-status" data-status={status} role="status" aria-live="polite">
      {LABELS[status]}
    </span>
  )
}

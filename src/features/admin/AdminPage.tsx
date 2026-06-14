import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStoreContext'
import {
  liveModerationApi,
  type AdminReport,
  type ModerationApi,
  type ModerationChip,
} from './moderationApi'

export function AdminPage({ api = liveModerationApi }: { api?: ModerationApi }) {
  const auth = useAuthStore()
  const [reports, setReports] = useState<AdminReport[]>([])
  const [chips, setChips] = useState<ModerationChip[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setReports(await api.listReports('open'))
      setChips(await api.listChips())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.')
    }
  }, [api])

  // Run a mutation, refresh the lists, and surface any failure in the alert
  // region — a silently no-op'd hide/delete would mislead the admin.
  const act = useCallback(
    (action: Promise<void>) => {
      action.then(refresh).catch((e) => setError(e instanceof Error ? e.message : 'Action failed.'))
    },
    [refresh],
  )

  useEffect(() => {
    if (auth.isAdmin) void refresh()
  }, [auth.isAdmin, refresh])

  if (!auth.isAdmin) {
    return (
      <main className="admin-page">
        <p>Admin access required.</p>
      </main>
    )
  }

  return (
    <main className="admin-page" style={{ padding: '2rem', color: 'var(--v2-text, #fff)' }}>
      <h1>Moderation</h1>
      {error !== null && <p role="alert">{error}</p>}

      <section>
        <h2>Open reports ({reports.length})</h2>
        {reports.length === 0 && <p>No open reports.</p>}
        <ul>
          {reports.map((r) => (
            <li key={r.id}>
              <strong>{r.chipTitle}</strong> — {r.reason ?? '(no reason)'}{' '}
              <button onClick={() => act(api.hideChip(r.publishedChipId))}>Hide chip</button>{' '}
              <button onClick={() => act(api.resolveReport(r.id, 'resolved'))}>Resolve</button>{' '}
              <button onClick={() => act(api.resolveReport(r.id, 'dismissed'))}>Dismiss</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Published chips</h2>
        <ul>
          {chips.map((chip) => (
            <li key={chip.id}>
              <strong>{chip.title}</strong> by {chip.ownerDisplayName} — {chip.moderationStatus}{' '}
              {chip.moderationStatus === 'visible' ? (
                <button onClick={() => act(api.hideChip(chip.id))}>Hide</button>
              ) : (
                <button onClick={() => act(api.unhideChip(chip.id))}>Unhide</button>
              )}{' '}
              <button onClick={() => act(api.deleteChip(chip.id))}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

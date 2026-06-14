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
              <button onClick={() => api.hideChip(r.publishedChipId).then(refresh)}>Hide chip</button>{' '}
              <button onClick={() => api.resolveReport(r.id, 'resolved').then(refresh)}>Resolve</button>{' '}
              <button onClick={() => api.resolveReport(r.id, 'dismissed').then(refresh)}>Dismiss</button>
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
                <button onClick={() => api.hideChip(chip.id).then(refresh)}>Hide</button>
              ) : (
                <button onClick={() => api.unhideChip(chip.id).then(refresh)}>Unhide</button>
              )}{' '}
              <button onClick={() => api.deleteChip(chip.id).then(refresh)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

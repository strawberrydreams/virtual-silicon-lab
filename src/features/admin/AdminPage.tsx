import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStoreContext'
import {
  liveContestsApi,
  type ContestStatus,
  type ContestSummary,
  type ContestsApi,
} from '../contests/contestsApi'
import {
  liveModerationApi,
  type AdminReport,
  type ModerationApi,
  type ModerationChip,
} from './moderationApi'

export function AdminPage({
  api = liveModerationApi,
  contestsApi = liveContestsApi,
}: {
  api?: ModerationApi
  contestsApi?: ContestsApi
}) {
  const auth = useAuthStore()
  const [reports, setReports] = useState<AdminReport[]>([])
  const [chips, setChips] = useState<ModerationChip[]>([])
  const [contests, setContests] = useState<ContestSummary[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newTheme, setNewTheme] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reloadContests = useCallback(() => {
    contestsApi
      .list()
      .then(setContests)
      .catch(() => setContests([]))
  }, [contestsApi])

  const refresh = useCallback(async () => {
    try {
      setReports(await api.listReports('open'))
      setChips(await api.listChips())
      reloadContests()
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.')
    }
  }, [api, reloadContests])

  // Run a mutation, refresh the lists, and surface any failure in the alert
  // region — a silently no-op'd hide/delete would mislead the admin.
  const act = useCallback(
    (action: Promise<void>) => {
      action.then(refresh).catch((e) => setError(e instanceof Error ? e.message : 'Action failed.'))
    },
    [refresh],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- imperative load of moderation data on mount / when admin status resolves; refresh() only setStates after awaiting the server
    if (auth.isAdmin) void refresh()
  }, [auth.isAdmin, refresh])

  const createContest = useCallback(async () => {
    const title = newTitle.trim()
    const theme = newTheme.trim()
    if (title === '' || theme === '') return
    try {
      const created = await contestsApi.create({ title, theme })
      setContests((current) => [
        {
          id: created.id,
          title,
          theme,
          status: 'draft',
          entryCount: 0,
          voteCount: 0,
          createdAt: Date.now(),
        },
        ...current,
      ])
      setNewTitle('')
      setNewTheme('')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create contest.')
    }
  }, [contestsApi, newTheme, newTitle])

  const setContestStatus = useCallback(
    async (id: string, status: ContestStatus) => {
      try {
        await contestsApi.setStatus(id, status)
        setContests((current) =>
          current.map((contest) => (contest.id === id ? { ...contest, status } : contest)),
        )
        if (status !== 'draft') reloadContests()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update contest.')
      }
    },
    [contestsApi, reloadContests],
  )

  const deleteContest = useCallback(
    async (id: string) => {
      try {
        await contestsApi.remove(id)
        setContests((current) => current.filter((contest) => contest.id !== id))
        reloadContests()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete contest.')
      }
    },
    [contestsApi, reloadContests],
  )

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

      <section className="admin-page__section">
        <h2>Contests</h2>
        <div className="admin-contest-create">
          <input
            aria-label="Contest title"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Title"
          />
          <input
            aria-label="Contest theme"
            value={newTheme}
            onChange={(event) => setNewTheme(event.target.value)}
            placeholder="Theme"
          />
          <button type="button" onClick={() => void createContest()}>
            Create contest
          </button>
        </div>
        {contests.length === 0 ? <p>No contests yet.</p> : null}
        {contests.length > 0 ? (
          <ul className="admin-contest-list">
            {contests.map((contest) => (
              <li key={contest.id}>
                <span>{contest.title}</span>
                <select
                  aria-label={`Status for ${contest.title}`}
                  value={contest.status}
                  onChange={(event) =>
                    void setContestStatus(contest.id, event.target.value as ContestStatus)
                  }
                >
                  <option value="draft">draft</option>
                  <option value="submission">submission</option>
                  <option value="voting">voting</option>
                  <option value="results">results</option>
                </select>
                <button type="button" onClick={() => void deleteContest(contest.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

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

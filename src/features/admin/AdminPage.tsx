import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStoreContext'
import {
  liveContestsApi,
  type ContestStatus,
  type ContestSummary,
  type ContestsApi,
} from '../contests/contestsApi'
import { liveInviteApi, type InviteApi, type InviteCode } from './inviteApi'
import {
  liveModerationApi,
  type AdminReport,
  type AuditEntry,
  type CommentReport,
  type ModerationApi,
  type ModerationChip,
} from './moderationApi'

const DAY_MS = 24 * 60 * 60 * 1000

export function AdminPage({
  api = liveModerationApi,
  inviteApi = liveInviteApi,
  contestsApi = liveContestsApi,
}: {
  api?: ModerationApi
  inviteApi?: InviteApi
  contestsApi?: ContestsApi
}) {
  const auth = useAuthStore()
  const [reports, setReports] = useState<AdminReport[]>([])
  const [chips, setChips] = useState<ModerationChip[]>([])
  const [commentReports, setCommentReports] = useState<CommentReport[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [invites, setInvites] = useState<InviteCode[]>([])
  const [contests, setContests] = useState<ContestSummary[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newTheme, setNewTheme] = useState('')
  const [inviteMaxUses, setInviteMaxUses] = useState('1')
  const [inviteExpiryDays, setInviteExpiryDays] = useState('')
  const [inviteNote, setInviteNote] = useState('')
  const [banReason, setBanReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reloadContests = useCallback(() => {
    contestsApi
      .listAdmin()
      .then(setContests)
      .catch(() => setContests([]))
  }, [contestsApi])

  const refresh = useCallback(async () => {
    try {
      setReports(await api.listReports('open'))
      setChips(await api.listChips())
      setCommentReports(await api.listCommentReports())
      setAudit(await api.listAudit())
      setInvites(await inviteApi.list())
      reloadContests()
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.')
    }
  }, [api, inviteApi, reloadContests])

  // Run a mutation, refresh the lists, and surface any failure in the alert
  // region — a silently no-op'd hide/delete/ban would mislead the admin.
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

  const createInvite = useCallback(async () => {
    const maxUses = Number.parseInt(inviteMaxUses, 10)
    if (!Number.isInteger(maxUses) || maxUses <= 0) {
      setError('Invite max uses must be a positive integer.')
      return
    }
    const days = inviteExpiryDays.trim() === '' ? null : Number.parseInt(inviteExpiryDays, 10)
    if (days !== null && (!Number.isInteger(days) || days <= 0)) {
      setError('Invite expiry days must be a positive integer.')
      return
    }
    const note = inviteNote.trim()
    try {
      await inviteApi.create({
        maxUses,
        expiresAt: days === null ? null : Date.now() + days * DAY_MS,
        note: note === '' ? null : note,
      })
      setInviteMaxUses('1')
      setInviteExpiryDays('')
      setInviteNote('')
      setInvites(await inviteApi.list())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invite code.')
    }
  }, [inviteApi, inviteExpiryDays, inviteMaxUses, inviteNote])

  const banReasonOrUndefined = () => {
    const reason = banReason.trim()
    return reason === '' ? undefined : reason
  }

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
        <label>
          Ban reason (optional, applied to ban actions)
          <input
            aria-label="Ban reason"
            value={banReason}
            onChange={(event) => setBanReason(event.target.value)}
            placeholder="reason"
          />
        </label>
      </section>

      <section className="admin-page__section">
        <h2>Invite Codes</h2>
        <div className="admin-invite-create">
          <input
            aria-label="Invite max uses"
            type="number"
            min={1}
            value={inviteMaxUses}
            onChange={(event) => setInviteMaxUses(event.target.value)}
            placeholder="Max uses"
          />
          <input
            aria-label="Invite expiry days"
            type="number"
            min={1}
            value={inviteExpiryDays}
            onChange={(event) => setInviteExpiryDays(event.target.value)}
            placeholder="Expires in days (optional)"
          />
          <input
            aria-label="Invite note"
            value={inviteNote}
            onChange={(event) => setInviteNote(event.target.value)}
            placeholder="Note (optional)"
          />
          <button type="button" onClick={() => void createInvite()}>
            Create invite code
          </button>
        </div>
        {invites.length === 0 ? <p>No invite codes yet.</p> : null}
        <ul>
          {invites.map((invite) => (
            <li key={invite.code}>
              <strong>{invite.code}</strong> — {invite.usedCount}/{invite.maxUses} used
              {invite.note !== null ? ` · ${invite.note}` : ''}
              {invite.expiresAt !== null
                ? ` · expires ${new Date(invite.expiresAt).toLocaleDateString()}`
                : ''}{' '}
              <button
                aria-label={`Revoke ${invite.code}`}
                onClick={() => act(inviteApi.revoke(invite.code))}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      </section>

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
        <h2>Comment reports ({commentReports.length})</h2>
        {commentReports.length === 0 && <p>No reported comments.</p>}
        <ul>
          {commentReports.map((r) => (
            <li key={r.id}>
              <strong>{r.commentAuthorDisplayName}</strong> on {r.chipTitle}: “{r.commentBody}”
              {' — '}
              {r.reason ?? '(no reason)'}{' '}
              <button
                aria-label={`Hide comment ${r.commentId}`}
                onClick={() => act(api.hideComment(r.commentId))}
              >
                Hide comment
              </button>{' '}
              <button
                aria-label={`Ban author ${r.commentAuthorDisplayName}`}
                onClick={() => act(api.banUser(r.commentAuthorUserId, banReasonOrUndefined()))}
              >
                Ban author
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Published chips</h2>
        <ul>
          {chips.map((chip) => (
            <li key={chip.id}>
              <strong>{chip.title}</strong> by {chip.ownerDisplayName} — {chip.moderationStatus}
              {chip.ownerBannedAt !== null ? ' · owner banned' : ''}{' '}
              {chip.moderationStatus === 'visible' ? (
                <button onClick={() => act(api.hideChip(chip.id))}>Hide</button>
              ) : (
                <button onClick={() => act(api.unhideChip(chip.id))}>Unhide</button>
              )}{' '}
              <button
                aria-label={`Feature ${chip.title}`}
                onClick={() => act(api.featureChip(chip.id))}
              >
                Feature
              </button>{' '}
              <button
                aria-label={`Unfeature ${chip.title}`}
                onClick={() => act(api.unfeatureChip(chip.id))}
              >
                Unfeature
              </button>{' '}
              {chip.ownerBannedAt !== null ? (
                <button
                  aria-label={`Unban owner of ${chip.title}`}
                  onClick={() => act(api.unbanUser(chip.ownerUserId))}
                >
                  Unban owner
                </button>
              ) : (
                <button
                  aria-label={`Ban owner of ${chip.title}`}
                  onClick={() => act(api.banUser(chip.ownerUserId, banReasonOrUndefined()))}
                >
                  Ban owner
                </button>
              )}{' '}
              <button onClick={() => act(api.deleteChip(chip.id))}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Audit log</h2>
        {audit.length === 0 && <p>No audit entries.</p>}
        <ul>
          {audit.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.action}</strong> · {entry.targetType} {entry.targetId}
              {entry.detail !== null ? ` · ${entry.detail}` : ''} ·{' '}
              {new Date(entry.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

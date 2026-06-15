import { useCallback, useEffect, useState } from 'react'
import { liveContestsApi, type ContestDetail, type ContestsApi, type MyChip } from './contestsApi'

type Props = {
  contestId: string
  api?: ContestsApi
  isAuthenticated: boolean
  isAdmin: boolean
  currentUserId: string | null
}

const STATUS_LABEL: Record<ContestDetail['status'], string> = {
  draft: 'Draft',
  submission: 'Submissions open',
  voting: 'Voting open',
  results: 'Results',
}

export function ContestDetailPage({
  contestId,
  api = liveContestsApi,
  isAuthenticated,
  isAdmin,
  currentUserId: _currentUserId,
}: Props) {
  const [detail, setDetail] = useState<ContestDetail | 'loading' | 'error'>('loading')
  const [myChips, setMyChips] = useState<MyChip[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const reload = useCallback(() => {
    api
      .get(contestId)
      .then(setDetail)
      .catch(() => setDetail('error'))
  }, [api, contestId])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!isAuthenticated) return
    api
      .listMyChips()
      .then(setMyChips)
      .catch(() => setMyChips([]))
  }, [api, isAuthenticated])

  if (detail === 'loading') return <p className="contest-detail__state">Loading contest...</p>
  if (detail === 'error')
    return <p className="contest-detail__state">This contest is unavailable.</p>

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const winners = detail.status === 'results' ? detail.entries.slice(0, 3) : []

  return (
    <main className="v2-page contest-detail">
      <section className="contest-detail__hero" aria-label="Contest detail">
        <span className={`contest-card__badge contest-card__badge--${detail.status}`}>
          {STATUS_LABEL[detail.status]}
        </span>
        <h1>{detail.title}</h1>
        <p className="contest-detail__theme">{detail.theme}</p>
      </section>

      {message !== null ? (
        <p className="contest-detail__error" role="alert">
          {message}
        </p>
      ) : null}

      {winners.length > 0 ? (
        <ol className="contest-podium" data-testid="contest-podium">
          {winners.map((entry) => (
            <li
              className={`contest-podium__place contest-podium__place--${entry.rank}`}
              key={entry.entryId}
            >
              <span className="contest-podium__rank">#{entry.rank}</span>
              <img alt={`${entry.title} poster`} src={entry.posterImageUrl} />
              <h2>{entry.title}</h2>
              <p>
                {entry.ownerDisplayName} · {entry.voteCount} votes
              </p>
            </li>
          ))}
        </ol>
      ) : null}

      {detail.status === 'submission' && isAuthenticated && detail.myEntryId === null ? (
        <section className="contest-detail__enter" aria-label="Enter contest">
          <h2>Enter one of your chips</h2>
          {myChips.length === 0 ? <p>Publish a public chip first to enter.</p> : null}
          {myChips.length > 0 ? (
            <ul>
              {myChips.map((chip) => (
                <li key={chip.id}>
                  <img alt={`${chip.title} poster`} src={chip.posterImageUrl} />
                  <span>{chip.title}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => api.enter(contestId, chip.id))}
                  >
                    Enter
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {detail.status === 'submission' && detail.myEntryId !== null ? (
        <button
          className="v2-inline-action"
          type="button"
          disabled={busy}
          onClick={() => void run(() => api.withdraw(contestId, detail.myEntryId as string))}
        >
          Withdraw my entry
        </button>
      ) : null}

      <section className="contest-detail__entries" aria-label="Contest entries">
        {detail.entries.map((entry) => {
          const isMine = entry.entryId === detail.myEntryId
          const votedForThis = entry.entryId === detail.myVoteEntryId
          return (
            <article className="contest-entry" key={entry.entryId}>
              <img alt={`${entry.title} poster`} src={entry.posterImageUrl} />
              <div>
                <h2>{entry.title}</h2>
                <p>{entry.ownerDisplayName}</p>
                {detail.status === 'voting' || detail.status === 'results' ? (
                  <p>{entry.voteCount} votes</p>
                ) : null}
                {detail.status === 'voting' && isAuthenticated && !isMine ? (
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={votedForThis}
                    onClick={() =>
                      void run(() =>
                        votedForThis ? api.unvote(contestId) : api.vote(contestId, entry.entryId),
                      )
                    }
                  >
                    {votedForThis ? 'Voted' : 'Vote'}
                  </button>
                ) : null}
                {detail.status === 'voting' && isMine ? (
                  <span className="contest-entry__mine">Your entry</span>
                ) : null}
                {isAdmin && detail.status !== 'results' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => api.withdraw(contestId, entry.entryId))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </article>
          )
        })}
      </section>

      {!isAuthenticated && detail.status !== 'results' ? (
        <p className="contest-detail__state">Sign in to enter or vote.</p>
      ) : null}
    </main>
  )
}

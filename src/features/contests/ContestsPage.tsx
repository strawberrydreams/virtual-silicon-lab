import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { liveContestsApi, type ContestSummary, type ContestsApi } from './contestsApi'

type Props = {
  api?: ContestsApi
}

const STATUS_LABEL: Record<ContestSummary['status'], string> = {
  draft: 'Draft',
  submission: 'Submissions open',
  voting: 'Voting open',
  results: 'Results',
}

export function ContestsPage({ api = liveContestsApi }: Props) {
  const [contests, setContests] = useState<ContestSummary[] | 'loading' | 'error'>('loading')

  useEffect(() => {
    let active = true
    setContests('loading')
    api
      .list()
      .then((list) => {
        if (active) setContests(list)
      })
      .catch(() => {
        if (active) setContests('error')
      })
    return () => {
      active = false
    }
  }, [api])

  return (
    <main className="v2-page contests-page">
      <section className="contests-page__hero" aria-label="Contest intro">
        <p className="v2-kicker">Community Arena</p>
        <h1>Contests</h1>
        <p>Themed chip-design challenges. Submit a published chip, vote, and see the winners.</p>
      </section>

      {contests === 'loading' ? <p className="contests-page__state">Loading contests...</p> : null}
      {contests === 'error' ? (
        <p className="contests-page__state">Contests are unavailable right now.</p>
      ) : null}
      {Array.isArray(contests) && contests.length === 0 ? (
        <p className="contests-page__state">No contests yet. Check back soon.</p>
      ) : null}
      {Array.isArray(contests) && contests.length > 0 ? (
        <section className="contests-page__list" aria-label="Contests">
          {contests.map((contest) => (
            <article className="contest-card" key={contest.id}>
              <Link to={`/contests/${contest.id}`}>
                <span className={`contest-card__badge contest-card__badge--${contest.status}`}>
                  {STATUS_LABEL[contest.status]}
                </span>
                <h2>{contest.title}</h2>
                <p>{contest.theme}</p>
                <span className="contest-card__meta">
                  {contest.entryCount} entries · {contest.voteCount} votes
                </span>
              </Link>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  )
}

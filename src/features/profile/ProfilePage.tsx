import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { liveProfileApi, type ProfileApi, type PublicProfile } from './profileApi'

type Props = {
  api?: ProfileApi
}

export function ProfilePage({ api = liveProfileApi }: Props) {
  const { handle = '' } = useParams()
  const [profile, setProfile] = useState<PublicProfile | 'loading' | 'missing' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let active = true
    setProfile('loading')
    api
      .get(handle)
      .then((nextProfile) => {
        if (active) setProfile(nextProfile ?? 'missing')
      })
      .catch(() => {
        if (active) setProfile('error')
      })
    return () => {
      active = false
    }
  }, [api, handle])

  return (
    <main className="v2-page profile-page">
      {profile === 'loading' ? <p className="gallery-page__state">Loading profile...</p> : null}
      {profile === 'missing' ? <p className="gallery-page__state">Profile not found.</p> : null}
      {profile === 'error' ? <p className="gallery-page__state">Profile could not be loaded.</p> : null}
      {typeof profile === 'object' ? (
        <>
          <section className="gallery-page__hero" aria-label="Public profile intro">
            <p className="v2-kicker">@{profile.handle}</p>
            <h1>{profile.displayName}</h1>
          </section>
          {profile.chips.length === 0 ? (
            <p className="gallery-page__state">No public chips yet.</p>
          ) : (
            <section className="gallery-grid" aria-label={`${profile.displayName} public chips`}>
              {profile.chips.map((chip) => (
                <article className="gallery-card" key={chip.slug}>
                  <img
                    alt={`${chip.title} poster`}
                    className="gallery-card__poster"
                    src={chip.posterImageUrl}
                  />
                  <div className="gallery-card__body">
                    <h2>{chip.title}</h2>
                    <Link className="v2-inline-action" to={`/gallery/${chip.slug}`}>
                      Open {chip.title}
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      ) : null}
    </main>
  )
}

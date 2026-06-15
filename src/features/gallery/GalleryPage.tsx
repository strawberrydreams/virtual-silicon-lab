import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  liveGalleryApi,
  ServerUnreachableError,
  type GalleryApi,
  type GalleryChipSummary,
  type GallerySort,
} from './galleryApi'

type Props = {
  api?: GalleryApi
}

const SORT_OPTIONS: { value: GallerySort; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'top', label: 'Top' },
  { value: 'newest', label: 'Newest' },
]

export function GalleryPage({ api = liveGalleryApi }: Props) {
  const [sort, setSort] = useState<GallerySort>('trending')
  const [chips, setChips] = useState<GalleryChipSummary[] | 'loading' | 'offline' | 'error'>('loading')

  useEffect(() => {
    let active = true
    setChips('loading')
    api
      .list(sort)
      .then((nextChips) => {
        if (active) setChips(nextChips)
      })
      .catch((error) => {
        if (!active) return
        setChips(error instanceof ServerUnreachableError ? 'offline' : 'error')
      })
    return () => {
      active = false
    }
  }, [api, sort])

  return (
    <main className="v2-page gallery-page">
      <section className="gallery-page__hero" aria-label="Public gallery intro">
        <p className="v2-kicker">Share Core</p>
        <h1>Public Gallery</h1>
        <p>
          Browse published chip posters from local creators. Gallery entries are explicit snapshots,
          not live project sync.
        </p>
      </section>

      <div className="gallery-page__sort" role="group" aria-label="Sort gallery">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="v2-inline-action"
            aria-pressed={sort === option.value}
            onClick={() => setSort(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {chips === 'loading' ? <p className="gallery-page__state">Loading public chips...</p> : null}
      {chips === 'offline' ? (
        <p className="gallery-page__state">Share server is offline. Local editing is unaffected.</p>
      ) : null}
      {chips === 'error' ? <p className="gallery-page__state">Gallery could not be loaded.</p> : null}
      {Array.isArray(chips) && chips.length === 0 ? (
        <p className="gallery-page__state">No public chips yet.</p>
      ) : null}
      {Array.isArray(chips) && chips.length > 0 ? (
        <section className="gallery-grid" aria-label="Public chips">
          {chips.map((chip) => (
            <article className="gallery-card" key={chip.id}>
              <img alt={`${chip.title} poster`} className="gallery-card__poster" src={chip.posterImageUrl} />
              <div className="gallery-card__body">
                <p className="v2-meta">{chip.ownerDisplayName}</p>
                <h2>{chip.title}</h2>
                <p>Version {chip.version}</p>
                <span className="gallery-card__likes" aria-label={`${chip.likeCount} likes`}>
                  ♥ {chip.likeCount}
                </span>
                <Link className="v2-inline-action" to={`/gallery/${chip.slug}`}>
                  Open {chip.title}
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  )
}

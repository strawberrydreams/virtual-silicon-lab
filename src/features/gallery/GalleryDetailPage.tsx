import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Project } from '../../domain/project'
import {
  liveGalleryApi,
  ServerUnreachableError,
  type GalleryApi,
  type GalleryChipDetail,
} from './galleryApi'

type Props = {
  api?: GalleryApi
  onProjectLoaded?: (project: Project) => void
}

export function GalleryDetailPage({ api = liveGalleryApi, onProjectLoaded }: Props) {
  const { slug = '' } = useParams()
  const [chip, setChip] = useState<GalleryChipDetail | 'loading' | 'missing' | 'offline' | 'error'>('loading')

  useEffect(() => {
    let active = true
    setChip('loading')
    api
      .get(slug)
      .then((nextChip) => {
        if (!active) return
        if (nextChip === null) {
          setChip('missing')
        } else {
          setChip(nextChip)
          onProjectLoaded?.(nextChip.project)
        }
      })
      .catch((error) => {
        if (!active) return
        setChip(error instanceof ServerUnreachableError ? 'offline' : 'error')
      })
    return () => {
      active = false
    }
  }, [api, onProjectLoaded, slug])

  if (chip === 'loading') {
    return (
      <main className="v2-page gallery-detail">
        <p className="gallery-page__state">Loading published chip...</p>
      </main>
    )
  }

  if (chip === 'missing') {
    return (
      <main className="v2-page gallery-detail">
        <p className="v2-kicker">Share Core</p>
        <h1>Published chip not found</h1>
        <p className="gallery-page__state">This chip may be private, unpublished, or deleted.</p>
        <Link className="v2-inline-action" to="/gallery">
          Back to Gallery
        </Link>
      </main>
    )
  }

  if (chip === 'offline') {
    return (
      <main className="v2-page gallery-detail">
        <p className="v2-kicker">Share Core</p>
        <h1>Gallery Offline</h1>
        <p className="gallery-page__state">Share server is offline. Local editing is unaffected.</p>
      </main>
    )
  }

  if (chip === 'error') {
    return (
      <main className="v2-page gallery-detail">
        <p className="v2-kicker">Share Core</p>
        <h1>Gallery Error</h1>
        <p className="gallery-page__state">Published chip could not be loaded.</p>
      </main>
    )
  }

  const spec = chip.project.spec
  return (
    <main className="v2-page gallery-detail">
      <section className="gallery-detail__hero" aria-label="Published chip detail">
        <div className="gallery-detail__copy">
          <p className="v2-kicker">Published by {chip.ownerDisplayName}</p>
          <h1>{chip.title}</h1>
          <p>Version {chip.version}</p>
          <Link className="v2-inline-action" to="/gallery">
            Back to Gallery
          </Link>
        </div>
        <img alt={`${chip.title} poster`} className="gallery-detail__poster" src={chip.posterImageUrl} />
      </section>

      <section className="gallery-spec" aria-label="Published fake spec">
        <p className="v2-kicker">Spec Sheet</p>
        <h2>{spec.brand} {spec.series}</h2>
        <dl className="gallery-spec__grid">
          <div>
            <dt>Generation</dt>
            <dd>{spec.generation}</dd>
          </div>
          <div>
            <dt>Process</dt>
            <dd>{spec.process}</dd>
          </div>
          <div>
            <dt>Cores</dt>
            <dd>{spec.cores}</dd>
          </div>
          <div>
            <dt>Bandwidth</dt>
            <dd>{spec.bandwidth}</dd>
          </div>
        </dl>
        <p>{spec.description}</p>
        <div className="gallery-spec__features">
          {spec.features.map((feature) => (
            <span key={feature}>{feature}</span>
          ))}
        </div>
      </section>
    </main>
  )
}

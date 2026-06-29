import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { Project } from '../../domain/project'
import { isChip3DShowcaseAvailable } from '../../three/chip3dAvailability'
import { Chip3DShowcase } from '../../three/Chip3DShowcase'
import { useAuthStore } from '../../stores/authStoreContext'
import {
  liveGalleryApi,
  ServerUnreachableError,
  type ChipLineage,
  type GalleryApi,
  type GalleryChipDetail,
} from './galleryApi'
import { liveReactionsApi, type GalleryComment, type ReactionsApi } from './reactionsApi'

type Props = {
  api?: GalleryApi
  reactions?: ReactionsApi
  onProjectLoaded?: (project: Project) => void
  onRemix?: (project: Project, origin: { chipId: string; slug: string; title: string }) => void
}

export function GalleryDetailPage({
  api = liveGalleryApi,
  reactions = liveReactionsApi,
  onProjectLoaded,
  onRemix,
}: Props) {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [chip, setChip] = useState<GalleryChipDetail | 'loading' | 'missing' | 'offline' | 'error'>(
    'loading',
  )
  const auth = useAuthStore()
  const isLoggedIn = auth.status === 'authenticated'
  const [likeState, setLikeState] = useState<{ likeCount: number; likedByMe: boolean } | null>(null)
  const [reported, setReported] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [comments, setComments] = useState<GalleryComment[]>([])
  const [lineage, setLineage] = useState<ChipLineage | null>(null)
  const [draft, setDraft] = useState('')
  const [show3D, setShow3D] = useState(false)
  // Reset to loading (and clear stale lineage) when the slug changes, derived
  // during render so the effect only owns the async fetch.
  const [loadedSlug, setLoadedSlug] = useState(slug)
  if (loadedSlug !== slug) {
    setLoadedSlug(slug)
    setChip('loading')
    setLikeState(null)
    setReported(false)
    setActionError(null)
    setComments([])
    setLineage(null)
    setDraft('')
    setShow3D(false)
  }

  useEffect(() => {
    let active = true
    api
      .get(slug)
      .then((nextChip) => {
        if (!active) return
        if (nextChip === null) {
          setChip('missing')
        } else {
          setChip(nextChip)
          setLikeState({ likeCount: nextChip.likeCount, likedByMe: nextChip.likedByMe })
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

  const chipId = typeof chip === 'object' ? chip.id : null
  useEffect(() => {
    if (chipId === null) return
    let active = true
    reactions
      .listComments(chipId)
      .then((list) => {
        if (active) setComments(list)
      })
      .catch(() => {
        // comments are non-critical; leave the list empty on failure
      })
    return () => {
      active = false
    }
  }, [chipId, reactions])

  useEffect(() => {
    if (chipId === null) return
    let active = true
    api
      .getLineage(slug)
      .then((next) => {
        if (active) setLineage(next)
      })
      .catch(() => {
        // Lineage is non-critical; leave it empty on failure.
      })
    return () => {
      active = false
    }
  }, [api, chipId, slug])

  function refreshComments(id: string) {
    reactions
      .listComments(id)
      .then(setComments)
      .catch(() => undefined)
  }

  // Memoize the 3D-availability probe: it rebuilds the chip model and creates a
  // throwaway WebGL context, so calling it inline on every re-render (likes,
  // comments, lineage) churns GPU contexts. The result is stable per loaded chip.
  const showcaseAvailable = useMemo(
    () => (typeof chip === 'object' ? isChip3DShowcaseAvailable(chip.project) : false),
    [chip],
  )
  const view3DRequested = searchParams.get('view') === '3d'
  useEffect(() => {
    if (view3DRequested && showcaseAvailable) setShow3D(true)
  }, [showcaseAvailable, view3DRequested])

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
          <button
            type="button"
            className="v2-inline-action"
            onClick={() =>
              onRemix?.(chip.project, { chipId: chip.id, slug: chip.slug, title: chip.title })
            }
          >
            Remix into my projects
          </button>
          {showcaseAvailable && (
            <button type="button" className="v2-inline-action" onClick={() => setShow3D(true)}>
              View in 3D
            </button>
          )}
          {likeState !== null && (
            <div className="gallery-detail__reactions">
              <button
                type="button"
                className="v2-inline-action"
                disabled={!isLoggedIn}
                onClick={() => {
                  const op = likeState.likedByMe
                    ? reactions.unlike(chip.id)
                    : reactions.like(chip.id)
                  op.then(setLikeState).catch((e) =>
                    setActionError(e instanceof Error ? e.message : 'Action failed.'),
                  )
                }}
              >
                {likeState.likedByMe ? '♥' : '♡'} {likeState.likeCount}
              </button>
              <button
                type="button"
                className="v2-inline-action"
                disabled={!isLoggedIn || reported}
                onClick={() => {
                  reactions
                    .reportChip(chip.id, 'Reported from gallery')
                    .then(() => setReported(true))
                    .catch((e) => setActionError(e instanceof Error ? e.message : 'Action failed.'))
                }}
              >
                {reported ? 'Reported' : 'Report'}
              </button>
              {!isLoggedIn && <span className="gallery-detail__hint">Sign in to react.</span>}
              {actionError !== null && <span role="alert">{actionError}</span>}
            </div>
          )}
        </div>
        <img
          alt={`${chip.title} poster`}
          className="gallery-detail__poster"
          src={chip.posterImageUrl}
        />
      </section>

      <section className="gallery-spec" aria-label="Published fake spec">
        <p className="v2-kicker">Spec Sheet</p>
        <h2>
          {spec.brand} {spec.series}
        </h2>
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

      <section className="gallery-comments" aria-label="Comments">
        <p className="v2-kicker">Comments ({comments.length})</p>
        <ul className="gallery-comments__list">
          {comments.map((comment) => (
            <li key={comment.id}>
              <strong>{comment.authorDisplayName}</strong> {comment.body}
              {(auth.user?.id === comment.authorUserId || auth.isAdmin) && (
                <button
                  type="button"
                  className="v2-inline-action"
                  onClick={() => {
                    reactions
                      .deleteComment(chip.id, comment.id)
                      .then(() => refreshComments(chip.id))
                      .catch((e) =>
                        setActionError(e instanceof Error ? e.message : 'Action failed.'),
                      )
                  }}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
          {comments.length === 0 && <li className="gallery-comments__empty">No comments yet.</li>}
        </ul>
        {isLoggedIn ? (
          <form
            className="gallery-comments__form"
            onSubmit={(e) => {
              e.preventDefault()
              const body = draft.trim()
              if (body === '') return
              reactions
                .createComment(chip.id, body)
                .then(() => {
                  setDraft('')
                  refreshComments(chip.id)
                })
                .catch((err) =>
                  setActionError(err instanceof Error ? err.message : 'Action failed.'),
                )
            }}
          >
            <textarea
              aria-label="Add a comment"
              value={draft}
              maxLength={1000}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="v2-inline-action">
              Post comment
            </button>
          </form>
        ) : (
          <p className="gallery-detail__hint">Sign in to comment.</p>
        )}
      </section>

      {lineage && (lineage.ancestors.length > 0 || lineage.childCount > 0) && (
        <section className="gallery-lineage" aria-label="Remix lineage">
          <p className="v2-kicker">Lineage</p>
          {lineage.ancestors.length > 0 && (
            <ol className="gallery-lineage__spine" aria-label="Ancestors">
              {lineage.ancestors.map((node, i) =>
                'hidden' in node ? (
                  <li
                    key={`hidden-${i}`}
                    className="gallery-lineage__node gallery-lineage__node--hidden"
                  >
                    a private chip
                  </li>
                ) : (
                  <li key={node.slug} className="gallery-lineage__node">
                    <Link to={`/gallery/${node.slug}`}>
                      <img src={node.posterImageUrl} alt={node.title} loading="lazy" />
                      <span>{node.title}</span>
                    </Link>
                  </li>
                ),
              )}
            </ol>
          )}
          {lineage.childCount > 0 && (
            <>
              <p className="gallery-lineage__count">
                {lineage.childCount} remix{lineage.childCount === 1 ? '' : 'es'} of this chip
              </p>
              <ul className="gallery-lineage__children" aria-label="Remixes">
                {lineage.children.map((node) => (
                  <li key={node.slug} className="gallery-lineage__node">
                    <Link to={`/gallery/${node.slug}`}>
                      <img src={node.posterImageUrl} alt={node.title} loading="lazy" />
                      <span>{node.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      {show3D && <Chip3DShowcase project={chip.project} onClose={() => setShow3D(false)} />}
    </main>
  )
}

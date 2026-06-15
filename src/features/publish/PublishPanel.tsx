import { useEffect, useRef, useState } from 'react'
import type Konva from 'konva'
import type { Project } from '../../domain/project'
import { DIE_EXPORT_PIXEL_RATIO, POSTER_EXPORT } from '../export/exportLayout'
import { DieExportStage } from '../export/DieExportStage'
import { PosterExportStage } from '../export/PosterExportStage'
import { useAuthStore } from '../../stores/authStoreContext'
import {
  livePublishApi,
  ServerUnreachableError,
  type PublishApi,
  type PublishedChip,
} from './publishApi'

type CapturedImages = { dieImageDataUrl: string; posterImageDataUrl: string }

type Props = {
  project: Project
  api?: PublishApi
  captureImages?: () => CapturedImages
}

const buttonClass =
  'rounded border border-cyan-700 px-3 py-2 text-xs uppercase tracking-wider text-cyan-100 transition-colors hover:border-cyan-400 hover:bg-cyan-950 disabled:cursor-not-allowed disabled:opacity-50'

export function PublishPanel({ project, api = livePublishApi, captureImages }: Props) {
  const auth = useAuthStore()
  const dieStageRef = useRef<Konva.Stage>(null)
  const posterStageRef = useRef<Konva.Stage>(null)
  const [published, setPublished] = useState<PublishedChip | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setPublished(null)
    setMessage(null)
    if (auth.status !== 'authenticated') return

    setLoading(true)
    api
      .getForProject(project.id)
      .then((chip) => {
        if (active) setPublished(chip)
      })
      .catch((error) => {
        if (!active) return
        setMessage(
          error instanceof ServerUnreachableError
            ? 'Share server is unreachable. Local editing is unaffected.'
            : error.message,
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [api, auth.status, project.id])

  function readImages(): CapturedImages {
    if (captureImages !== undefined) return captureImages()
    const dieImageDataUrl = dieStageRef.current?.toDataURL({ pixelRatio: DIE_EXPORT_PIXEL_RATIO })
    const posterImageDataUrl = posterStageRef.current?.toDataURL({
      pixelRatio: POSTER_EXPORT.pixelRatio,
    })
    if (!dieImageDataUrl || !posterImageDataUrl) throw new Error('Export stages are not ready.')
    return { dieImageDataUrl, posterImageDataUrl }
  }

  async function runAction(action: () => Promise<void>) {
    setLoading(true)
    setMessage(null)
    try {
      await action()
    } catch (error) {
      setMessage(
        error instanceof ServerUnreachableError
          ? 'Share server is unreachable. Local editing is unaffected.'
          : error instanceof Error
            ? error.message
            : 'Publish request failed.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function publishSnapshot() {
    await runAction(async () => {
      const images = readImages()
      const chip = await api.publish({
        project,
        title: project.name,
        dieImageDataUrl: images.dieImageDataUrl,
        posterImageDataUrl: images.posterImageDataUrl,
        isPublic: published?.isPublic ?? false,
      })
      setPublished(chip)
      setMessage(`Published v${chip.version}.`)
    })
  }

  async function toggleVisibility() {
    if (published === null) return
    await runAction(async () => {
      const chip = await api.setVisibility(project.id, !published.isPublic)
      setPublished(chip)
      setMessage(chip.isPublic ? 'Published chip is public.' : 'Published chip is private.')
    })
  }

  async function unpublish() {
    if (published === null) return
    await runAction(async () => {
      await api.unpublish(project.id)
      setPublished(null)
      setMessage('Unpublished.')
    })
  }

  async function copyShareLink() {
    const shareUrl = published?.shareUrl
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setMessage('Share link copied.')
    } catch {
      setMessage('Copy failed. Select and copy the link manually.')
    }
  }

  if (auth.status === 'unknown') {
    return (
      <section
        aria-label="Publish controls"
        className="editor-inspector-card editor-inspector-card--stack"
      >
        <p className="editor-kicker">Share Core</p>
        <h2>Publish</h2>
        <p className="text-sm text-[var(--v2-muted)]">Checking share account...</p>
      </section>
    )
  }

  if (auth.status === 'offline') {
    return (
      <section
        aria-label="Publish controls"
        className="editor-inspector-card editor-inspector-card--stack"
      >
        <p className="editor-kicker">Share Core</p>
        <h2>Publish</h2>
        <p className="text-sm text-[var(--v2-muted)]">
          Share server is offline. Local editing is unaffected.
        </p>
      </section>
    )
  }

  if (auth.status === 'anonymous') {
    return (
      <section
        aria-label="Publish controls"
        className="editor-inspector-card editor-inspector-card--stack"
      >
        <p className="editor-kicker">Share Core</p>
        <h2>Publish</h2>
        <p className="text-sm text-[var(--v2-muted)]">Sign in to publish this chip.</p>
      </section>
    )
  }

  return (
    <section
      aria-label="Publish controls"
      className="editor-inspector-card editor-inspector-card--stack"
    >
      <div>
        <p className="editor-kicker">Share Core</p>
        <h2>Publish</h2>
      </div>
      <div className="grid gap-2 text-sm text-[var(--v2-muted)]">
        {published ? (
          <p>
            Published v{published.version} · {published.isPublic ? 'Public' : 'Private'} · /s/
            {published.slug}
          </p>
        ) : (
          <p>Not published yet.</p>
        )}
        {message ? <p>{message}</p> : null}
      </div>
      {published?.isPublic && published.shareUrl ? (
        <div className="grid gap-1 text-sm text-[var(--v2-muted)]">
          <p className="break-all text-cyan-100">{published.shareUrl}</p>
          <button type="button" className={buttonClass} onClick={copyShareLink} disabled={loading}>
            Copy Link
          </button>
        </div>
      ) : null}
      <div className="grid gap-2">
        <button type="button" className={buttonClass} onClick={publishSnapshot} disabled={loading}>
          {published ? 'Republish Snapshot' : 'Publish Snapshot'}
        </button>
        {published ? (
          <>
            <button
              type="button"
              className={buttonClass}
              onClick={toggleVisibility}
              disabled={loading}
            >
              {published.isPublic ? 'Make Private' : 'Make Public'}
            </button>
            <button type="button" className={buttonClass} onClick={unpublish} disabled={loading}>
              Unpublish
            </button>
          </>
        ) : null}
      </div>
      {captureImages === undefined ? (
        <div
          className="pointer-events-none absolute left-[-10000px] top-[-10000px]"
          aria-hidden="true"
        >
          <DieExportStage ref={dieStageRef} project={project} />
          <PosterExportStage ref={posterStageRef} project={project} />
        </div>
      ) : null}
    </section>
  )
}

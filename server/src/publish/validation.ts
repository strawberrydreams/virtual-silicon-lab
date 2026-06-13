import { migrateProject } from '@domain/projectMigration'
import type { Project } from '@domain/project'

export type PublishInput = {
  project: Project
  title: string
  dieImageDataUrl: string
  posterImageDataUrl: string
  isPublic: boolean
}

type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string }

const PNG_DATA_URL_RE = /^data:image\/png;base64,[A-Za-z0-9+/=_-]+$/

function validatePngDataUrl(value: unknown, field: string): ValidationResult<string> {
  if (typeof value !== 'string' || !PNG_DATA_URL_RE.test(value)) {
    return { ok: false, message: `${field} must be a PNG data URL.` }
  }
  return { ok: true, value }
}

export function validatePublishInput(raw: unknown): ValidationResult<PublishInput> {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, message: 'Expected a JSON object.' }
  }
  const body = raw as Record<string, unknown>

  let project: Project
  try {
    project = migrateProject(body.project)
  } catch {
    return { ok: false, message: 'Project snapshot is invalid.' }
  }

  if (typeof body.title !== 'string') return { ok: false, message: 'Title is required.' }
  const title = body.title.trim()
  if (title.length === 0) return { ok: false, message: 'Title is required.' }
  if (title.length > 120) return { ok: false, message: 'Title must be 120 characters or fewer.' }

  const dieImageDataUrl = validatePngDataUrl(body.dieImageDataUrl, 'dieImageDataUrl')
  if (!dieImageDataUrl.ok) return dieImageDataUrl
  const posterImageDataUrl = validatePngDataUrl(body.posterImageDataUrl, 'posterImageDataUrl')
  if (!posterImageDataUrl.ok) return posterImageDataUrl

  if (body.isPublic !== undefined && typeof body.isPublic !== 'boolean') {
    return { ok: false, message: 'isPublic must be a boolean.' }
  }

  return {
    ok: true,
    value: {
      project,
      title,
      dieImageDataUrl: dieImageDataUrl.value,
      posterImageDataUrl: posterImageDataUrl.value,
      isPublic: body.isPublic === true,
    },
  }
}

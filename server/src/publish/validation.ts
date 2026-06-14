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
const DEFAULT_MAX_PNG_BYTES = 8 * 1024 * 1024

type PublishValidationOptions = {
  maxPngBytes?: number
}

function decodedBase64Bytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0
  return Math.floor((normalized.length * 3) / 4) - padding
}

function validatePngDataUrl(value: unknown, field: string, maxBytes: number): ValidationResult<string> {
  if (typeof value !== 'string' || !PNG_DATA_URL_RE.test(value)) {
    return { ok: false, message: `${field} must be a PNG data URL.` }
  }
  if (decodedBase64Bytes(value) > maxBytes) {
    return { ok: false, message: `${field} must be ${maxBytes} bytes or smaller.` }
  }
  return { ok: true, value }
}

export function validatePublishInput(
  raw: unknown,
  { maxPngBytes = DEFAULT_MAX_PNG_BYTES }: PublishValidationOptions = {},
): ValidationResult<PublishInput> {
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

  const dieImageDataUrl = validatePngDataUrl(body.dieImageDataUrl, 'dieImageDataUrl', maxPngBytes)
  if (!dieImageDataUrl.ok) return dieImageDataUrl
  const posterImageDataUrl = validatePngDataUrl(body.posterImageDataUrl, 'posterImageDataUrl', maxPngBytes)
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

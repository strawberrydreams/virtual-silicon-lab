import { CURRENT_SCHEMA_VERSION, type Project } from './project'
import { cloneStudioState, createDefaultStudioState } from './studioDefaults'

const SUPPORTED_SCHEMA_VERSIONS = new Set([1, 2, 3, 4, CURRENT_SCHEMA_VERSION])

export function migrateProject(value: unknown): Project {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('schemaVersion' in value) ||
    typeof value.schemaVersion !== 'number' ||
    !SUPPORTED_SCHEMA_VERSIONS.has(value.schemaVersion)
  ) {
    throw new Error('Unsupported project schema')
  }

  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.die !== 'object' ||
    candidate.die === null ||
    !Array.isArray(candidate.blocks) ||
    !Array.isArray(candidate.decorations) ||
    typeof candidate.theme !== 'string' ||
    typeof candidate.spec !== 'object' ||
    candidate.spec === null
  ) {
    throw new Error('Corrupt project record')
  }

  const project = value as Project
  // Schema 1 predates studio data; everything from schema 2 onward carries a
  // studio object, which cloneStudioState normalizes (e.g. defaulting spray blend).
  if (candidate.schemaVersion === 1) {
    return { ...project, schemaVersion: CURRENT_SCHEMA_VERSION, studio: createDefaultStudioState() }
  }

  const studio = validateStudio(candidate.studio) ? cloneStudioState(candidate.studio) : createDefaultStudioState()
  return { ...project, schemaVersion: CURRENT_SCHEMA_VERSION, studio }
}

function validateStudio(value: unknown): value is Project['studio'] {
  if (typeof value !== 'object' || value === null) return false
  const studio = value as Record<string, unknown>
  const tileSettings = studio.tileSettings as Record<string, unknown> | undefined
  return (
    studio.layoutMode === 'global-reflow' &&
    studio.detailMode === 'semi-auto' &&
    typeof tileSettings === 'object' &&
    tileSettings !== null &&
    typeof tileSettings.detailDensity === 'number' &&
    typeof tileSettings.routeIntensity === 'number' &&
    (tileSettings.contactStyle === 'minimal' ||
      tileSettings.contactStyle === 'balanced' ||
      tileSettings.contactStyle === 'dense') &&
    Array.isArray(studio.sprays) &&
    Array.isArray(studio.stickers)
  )
}

// Tolerant batch migration for repository `list()`: one unreadable record must
// not hide every other project. Failures are skipped (and logged), not thrown.
export function migrateProjects(values: unknown[]): Project[] {
  const projects: Project[] = []
  for (const value of values) {
    try {
      projects.push(migrateProject(value))
    } catch (error) {
      console.warn('[storage] skipping unreadable project record', error)
    }
  }
  return projects
}

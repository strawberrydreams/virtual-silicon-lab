import {
  CURRENT_SCHEMA_VERSION,
  isStyleTheme,
  type Block,
  type Die,
  type Project,
  type RemixOrigin,
} from './project'
import { isDieShape, isParametricDieShape, resolveDieShapeParams } from './die/dieShapeParams'
import { resolveFreeformVertices } from './die/freeformVertices'
import { isChipFinish, resolveChipFinish } from './material/chipFinish'
import { cloneStudioState, createDefaultStudioState } from './studioDefaults'
import { normalizeScene3DSettings } from './scene3d/scene3d'

const SUPPORTED_SCHEMA_VERSIONS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, CURRENT_SCHEMA_VERSION])

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
    !isStyleTheme(candidate.theme) ||
    typeof candidate.spec !== 'object' ||
    candidate.spec === null
  ) {
    throw new Error('Corrupt project record')
  }

  const project = value as Project
  const die = normalizePersistedDie(candidate.die)
  const finish = resolveChipFinish(candidate.finish, project.theme)
  const blocks = normalizePersistedBlocks(candidate.blocks)
  // Schema 1 predates studio data; everything from schema 2 onward carries a
  // studio object, which cloneStudioState normalizes (e.g. defaulting spray blend).
  if (candidate.schemaVersion === 1) {
    return withNormalizedRemixOrigin(
      {
        ...project,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        die,
        blocks,
        finish,
        studio: createDefaultStudioState(),
      },
      candidate.remixedFrom,
    )
  }

  const studio = validateStudio(candidate.studio)
    ? cloneStudioState(candidate.studio)
    : createDefaultStudioState()
  const scene3d = normalizeScene3DSettings(candidate.scene3d)
  const normalized = { ...project, schemaVersion: CURRENT_SCHEMA_VERSION, die, blocks, finish, studio }
  if (scene3d !== undefined) normalized.scene3d = scene3d
  else delete normalized.scene3d
  return withNormalizedRemixOrigin(
    normalized,
    candidate.remixedFrom,
  )
}

function normalizePersistedDie(value: unknown): Die {
  if (typeof value !== 'object' || value === null) throw new Error('Corrupt project record')
  const candidate = value as Record<string, unknown>
  if (
    !isDieShape(candidate.shape) ||
    typeof candidate.width !== 'number' ||
    !Number.isFinite(candidate.width) ||
    typeof candidate.height !== 'number' ||
    !Number.isFinite(candidate.height) ||
    typeof candidate.background !== 'string'
  ) {
    throw new Error('Corrupt project record')
  }

  const die: Die = {
    shape: candidate.shape,
    width: candidate.width,
    height: candidate.height,
    background: candidate.background,
  }
  if (die.shape === 'freeform') {
    die.freeform = { vertices: resolveFreeformVertices(candidate.freeform) }
  } else if (isParametricDieShape(die.shape)) {
    die.dieShapeParams = resolveDieShapeParams(die.shape, candidate.dieShapeParams)
  }
  return die
}

function normalizePersistedBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) throw new Error('Corrupt project record')
  return value.map((block) => {
    if (typeof block !== 'object' || block === null) throw new Error('Corrupt project record')
    const candidate = block as Block & Record<string, unknown>
    if (!isChipFinish(candidate.finish)) {
      const normalized = { ...candidate }
      delete normalized.finish
      return normalized as Block
    }
    return { ...candidate, finish: candidate.finish }
  })
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

function validateRemixOrigin(value: unknown): RemixOrigin | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const origin = value as Record<string, unknown>
  if (
    typeof origin.chipId !== 'string' ||
    typeof origin.slug !== 'string' ||
    typeof origin.title !== 'string'
  ) {
    return undefined
  }
  return { chipId: origin.chipId, slug: origin.slug, title: origin.title }
}

function withNormalizedRemixOrigin(project: Project, value: unknown): Project {
  const remixedFrom = validateRemixOrigin(value)
  if (remixedFrom === undefined) {
    const normalized = { ...project }
    delete normalized.remixedFrom
    return normalized
  }
  return { ...project, remixedFrom }
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

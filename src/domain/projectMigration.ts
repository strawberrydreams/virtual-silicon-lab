import { CURRENT_SCHEMA_VERSION, type Project } from './project'

export function migrateProject(value: unknown): Project {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== CURRENT_SCHEMA_VERSION
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

  return value as Project
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

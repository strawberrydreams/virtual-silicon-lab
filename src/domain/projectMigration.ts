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

  return value as Project
}

import type { Project } from './project'
import { migrateProject } from './projectMigration'

/**
 * Materializes a published-chip snapshot into a fresh, independent local
 * project. The snapshot is migrated to the current schema (it may predate the
 * importer's app version), then deep-cloned with a new identity so editing or
 * republishing the remix never touches the source. No remix-lineage metadata is
 * stored in v3 — lineage trees are a v4 concern.
 */
export function importRemixedProject(snapshot: unknown, id: string, now: number): Project {
  const migrated = migrateProject(snapshot)
  return {
    ...structuredClone(migrated),
    id,
    name: `${migrated.name} Remix`,
    createdAt: now,
    updatedAt: now,
  }
}

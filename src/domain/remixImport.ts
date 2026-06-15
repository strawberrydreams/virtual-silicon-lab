import type { Project, RemixOrigin } from './project'
import { migrateProject } from './projectMigration'

/**
 * Materializes a published-chip snapshot into a fresh, independent local
 * project. The snapshot is migrated to the current schema, then deep-cloned with
 * a new identity so editing or republishing the remix never touches the source.
 * When `origin` is supplied (a gallery/share remix of a published chip), it is
 * recorded as `remixedFrom` so a later publish can establish server-side remix
 * lineage. Preset/random remixes pass no origin.
 */
export function importRemixedProject(
  snapshot: unknown,
  id: string,
  now: number,
  origin?: RemixOrigin,
): Project {
  const migrated = migrateProject(snapshot)
  return {
    ...structuredClone(migrated),
    id,
    name: `${migrated.name} Remix`,
    createdAt: now,
    updatedAt: now,
    ...(origin ? { remixedFrom: origin } : {}),
  }
}

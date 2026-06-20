import type { Project } from '../project'
import { migrateProject } from '../projectMigration'

/**
 * Materializes an AI-generated draft Project snapshot into a fresh local project.
 * The network-sourced snapshot is migrated and cloned before receiving a new identity.
 * AI generation is original creation, so imported remix lineage is intentionally dropped.
 */
export function materializeAiDraftProject(snapshot: unknown, id: string, now: number): Project {
  const migrated = structuredClone(migrateProject(snapshot))
  delete migrated.remixedFrom
  return {
    ...migrated,
    id,
    createdAt: now,
    updatedAt: now,
  }
}

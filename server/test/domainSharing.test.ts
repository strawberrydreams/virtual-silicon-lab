import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'
import { createProject } from '@domain/projectFactory'
import { migrateProject } from '@domain/projectMigration'

describe('shared domain modules under node', () => {
  it('round-trips a factory project through JSON and migrateProject', () => {
    const project = createProject('Server Smoke Chip')
    const revived = migrateProject(JSON.parse(JSON.stringify(project)))
    expect(revived.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(revived.name).toBe('Server Smoke Chip')
    expect(revived.die.shape).toBe('rect')
  })

  it('rejects a snapshot with an unsupported schema version', () => {
    expect(() => migrateProject({ schemaVersion: 999 })).toThrow('Unsupported project schema')
  })

  it('rejects a structurally corrupt snapshot', () => {
    expect(() =>
      migrateProject({ schemaVersion: CURRENT_SCHEMA_VERSION, id: 42 }),
    ).toThrow('Corrupt project record')
  })
})

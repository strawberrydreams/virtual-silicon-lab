import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION, type RemixOrigin } from './project'
import { createProject } from './projectFactory'
import { importRemixedProject } from './remixImport'

describe('importRemixedProject', () => {
  it('assigns a fresh id, "<name> Remix" name, and now timestamps', () => {
    const snapshot = createProject('Ada Chip', 'source-id', 1_000)

    const remix = importRemixedProject(snapshot, 'new-id', 5_000)

    expect(remix.id).toBe('new-id')
    expect(remix.name).toBe('Ada Chip Remix')
    expect(remix.createdAt).toBe(5_000)
    expect(remix.updatedAt).toBe(5_000)
    expect(remix.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('produces an independent deep clone (mutating the result never touches the input)', () => {
    const snapshot = createProject('Ada Chip', 'source-id', 1_000)

    const remix = importRemixedProject(snapshot, 'new-id', 5_000)
    remix.die.shape = 'circle'
    remix.spec.features.push('Injected')

    expect(snapshot.die.shape).toBe('rect')
    expect(snapshot.spec.features).not.toContain('Injected')
    expect(snapshot.id).toBe('source-id')
  })

  it('migrates an older-schema snapshot to the current schema', () => {
    const legacy = {
      ...createProject('Legacy Chip', 'old-id', 1_000),
      schemaVersion: 1,
    }
    // Schema 1 predates studio; strip it so the migration must rebuild it.
    delete (legacy as { studio?: unknown }).studio

    const remix = importRemixedProject(legacy, 'new-id', 5_000)

    expect(remix.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(remix.name).toBe('Legacy Chip Remix')
    expect(remix.studio.layoutMode).toBe('global-reflow')
  })

  it('throws on a corrupt snapshot', () => {
    expect(() => importRemixedProject({ not: 'a project' }, 'new-id', 5_000)).toThrow()
  })

  it('sets remixedFrom when an origin is provided', () => {
    const snapshot = createProject('Ada Chip', 'source-id', 1_000)
    const origin: RemixOrigin = { chipId: 'c1', slug: 's1', title: 'Parent' }

    const remix = importRemixedProject(snapshot, 'new-id', 5_000, origin)

    expect(remix.remixedFrom).toEqual(origin)
  })

  it('leaves remixedFrom undefined when no origin is provided', () => {
    const snapshot = createProject('Ada Chip', 'source-id', 1_000)

    const remix = importRemixedProject(snapshot, 'new-id', 5_000)

    expect(remix.remixedFrom).toBeUndefined()
  })
})

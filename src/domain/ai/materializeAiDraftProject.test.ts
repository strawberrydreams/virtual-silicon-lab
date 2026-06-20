import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '../project'
import { createProject } from '../projectFactory'
import { materializeAiDraftProject } from './materializeAiDraftProject'

describe('materializeAiDraftProject', () => {
  it('assigns a fresh id and now timestamps while preserving the AI-chosen name', () => {
    const snapshot = createProject('NEON DREAM', 'draft-id', 1_000)
    snapshot.remixedFrom = { chipId: 'source', slug: 'source', title: 'Source' }
    const project = materializeAiDraftProject(snapshot, 'local-1', 5_000)
    expect(project.id).toBe('local-1')
    expect(project.name).toBe('NEON DREAM')
    expect(project.createdAt).toBe(5_000)
    expect(project.updatedAt).toBe(5_000)
    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(project.remixedFrom).toBeUndefined()
  })

  it('produces an independent deep clone (mutating the result never touches the input)', () => {
    const snapshot = createProject('Chip', 'draft-id', 1_000)
    const project = materializeAiDraftProject(snapshot, 'local-1', 5_000)
    project.die.shape = 'circle'
    project.spec.features.push('Injected')
    expect(snapshot.die.shape).toBe('rect')
    expect(snapshot.spec.features).not.toContain('Injected')
    expect(snapshot.id).toBe('draft-id')
  })

  it('migrates an older-schema snapshot to the current schema', () => {
    const legacy = { ...createProject('Legacy', 'old-id', 1_000), schemaVersion: 1 }
    delete (legacy as { studio?: unknown }).studio
    const project = materializeAiDraftProject(legacy, 'local-1', 5_000)
    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(project.name).toBe('Legacy')
    expect(project.studio.layoutMode).toBe('global-reflow')
  })

  it('throws on a corrupt snapshot', () => {
    expect(() => materializeAiDraftProject({ not: 'a project' }, 'local-1', 5_000)).toThrow()
  })
})

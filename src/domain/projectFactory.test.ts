import { describe, expect, it } from 'vitest'
import { createProject } from './projectFactory'

describe('createProject', () => {
  it('creates a schema version 1 project with an empty rectangular die', () => {
    const project = createProject('Dream Chip', 'project-1', 100)

    expect(project).toMatchObject({
      schemaVersion: 1,
      id: 'project-1',
      name: 'Dream Chip',
      createdAt: 100,
      updatedAt: 100,
      die: { shape: 'rect', width: 960, height: 640 },
      blocks: [],
      decorations: [],
      theme: 'neon',
    })
  })
})

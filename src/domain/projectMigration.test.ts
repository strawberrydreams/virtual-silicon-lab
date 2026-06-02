import { describe, expect, it } from 'vitest'
import { migrateProject } from './projectMigration'

describe('migrateProject', () => {
  it('accepts a schema version 1 project', () => {
    const project = migrateProject({
      schemaVersion: 1,
      id: 'project-1',
      name: 'Dream Chip',
      createdAt: 100,
      updatedAt: 100,
      die: { shape: 'rect', width: 960, height: 640, background: 'grid-cyan' },
      blocks: [],
      decorations: [],
      theme: 'neon',
      spec: {
        brand: 'NOCTURNE',
        series: 'ONEIRIC',
        generation: 'I',
        process: '0.5nm soul engraving',
        cores: 8,
        bandwidth: '4.2 TB/s',
        features: ['Lucid cache'],
        description: 'A processor for synthetic dreams.',
      },
    })

    expect(project.schemaVersion).toBe(1)
  })

  it('rejects data without a supported schema version', () => {
    expect(() => migrateProject({ id: 'broken' })).toThrow('Unsupported project schema')
  })
})

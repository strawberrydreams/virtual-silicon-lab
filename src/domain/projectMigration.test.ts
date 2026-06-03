import { describe, expect, it } from 'vitest'
import { migrateProject, migrateProjects } from './projectMigration'

function validProject(id: string) {
  return {
    schemaVersion: 1,
    id,
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
  }
}

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

  it('rejects a right-version record with a structurally invalid shape', () => {
    expect(() => migrateProject({ schemaVersion: 1, id: 'x' })).toThrow('Corrupt project record')
  })

  it('migrateProjects keeps valid records and skips unreadable ones', () => {
    const result = migrateProjects([
      validProject('good-1'),
      { schemaVersion: 1, id: 'half-written' },
      'not even an object',
      validProject('good-2'),
    ])

    expect(result.map((project) => project.id)).toEqual(['good-1', 'good-2'])
  })
})

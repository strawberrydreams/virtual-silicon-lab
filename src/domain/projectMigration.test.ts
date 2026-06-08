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
  it('migrates a schema version 1 project into the current studio defaults', () => {
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

    expect(project.schemaVersion).toBe(3)
    expect(project.studio).toEqual({
      layoutMode: 'global-reflow',
      detailMode: 'semi-auto',
      tileSettings: {
        detailDensity: 0.62,
        routeIntensity: 0.58,
        contactStyle: 'balanced',
      },
      sprays: [],
      stickers: [],
    })
  })

  it('migrates a schema version 2 studio project to v3, defaulting spray blend', () => {
    const project = migrateProject({
      ...validProject('studio-1'),
      schemaVersion: 2,
      studio: {
        layoutMode: 'global-reflow',
        detailMode: 'semi-auto',
        tileSettings: {
          detailDensity: 0.9,
          routeIntensity: 0.8,
          contactStyle: 'dense',
        },
        sprays: [
          {
            id: 'spray-1',
            x: 40,
            y: 48,
            radius: 120,
            color: '#ff70dc',
            intensity: 0.75,
          },
        ],
        stickers: [
          {
            id: 'sticker-1',
            kind: 'badge',
            x: 120,
            y: 80,
            text: 'STAR',
            color: '#f9f4ff',
            rotation: -8,
          },
        ],
      },
    })

    expect(project.schemaVersion).toBe(3)
    expect(project.studio.sprays).toHaveLength(1)
    expect(project.studio.sprays[0].blend).toBe('screen')
    expect(project.studio.stickers).toHaveLength(1)
    expect(project.studio.tileSettings.contactStyle).toBe('dense')
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

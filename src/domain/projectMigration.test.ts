import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from './project'
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

    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(project.studio).toEqual({
      layoutMode: 'global-reflow',
      detailMode: 'semi-auto',
      tileSettings: {
        detailDensity: 0.62,
        routeIntensity: 0.58,
        contactStyle: 'balanced',
      },
      colorSettings: expect.objectContaining({
        background: { mode: 'solid', color: '#03070b' },
        die: { mode: 'gradient', from: '#13203a', to: '#1b1640' },
        block: { mode: 'solid', color: '#16253d' },
        trace: { mode: 'solid', color: '#58d9f5' },
      }),
      sprays: [],
      stickers: [],
    })
  })

  it('migrates a schema version 2 studio project to current version, defaulting spray blend', () => {
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

    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(project.studio.sprays).toHaveLength(1)
    expect(project.studio.sprays[0].blend).toBe('screen')
    expect(project.studio.stickers).toHaveLength(1)
    expect(project.studio.tileSettings.contactStyle).toBe('dense')
    expect(project.studio.colorSettings.tile.mode).toBe('solid')
  })

  it('preserves schema v4 color settings and block custom images', () => {
    const project = migrateProject({
      ...validProject('v4-project'),
      schemaVersion: 4,
      blocks: [
        {
          id: 'custom-tile',
          type: 'CPU',
          category: 'real',
          x: 16,
          y: 16,
          w: 120,
          h: 80,
          rotation: 0,
          glow: false,
          zIndex: 0,
          imageDataUrl: 'data:image/png;base64,abc',
        },
      ],
      studio: {
        layoutMode: 'global-reflow',
        detailMode: 'semi-auto',
        tileSettings: {
          detailDensity: 0.9,
          routeIntensity: 0.8,
          contactStyle: 'dense',
        },
        colorSettings: {
          background: { mode: 'solid', color: '#101010' },
          package: { mode: 'solid', color: '#202020' },
          die: { mode: 'gradient', from: '#111111', to: '#333333' },
          block: { mode: 'solid', color: '#444444' },
          tile: { mode: 'gradient', from: '#555555', to: '#777777' },
          trace: { mode: 'solid', color: '#888888' },
          label: { mode: 'solid', color: '#eeeeee' },
          mark: { mode: 'solid', color: '#ff00ff' },
        },
        sprays: [],
        stickers: [],
      },
    })

    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(project.studio.colorSettings.die).toEqual({
      mode: 'gradient',
      from: '#111111',
      to: '#333333',
    })
    expect(project.blocks[0].imageDataUrl).toBe('data:image/png;base64,abc')
  })

  it('migrates a schema version 4 project to current version without a remix origin', () => {
    const migrated = migrateProject({
      ...validProject('v4-no-origin'),
      schemaVersion: 4,
      studio: undefined,
    })

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(migrated.remixedFrom).toBeUndefined()
  })

  it('preserves remixedFrom when migrating a current-version project', () => {
    const migrated = migrateProject({
      ...validProject('with-origin'),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      studio: undefined,
      remixedFrom: { chipId: 'c1', slug: 's1', title: 'Parent' },
    })

    expect(migrated.remixedFrom).toEqual({ chipId: 'c1', slug: 's1', title: 'Parent' })
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

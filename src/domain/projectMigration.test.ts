import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from './project'
import { defaultFinishForTheme } from './material/chipFinish'
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

  it('drops invalid remixedFrom metadata when migrating a current-version project', () => {
    const migrated = migrateProject({
      ...validProject('bad-origin'),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      studio: undefined,
      remixedFrom: { chipId: 42, slug: 's1', title: 'Parent' },
    })

    expect(migrated.remixedFrom).toBeUndefined()
  })

  it('migrates a schema version 3 project to current version, preserving studio settings', () => {
    const project = migrateProject({
      ...validProject('v3-project'),
      schemaVersion: 3,
      studio: {
        layoutMode: 'global-reflow',
        detailMode: 'semi-auto',
        tileSettings: {
          detailDensity: 0.7,
          routeIntensity: 0.6,
          contactStyle: 'minimal',
        },
        sprays: [],
        stickers: [],
      },
    })

    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(project.studio.tileSettings.contactStyle).toBe('minimal')
  })

  it('is idempotent: re-migrating an already-migrated project is a stable no-op', () => {
    const once = migrateProject({
      ...validProject('idempotent'),
      schemaVersion: 2,
      studio: {
        layoutMode: 'global-reflow',
        detailMode: 'semi-auto',
        tileSettings: {
          detailDensity: 0.5,
          routeIntensity: 0.5,
          contactStyle: 'balanced',
        },
        sprays: [],
        stickers: [],
      },
    })
    const twice = migrateProject(once)

    expect(twice).toEqual(once)
  })

  it('migrates a schema version 5 project to schema 8 without adding params', () => {
    const migrated = migrateProject({
      ...validProject('v5-project'),
      schemaVersion: 5,
      studio: undefined,
    })

    expect(migrated.schemaVersion).toBe(9)
    expect(migrated.finish).toBe('gloss')
    expect(migrated.die).toEqual({
      shape: 'rect',
      width: 960,
      height: 640,
      background: 'grid-cyan',
    })
  })

  it('preserves and normalizes schema 6 parametric die parameters', () => {
    const base = validProject('v6-project')
    const migrated = migrateProject({
      ...base,
      schemaVersion: 6,
      die: {
        ...base.die,
        shape: 'rounded-rect',
        dieShapeParams: { cornerRadius: 0.2, chamfer: 0.3 },
      },
      studio: undefined,
    })

    expect(migrated.die.dieShapeParams).toEqual({ cornerRadius: 0.2 })
    expect(migrateProject(migrated)).toEqual(migrated)
  })

  it('migrates a schema version 6 project to schema 8 with the theme-derived default finish', () => {
    const migrated = migrateProject({
      ...validProject('v6-finish-default'),
      schemaVersion: 6,
      theme: 'military',
      studio: undefined,
    })

    expect(migrated.schemaVersion).toBe(9)
    expect(migrated.finish).toBe('matte')
    expect(migrated.finish).toBe(defaultFinishForTheme('military'))
  })

  it('preserves a valid schema 7 finish while migrating to schema 8', () => {
    const migrated = migrateProject({
      ...validProject('v7-finish'),
      schemaVersion: 7,
      theme: 'neon',
      finish: 'metallic',
      studio: undefined,
    })

    expect(migrated.schemaVersion).toBe(9)
    expect(migrated.finish).toBe('metallic')
  })

  it('defaults malformed schema 7 finish without rejecting the project', () => {
    const migrated = migrateProject({
      ...validProject('bad-finish'),
      schemaVersion: 7,
      theme: 'retro',
      finish: 'mirror',
      studio: undefined,
    })

    expect(migrated.finish).toBe('satin')
  })

  it('rejects an invalid persisted theme before resolving a default finish', () => {
    expect(() =>
      migrateProject({
        ...validProject('bad-theme'),
        schemaVersion: 7,
        theme: 'vaporwave',
        finish: 'mirror',
        studio: undefined,
      }),
    ).toThrow('Corrupt project record')
  })

  it('migrates schema 7 blocks to schema 8 without adding block overrides', () => {
    const base = validProject('v7-block-inherit')
    const migrated = migrateProject({
      ...base,
      schemaVersion: 7,
      finish: 'gloss',
      studio: undefined,
      blocks: [
        {
          id: 'cpu-1',
          type: 'CPU',
          category: 'real',
          x: 16,
          y: 16,
          w: 120,
          h: 80,
          rotation: 0,
          zIndex: 0,
        },
      ],
    })

    expect(migrated.schemaVersion).toBe(9)
    expect(migrated.blocks[0]).not.toHaveProperty('finish')
  })

  it('preserves valid schema 8 block finish overrides', () => {
    const base = validProject('v8-block-finish')
    const migrated = migrateProject({
      ...base,
      schemaVersion: 8,
      finish: 'gloss',
      studio: undefined,
      blocks: [
        {
          id: 'gpu-1',
          type: 'GPU',
          category: 'real',
          x: 32,
          y: 32,
          w: 140,
          h: 96,
          rotation: 0,
          zIndex: 0,
          finish: 'metallic',
        },
      ],
    })

    expect(migrated.blocks[0]).toMatchObject({ id: 'gpu-1', finish: 'metallic' })
  })

  it('drops malformed schema 8 block finish overrides so the block inherits', () => {
    const base = validProject('v8-bad-block-finish')
    const migrated = migrateProject({
      ...base,
      schemaVersion: 8,
      finish: 'gloss',
      studio: undefined,
      blocks: [
        {
          id: 'cache-1',
          type: 'Cache',
          category: 'real',
          x: 48,
          y: 48,
          w: 100,
          h: 72,
          rotation: 0,
          zIndex: 0,
          finish: 'mirror',
        },
      ],
    })

    expect(migrated.blocks[0]).not.toHaveProperty('finish')
  })

  it('migrates schema 8 projects to schema 9 without adding scene3d', () => {
    const migrated = migrateProject({
      ...validProject('v8-no-scene'),
      schemaVersion: 8,
      finish: 'gloss',
      studio: undefined,
    })

    expect(migrated.schemaVersion).toBe(9)
    expect(migrated).not.toHaveProperty('scene3d')
  })

  it('preserves and clamps valid schema 9 scene3d camera settings', () => {
    const migrated = migrateProject({
      ...validProject('v9-scene-camera'),
      schemaVersion: 9,
      finish: 'gloss',
      studio: undefined,
      scene3d: {
        camera: {
          azimuthRadians: Math.PI * 3,
          elevationRadians: 2,
          zoom: 1.5,
          targetNudge: [0.25, -0.5, 2],
          fov: 80,
        },
      },
    })

    expect(migrated.scene3d?.camera).toEqual({
      azimuthRadians: Math.PI,
      elevationRadians: 1.4,
      zoom: 1,
      targetNudge: [0.25, -0.5, 1],
      fov: 60,
    })
  })

  it('preserves and clamps valid schema 9 scene3d lighting settings', () => {
    const migrated = migrateProject({
      ...validProject('v9-scene-lighting'),
      schemaVersion: 9,
      finish: 'gloss',
      studio: undefined,
      scene3d: {
        lighting: { preset: 'neon-noir', intensity: 8 },
      },
    })

    expect(migrated.scene3d).toEqual({
      lighting: { preset: 'neon-noir', intensity: 1.8 },
    })
  })

  it('drops malformed schema 9 scene3d lighting without dropping a valid camera', () => {
    const migrated = migrateProject({
      ...validProject('v9-scene-bad-lighting'),
      schemaVersion: 9,
      finish: 'gloss',
      studio: undefined,
      scene3d: {
        camera: { azimuthRadians: 0.2, elevationRadians: 0.4, zoom: 0.5 },
        lighting: { preset: 'future', intensity: 1 },
      },
    })

    expect(migrated.scene3d?.lighting).toBeUndefined()
    expect(migrated.scene3d?.camera?.azimuthRadians).toBeCloseTo(0.2)
    expect(migrated.scene3d?.camera?.elevationRadians).toBe(0.4)
    expect(migrated.scene3d?.camera?.zoom).toBe(0.5)
  })

  it('drops malformed scene3d data without rejecting the project', () => {
    const migrated = migrateProject({
      ...validProject('bad-scene'),
      schemaVersion: 9,
      finish: 'gloss',
      studio: undefined,
      scene3d: {
        camera: { azimuthRadians: 'north', elevationRadians: null, zoom: [] },
        lighting: { preset: 'future' },
      },
    })

    expect(migrated).not.toHaveProperty('scene3d')
  })

  it('defaults malformed schema 6 params without rejecting the project', () => {
    const base = validProject('bad-param')
    const migrated = migrateProject({
      ...base,
      schemaVersion: 6,
      die: { ...base.die, shape: 'plus', dieShapeParams: { armWidth: Infinity } },
      studio: undefined,
    })

    expect(migrated.die.dieShapeParams).toEqual({ armWidth: 0.36 })
  })

  it('rejects an unknown persisted die shape', () => {
    const base = validProject('bad-shape')
    expect(() =>
      migrateProject({
        ...base,
        schemaVersion: 6,
        die: { ...base.die, shape: 'triangle' },
      }),
    ).toThrow('Corrupt project record')
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

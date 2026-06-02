import { describe, expect, it } from 'vitest'
import { clampBlockToDie } from '../features/editor/canvas/geometry'
import { PRESET_CATALOG } from './presetCatalog'
import { createPresetProject } from './presetFactory'

describe('createPresetProject', () => {
  it('materializes every catalog entry as a bounded editable project', () => {
    for (const preset of PRESET_CATALOG) {
      const project = createPresetProject(preset.id, `project-${preset.id}`, 100)
      expect(project).toMatchObject({
        id: `project-${preset.id}`,
        theme: preset.theme,
        die: { shape: preset.dieShape },
        createdAt: 100,
        updatedAt: 100,
      })
      expect(project.blocks.length).toBeGreaterThanOrEqual(4)
      for (const block of project.blocks) {
        expect(clampBlockToDie(block, project.die)).toEqual({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
        })
      }
    }
  })

  it('creates fresh nested ids and arrays for each remix', () => {
    const first = createPresetProject('neon-district-n9', 'first', 100)
    const second = createPresetProject('neon-district-n9', 'second', 200)

    expect(first.blocks[0].id).not.toBe(second.blocks[0].id)
    expect(first.decorations[0].id).not.toBe(second.decorations[0].id)
    first.blocks[0].x = 999
    first.spec.features.push('Mutation')

    expect(second.blocks[0].x).not.toBe(999)
    expect(second.spec.features).not.toContain('Mutation')
  })

  it('reuses the reviewed AURORA composition as the keynote preset', () => {
    const project = createPresetProject('aurora-c1', 'aurora', 300)
    expect(project.name).toContain('AURORA C-1')
    expect(project.blocks.map((block) => block.type)).toContain('ConsciousnessProcessor')
    expect(project.spec.brand).toBe('AURORA')
  })
})

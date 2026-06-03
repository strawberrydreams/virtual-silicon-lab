import { describe, expect, it } from 'vitest'
import { clampBlockToDie } from '../features/editor/canvas/geometry'
import { HERO_SET_CATALOG, createHeroSetProject, isHeroSetId } from './heroSetCatalog'

describe('hero set catalog', () => {
  it('defines the ten v2 hero chip and poster targets', () => {
    expect(HERO_SET_CATALOG).toHaveLength(10)
    expect(HERO_SET_CATALOG.map((hero) => hero.id)).toEqual([
      'aurora-m5',
      'panther-scale',
      'n1-green-horizon',
      'snapdragon-frame',
      'crescent-blue',
      'pentium-density-map',
      'exynos-annotated-core',
      'serpent-tile-array',
      'lucid-mono-package',
      'orbital-dream-tile',
    ])
  })

  it('records page theme, chip theme, poster format, and material intent for every hero', () => {
    for (const hero of HERO_SET_CATALOG) {
      expect(hero.pageTheme).toMatch(/^(laboratory|anime|space)$/)
      expect(hero.theme).toMatch(/^(neon|retro|military|keynote|mono)$/)
      expect(hero.posterFormat).toMatch(/^(press-hero|architecture-slide|product-closeup)$/)
      expect(hero.materialIntent.length).toBeGreaterThan(12)
      expect(hero.previewBlocks.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('materializes every hero as bounded editable project data', () => {
    for (const hero of HERO_SET_CATALOG) {
      const project = createHeroSetProject(hero.id, `project-${hero.id}`, 100)
      expect(project).toMatchObject({
        id: `project-${hero.id}`,
        name: hero.name,
        theme: hero.theme,
        die: { shape: hero.dieShape },
      })
      expect(project.blocks.length).toBeGreaterThanOrEqual(5)
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

  it('recognizes only hero set ids', () => {
    expect(isHeroSetId('aurora-m5')).toBe(true)
    expect(isHeroSetId('aurora-c1')).toBe(false)
  })
})

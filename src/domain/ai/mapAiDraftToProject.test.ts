import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '../project'
import { mapAiDraftToProject } from './mapAiDraftToProject'
import type { AiChipDraft } from './aiChipDraft'

const base: AiChipDraft = {
  name: 'Test Chip',
  dieShape: 'square',
  blocks: [{ type: 'CPU', label: 'Core', x: 0.1, y: 0.1, w: 0.3, h: 0.3 }],
}

describe('mapAiDraftToProject', () => {
  it('produces a schema-current project with the requested die shape and name', () => {
    const project = mapAiDraftToProject(base, 'p1', 1000)
    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(project.name).toBe('Test Chip')
    expect(project.die.shape).toBe('square')
    expect(project.blocks).toHaveLength(1)
    expect(project.blocks[0].type).toBe('CPU')
    expect(project.blocks[0].label).toBe('Core')
  })

  it('clamps out-of-bounds blocks inside the die', () => {
    const draft: AiChipDraft = {
      dieShape: 'rect',
      blocks: [{ type: 'GPU', x: 2, y: 2, w: 5, h: 5 }],
    }
    const project = mapAiDraftToProject(draft)
    const { width, height } = project.die
    const b = project.blocks[0]
    expect(b.w).toBeLessThanOrEqual(width)
    expect(b.h).toBeLessThanOrEqual(height)
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.y).toBeGreaterThanOrEqual(0)
    expect(b.x + b.w).toBeLessThanOrEqual(width)
    expect(b.y + b.h).toBeLessThanOrEqual(height)
  })

  it('skips unknown block types and assigns sequential z-order', () => {
    const draft: AiChipDraft = {
      dieShape: 'rect',
      blocks: [
        { type: 'CPU', x: 0, y: 0, w: 0.2, h: 0.2 },
        { type: 'Nonsense', x: 0.3, y: 0, w: 0.2, h: 0.2 },
        { type: 'Cache', x: 0.6, y: 0, w: 0.2, h: 0.2 },
      ],
    }
    const project = mapAiDraftToProject(draft)
    expect(project.blocks.map((b) => b.type)).toEqual(['CPU', 'Cache'])
    expect(project.blocks.map((b) => b.zIndex)).toEqual([0, 1])
  })

  it('falls back to a default name and accepts an empty block list', () => {
    const project = mapAiDraftToProject({ dieShape: 'hexagon', blocks: [] })
    expect(project.name).toBe('AI Draft Chip')
    expect(project.blocks).toEqual([])
  })

  it('falls back to a rect die for an unknown die shape', () => {
    const project = mapAiDraftToProject({ dieShape: 'blob' as never, blocks: [] })
    expect(project.die.shape).toBe('rect')
  })
})

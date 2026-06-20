import { describe, expect, it } from 'vitest'
import { buildBlock } from '../blockFactory'
import { createProject } from '../projectFactory'
import { deriveAiLayoutContext } from './deriveAiLayoutContext'

describe('deriveAiLayoutContext', () => {
  it('derives the die shape and existing blocks as fractional rectangles', () => {
    const project = createProject('Chip', 'p1', 0)
    project.die = { ...project.die, shape: 'square', width: 800, height: 800 }
    project.blocks = [
      { ...buildBlock(project, 'CPU', 'cpu'), x: 80, y: 160, w: 200, h: 80, zIndex: 0 },
    ]
    const ctx = deriveAiLayoutContext(project)
    expect(ctx.dieShape).toBe('square')
    expect(ctx.blocks).toEqual([{ type: 'CPU', x: 0.1, y: 0.2, w: 0.25, h: 0.1 }])
  })

  it('returns an empty block list for a blank project', () => {
    const ctx = deriveAiLayoutContext(createProject('Blank', 'p2', 0))
    expect(ctx.blocks).toEqual([])
    expect(ctx.dieShape).toBe('rect')
  })
})

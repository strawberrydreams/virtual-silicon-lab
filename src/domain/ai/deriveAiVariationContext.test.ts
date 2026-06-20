import { describe, expect, it } from 'vitest'
import { buildBlock } from '../blockFactory'
import { createProject } from '../projectFactory'
import { deriveAiVariationContext } from './deriveAiVariationContext'

describe('deriveAiVariationContext', () => {
  it('derives name, theme, die shape, and existing blocks as fractional rectangles', () => {
    const project = createProject('Nova Chip', 'p1', 0)
    project.theme = 'retro'
    project.die = { ...project.die, shape: 'square', width: 800, height: 800 }
    project.blocks = [
      { ...buildBlock(project, 'CPU', 'cpu'), x: 80, y: 160, w: 200, h: 80, zIndex: 0 },
    ]

    const context = deriveAiVariationContext(project)

    expect(context.name).toBe('Nova Chip')
    expect(context.theme).toBe('retro')
    expect(context.dieShape).toBe('square')
    expect(context.blocks).toEqual([{ type: 'CPU', x: 0.1, y: 0.2, w: 0.25, h: 0.1 }])
  })

  it('returns an empty block list for a blank project', () => {
    const context = deriveAiVariationContext(createProject('Blank', 'p2', 0))

    expect(context.blocks).toEqual([])
    expect(context.dieShape).toBe('rect')
  })
})

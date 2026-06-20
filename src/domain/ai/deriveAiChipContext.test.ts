import { describe, expect, it } from 'vitest'
import { createProject } from '../projectFactory'
import { buildBlock } from '../blockFactory'
import { deriveAiChipContext } from './deriveAiChipContext'

describe('deriveAiChipContext', () => {
  it('derives name, theme, die shape, and a deduped block-type list', () => {
    const project = createProject('NEON DREAM', 'p1', 0)
    project.theme = 'mono'
    project.die = { ...project.die, shape: 'hexagon' }
    project.blocks = [
      { ...buildBlock(project, 'CPU'), zIndex: 0 },
      { ...buildBlock(project, 'CPU'), zIndex: 1 },
      { ...buildBlock(project, 'Cache'), zIndex: 2 },
    ]
    const ctx = deriveAiChipContext(project)
    expect(ctx.name).toBe('NEON DREAM')
    expect(ctx.theme).toBe('mono')
    expect(ctx.dieShape).toBe('hexagon')
    expect(ctx.blockTypes).toEqual(['CPU', 'Cache'])
  })

  it('returns an empty block-type list for a blank project', () => {
    const ctx = deriveAiChipContext(createProject('Blank', 'p2', 0))
    expect(ctx.blockTypes).toEqual([])
    expect(ctx.theme).toBe('neon')
    expect(ctx.dieShape).toBe('rect')
  })
})

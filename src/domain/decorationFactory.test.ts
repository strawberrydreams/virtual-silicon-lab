import { describe, expect, it } from 'vitest'
import { createProject } from './projectFactory'
import { buildDecoration, nextDecorationZIndex } from './decorationFactory'

describe('nextDecorationZIndex', () => {
  it('returns 0 for no decorations and max+1 otherwise', () => {
    expect(nextDecorationZIndex([])).toBe(0)
    expect(nextDecorationZIndex([{ id: 'a', kind: 'warningMark', x: 0, y: 0, zIndex: 4 }])).toBe(5)
  })
})

describe('buildDecoration', () => {
  it('places a neon line across the die center with a theme-resolved color', () => {
    const project = createProject('p', 'p1', 0)
    const decoration = buildDecoration(project, 'neonLine', 'd1')
    expect(decoration).toMatchObject({ id: 'd1', kind: 'neonLine', color: '', zIndex: 0 })
    if (decoration.kind !== 'neonLine') throw new Error('expected neonLine')
    expect(decoration.points).toHaveLength(4)
  })

  it('places marks and labels at the die center', () => {
    const project = createProject('p', 'p1', 0)
    const warning = buildDecoration(project, 'warningMark', 'd2')
    expect(warning).toMatchObject({ kind: 'warningMark', x: 480, y: 320 })
    const label = buildDecoration(project, 'label', 'd3')
    expect(label).toMatchObject({ kind: 'label', text: 'LABEL', x: 480, y: 320 })
  })
})

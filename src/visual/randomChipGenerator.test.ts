import { describe, expect, it } from 'vitest'
import { clampBlockToDie } from '../features/editor/canvas/geometry'
import { generateRandomChipProject } from './randomChipGenerator'

describe('generateRandomChipProject', () => {
  it('generates deterministic project data from a seed', () => {
    expect(generateRandomChipProject('seed-a', 'project-a', 100)).toEqual(
      generateRandomChipProject('seed-a', 'project-a', 100),
    )
    expect(generateRandomChipProject('seed-b', 'project-b', 100).blocks).not.toEqual(
      generateRandomChipProject('seed-a', 'project-a', 100).blocks,
    )
  })

  it('keeps generated blocks within the die', () => {
    const project = generateRandomChipProject('bounded', 'bounded-project', 100)
    expect(project.blocks.length).toBeGreaterThanOrEqual(6)
    for (const block of project.blocks) {
      expect(clampBlockToDie(block, project.die)).toEqual({
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
      })
    }
  })

  it('keeps blocks inside every die shape across many seeds', () => {
    const shapesSeen = new Set<string>()
    for (let index = 0; index < 200; index += 1) {
      const project = generateRandomChipProject(`seed-${index}`, `project-${index}`, 100)
      shapesSeen.add(project.die.shape)
      for (const block of project.blocks) {
        const clamped = clampBlockToDie(block, project.die)
        expect({ x: clamped.x, y: clamped.y, w: clamped.w, h: clamped.h }).toEqual({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
        })
      }
    }
    expect(shapesSeen).toEqual(new Set(['rect', 'square', 'circle', 'hexagon']))
  })
})

import { describe, expect, it } from 'vitest'
import { busBundle } from './busRouting'

describe('busBundle', () => {
  it('routes N parallel L-shaped wires with a via at each elbow', () => {
    const bundle = busBundle({ x: 10, y: 10 }, { x: 100, y: 80 }, { wires: 3, spacing: 4 })

    expect(bundle.wires).toHaveLength(3)
    expect(bundle.vias).toHaveLength(3)
    for (const wire of bundle.wires) expect(wire).toHaveLength(6) // start, elbow, end
    bundle.wires.forEach((wire, index) => {
      expect(bundle.vias[index].x).toBe(wire[2])
      expect(bundle.vias[index].y).toBe(wire[3])
    })
  })

  it('centers offsets so the middle wire is unshifted for an odd count', () => {
    const bundle = busBundle({ x: 0, y: 50 }, { x: 200, y: 120 }, { wires: 3, spacing: 6 })

    expect(bundle.wires[1][1]).toBe(50) // horizontal run stays at from.y
    expect(bundle.wires[1][3]).toBe(50)
  })

  it('adds more wires as the count rises and is deterministic', () => {
    const thin = busBundle({ x: 0, y: 0 }, { x: 50, y: 50 }, { wires: 2 })
    const fat = busBundle({ x: 0, y: 0 }, { x: 50, y: 50 }, { wires: 5 })

    expect(fat.wires.length).toBeGreaterThan(thin.wires.length)
    expect(busBundle({ x: 0, y: 0 }, { x: 50, y: 50 }, { wires: 5 })).toEqual(fat)
  })
})

import { describe, expect, it } from 'vitest'
import { busBundle, routedBusPairs } from './busRouting'

describe('routedBusPairs', () => {
  const block = (type: string, x: number, y: number) => ({
    type: type as never,
    x,
    y,
    w: 40,
    h: 40,
  })

  it('routes each memory and io block to its nearest compute block', () => {
    const pairs = routedBusPairs([
      block('CPU', 0, 0),
      block('GPU', 200, 0),
      block('Cache', 10, 100), // nearest compute: CPU (0,0)
      block('IO', 210, 100), // nearest compute: GPU (200,0)
    ])
    expect(pairs).toHaveLength(2)
    const memory = pairs.find((pair) => pair.kind === 'memory')!
    const io = pairs.find((pair) => pair.kind === 'io')!
    // memory route starts at the CPU center (20,20)
    expect(memory.from).toEqual({ x: 20, y: 20 })
    // io route starts at the GPU center (220,20)
    expect(io.from).toEqual({ x: 220, y: 20 })
  })

  it('anchors the mesh at the largest block when there is no compute block', () => {
    const cache = { type: 'Cache' as never, x: 0, y: 0, w: 80, h: 80 } // largest → anchor
    const pairs = routedBusPairs([cache, block('IO', 200, 0), block('USB', 100, 150)])

    expect(pairs).toHaveLength(2) // the anchor block itself is not routed
    for (const pair of pairs) expect(pair.from).toEqual({ x: 40, y: 40 })
  })

  it('returns no pairs when there is nothing to route to the anchor', () => {
    expect(routedBusPairs([block('Cache', 0, 0)])).toEqual([])
    expect(routedBusPairs([])).toEqual([])
  })
})

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

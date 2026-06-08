import { describe, expect, it } from 'vitest'
import type { Block, Die } from '../domain/project'
import { reflowBlocksGlobally } from './globalReflow'

const die: Die = { shape: 'rect', width: 480, height: 320, background: 'studio-test' }

function block(id: string, x: number, y: number, w = 112, h = 72): Block {
  return {
    id,
    type: id === 'mem' ? 'QuantumMemory' : id === 'io' ? 'IO' : 'CPU',
    category: id === 'dream' || id === 'mem' ? 'fantasy' : 'real',
    x,
    y,
    w,
    h,
    rotation: 0,
    glow: true,
    zIndex: Number(id.length),
  }
}

function overlaps(a: Block, b: Block) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

describe('reflowBlocksGlobally', () => {
  it('packs blocks inside the die without overlap', () => {
    const result = reflowBlocksGlobally({
      blocks: [
        block('cpu', 32, 32),
        block('gpu', 144, 32),
        block('mem', 80, 160, 240, 64),
        block('io', 240, 160, 112, 64),
      ],
      die,
      targetBlockId: 'gpu',
      target: { x: 20, y: 20 },
    })

    for (const candidate of result) {
      expect(candidate.x).toBeGreaterThanOrEqual(0)
      expect(candidate.y).toBeGreaterThanOrEqual(0)
      expect(candidate.x + candidate.w).toBeLessThanOrEqual(die.width)
      expect(candidate.y + candidate.h).toBeLessThanOrEqual(die.height)
    }
    for (let index = 0; index < result.length; index += 1) {
      for (let other = index + 1; other < result.length; other += 1) {
        expect(overlaps(result[index], result[other])).toBe(false)
      }
    }
  })

  it('moves non-target blocks when a target is inserted near the start of the global layout', () => {
    const source = [
      block('cpu', 32, 32),
      block('gpu', 160, 32),
      block('dream', 288, 32),
      block('mem', 32, 160, 240, 64),
    ]
    const result = reflowBlocksGlobally({
      blocks: source,
      die,
      targetBlockId: 'mem',
      target: { x: 20, y: 20 },
    })

    const movedNonTarget = result.filter((candidate) => {
      const original = source.find((item) => item.id === candidate.id)
      return candidate.id !== 'mem' && original && (candidate.x !== original.x || candidate.y !== original.y)
    })
    expect(movedNonTarget.length).toBeGreaterThan(0)
  })

  it('is deterministic and does not mutate source blocks', () => {
    const source = [block('cpu', 32, 32), block('gpu', 160, 32), block('mem', 32, 160, 240, 64)]
    const snapshot = structuredClone(source)

    const first = reflowBlocksGlobally({ blocks: source, die, targetBlockId: 'gpu', target: { x: 30, y: 30 } })
    const second = reflowBlocksGlobally({ blocks: source, die, targetBlockId: 'gpu', target: { x: 30, y: 30 } })

    expect(first).toEqual(second)
    expect(source).toEqual(snapshot)
  })

  it('keeps reflowed blocks inside a circular die outline', () => {
    const circle: Die = { shape: 'circle', width: 400, height: 400, background: 'studio-test' }
    const result = reflowBlocksGlobally({
      blocks: [block('cpu', 0, 0), block('gpu', 0, 0), block('mem', 0, 0, 200, 64), block('io', 0, 0)],
      die: circle,
      targetBlockId: 'cpu',
      target: { x: 0, y: 0 },
    })

    const cx = circle.width / 2
    const cy = circle.height / 2
    const radius = circle.width / 2
    for (const candidate of result) {
      const corners = [
        [candidate.x, candidate.y],
        [candidate.x + candidate.w, candidate.y],
        [candidate.x, candidate.y + candidate.h],
        [candidate.x + candidate.w, candidate.y + candidate.h],
      ]
      for (const [px, py] of corners) {
        expect(Math.hypot(px - cx, py - cy)).toBeLessThanOrEqual(radius + 1e-6)
      }
    }
  })

  it('preserves block rotation during reflow', () => {
    const result = reflowBlocksGlobally({
      blocks: [{ ...block('cpu', 32, 32), rotation: 30 }, block('gpu', 160, 32)],
      die,
      targetBlockId: 'gpu',
      target: { x: 0, y: 0 },
    })

    expect(result.find((candidate) => candidate.id === 'cpu')!.rotation).toBe(30)
  })

  it('shrinks tiles to stay in bounds without overlap when the die is overcrowded', () => {
    const small: Die = { shape: 'rect', width: 200, height: 160, background: 'studio-test' }
    const many = Array.from({ length: 12 }, (_, index) => block(`b${index}`, 0, 0, 90, 70))

    const result = reflowBlocksGlobally({ blocks: many, die: small, targetBlockId: 'b0', target: { x: 0, y: 0 } })

    for (const candidate of result) {
      expect(candidate.x).toBeGreaterThanOrEqual(-1e-6)
      expect(candidate.y).toBeGreaterThanOrEqual(-1e-6)
      expect(candidate.x + candidate.w).toBeLessThanOrEqual(small.width + 1e-6)
      expect(candidate.y + candidate.h).toBeLessThanOrEqual(small.height + 1e-6)
    }
    for (let index = 0; index < result.length; index += 1) {
      for (let other = index + 1; other < result.length; other += 1) {
        expect(overlaps(result[index], result[other])).toBe(false)
      }
    }
  })

  it('writes a numeric rotation even when a block is missing one', () => {
    const noRotation = { ...block('cpu', 32, 32) } as Partial<Block>
    delete noRotation.rotation

    const result = reflowBlocksGlobally({
      blocks: [noRotation as Block, block('gpu', 160, 32)],
      die,
      targetBlockId: 'gpu',
      target: { x: 0, y: 0 },
    })

    expect(result.find((candidate) => candidate.id === 'cpu')!.rotation).toBe(0)
  })

  it('keeps reflowed blocks inside a non-square circular die using the smaller axis', () => {
    const circle: Die = { shape: 'circle', width: 400, height: 240, background: 'studio-test' }
    const result = reflowBlocksGlobally({
      blocks: [block('cpu', 0, 0), block('gpu', 0, 0), block('io', 0, 0)],
      die: circle,
      targetBlockId: 'cpu',
      target: { x: 0, y: 0 },
    })

    const cx = circle.width / 2
    const cy = circle.height / 2
    const radius = Math.min(circle.width, circle.height) / 2
    for (const candidate of result) {
      const corners = [
        [candidate.x, candidate.y],
        [candidate.x + candidate.w, candidate.y],
        [candidate.x, candidate.y + candidate.h],
        [candidate.x + candidate.w, candidate.y + candidate.h],
      ]
      for (const [px, py] of corners) {
        expect(Math.hypot(px - cx, py - cy)).toBeLessThanOrEqual(radius + 1e-6)
      }
    }
  })
})

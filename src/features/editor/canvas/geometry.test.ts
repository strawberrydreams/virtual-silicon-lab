import { describe, expect, it } from 'vitest'
import {
  clampBlockToDie,
  clampBlockToRadial,
  clampBlockToRect,
  normalizeDie,
  snapToGrid,
} from './geometry'
import type { Die } from '../../../domain/project'
import { outlineToPolygon, resolveDieOutline } from '../../../domain/die/dieOutline'
import { pointInPolygon } from '../../../domain/die/polygonClamp'

describe('snapToGrid', () => {
  it('rounds coordinates to the nearest grid interval', () => {
    expect(snapToGrid(33, 16)).toBe(32)
    expect(snapToGrid(42, 16)).toBe(48)
  })
})

describe('clampBlockToRect', () => {
  it('keeps a block inside the die bounds', () => {
    expect(
      clampBlockToRect({ x: 940, y: -10, w: 120, h: 80 }, { width: 960, height: 640 }),
    ).toEqual({ x: 840, y: 0, w: 120, h: 80 })
  })

  it('keeps every rotated corner inside rectangular bounds', () => {
    const result = clampBlockToRect(
      { x: 910, y: 590, w: 140, h: 80, rotation: 45 },
      { width: 960, height: 640 },
    )
    const corners = rotatedCorners({ ...result, rotation: 45 })
    expect(corners.every((corner) => corner.x >= -1e-6)).toBe(true)
    expect(corners.every((corner) => corner.y >= -1e-6)).toBe(true)
    expect(corners.every((corner) => corner.x <= 960 + 1e-6)).toBe(true)
    expect(corners.every((corner) => corner.y <= 640 + 1e-6)).toBe(true)
  })
})

function farthestCornerDistance(
  block: { x: number; y: number; w: number; h: number },
  center: { x: number; y: number },
) {
  const corners = [
    { x: block.x, y: block.y },
    { x: block.x + block.w, y: block.y },
    { x: block.x, y: block.y + block.h },
    { x: block.x + block.w, y: block.y + block.h },
  ]
  return Math.max(...corners.map((corner) => Math.hypot(corner.x - center.x, corner.y - center.y)))
}

function rotatedCorners(block: { x: number; y: number; w: number; h: number; rotation?: number }) {
  const radians = ((block.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [
    { x: 0, y: 0 },
    { x: block.w, y: 0 },
    { x: 0, y: block.h },
    { x: block.w, y: block.h },
  ].map((corner) => ({
    x: block.x + corner.x * cos - corner.y * sin,
    y: block.y + corner.x * sin + corner.y * cos,
  }))
}

describe('clampBlockToRadial', () => {
  it('leaves a block that already fits unchanged', () => {
    const result = clampBlockToRadial(
      { x: 270, y: 270, w: 60, h: 60 },
      { width: 600, height: 600 },
      300,
    )
    expect(result).toEqual({ x: 270, y: 270, w: 60, h: 60 })
  })

  it('pulls an out-of-bounds block inside the radius', () => {
    const result = clampBlockToRadial(
      { x: 560, y: 280, w: 80, h: 80 },
      { width: 600, height: 600 },
      300,
    )
    expect(farthestCornerDistance(result, { x: 300, y: 300 })).toBeLessThanOrEqual(300 + 1e-6)
  })

  it('shrinks and centers a block larger than the radius', () => {
    const result = clampBlockToRadial(
      { x: 0, y: 0, w: 1000, h: 1000 },
      { width: 600, height: 600 },
      300,
    )
    expect(result.w).toBeLessThan(1000)
    expect(farthestCornerDistance(result, { x: 300, y: 300 })).toBeLessThanOrEqual(300 + 1e-6)
  })
})

describe('clampBlockToDie', () => {
  it('uses rectangular bounds for rect and square dies', () => {
    const die: Die = { shape: 'rect', width: 960, height: 640, background: 'grid-cyan' }
    expect(clampBlockToDie({ x: 940, y: -10, w: 120, h: 80 }, die)).toEqual({
      x: 840,
      y: 0,
      w: 120,
      h: 80,
    })
  })

  it('keeps every corner inside a circular die', () => {
    const die: Die = { shape: 'circle', width: 600, height: 600, background: 'grid-cyan' }
    const result = clampBlockToDie({ x: 560, y: 280, w: 80, h: 80 }, die)
    expect(farthestCornerDistance(result, { x: 300, y: 300 })).toBeLessThanOrEqual(300 + 1e-6)
  })

  it('uses the tighter incircle for a hexagonal die', () => {
    const die: Die = { shape: 'hexagon', width: 600, height: 600, background: 'grid-cyan' }
    const result = clampBlockToDie({ x: 560, y: 280, w: 80, h: 80 }, die)
    const incircle = 300 * (Math.sqrt(3) / 2)
    expect(farthestCornerDistance(result, { x: 300, y: 300 })).toBeLessThanOrEqual(incircle + 1e-6)
  })

  it('polygon-clamps blocks out of a parametric L-shape notch', () => {
    const die: Die = { shape: 'l-shape', width: 960, height: 640, background: 'grid-cyan' }
    const result = clampBlockToDie({ x: 780, y: 500, w: 120, h: 80 }, die)
    const polygon = outlineToPolygon(resolveDieOutline(die))

    expect(rotatedCorners(result).every((corner) => pointInPolygon(corner, polygon))).toBe(true)
  })

  it('clamps a block through the polygon path for a freeform die', () => {
    const clamped = clampBlockToDie(
      { x: -50, y: -50, w: 20, h: 20 },
      {
        shape: 'freeform',
        width: 100,
        height: 100,
        background: 'grid-cyan',
        freeform: {
          vertices: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ],
        },
      },
    )
    expect(clamped.x).toBeGreaterThanOrEqual(0)
    expect(clamped.y).toBeGreaterThanOrEqual(0)
    expect(clamped.x + clamped.w).toBeLessThanOrEqual(100)
    expect(clamped.y + clamped.h).toBeLessThanOrEqual(100)
  })
})

describe('normalizeDie', () => {
  it('keeps rectangular dimensions for the rect shape', () => {
    const die: Die = { shape: 'rect', width: 960, height: 640, background: 'grid-cyan' }
    expect(normalizeDie(die, 'rect')).toEqual(die)
  })

  it('squares the dimensions for non-rect shapes', () => {
    const die: Die = { shape: 'rect', width: 960, height: 640, background: 'grid-cyan' }
    expect(normalizeDie(die, 'circle')).toEqual({
      shape: 'circle',
      width: 640,
      height: 640,
      background: 'grid-cyan',
    })
  })

  it('uses the semantic dimension policy for parametric shapes', () => {
    const die: Die = {
      shape: 'rect',
      width: 960,
      height: 640,
      background: 'grid-cyan',
      dieShapeParams: { chamfer: 0.2 },
    }

    expect(normalizeDie(die, 'octagon')).toEqual({
      shape: 'octagon',
      width: 640,
      height: 640,
      background: 'grid-cyan',
    })
    expect(normalizeDie(die, 'plus')).toEqual({
      shape: 'plus',
      width: 640,
      height: 640,
      background: 'grid-cyan',
    })
    expect(normalizeDie(die, 'rounded-rect')).toEqual({
      shape: 'rounded-rect',
      width: 960,
      height: 640,
      background: 'grid-cyan',
    })
  })
})

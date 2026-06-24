import type { Die, DieShape } from '../../../domain/project'
import { outlineToPolygon, resolveDieOutline } from '../../../domain/die/dieOutline'
import { clampBlockToPolygon } from '../../../domain/die/polygonClamp'

type BlockRect = { x: number; y: number; w: number; h: number; rotation?: number }
type DieRect = { width: number; height: number }

const HEXAGON_INCIRCLE_RATIO = Math.sqrt(3) / 2

export function snapToGrid(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize
}

export function clampBlockToRect(block: BlockRect, die: DieRect): BlockRect {
  let w = Math.min(block.w, die.width)
  let h = Math.min(block.h, die.height)
  let extents = rotatedExtents(w, h, block.rotation ?? 0)

  if (extents.width > die.width || extents.height > die.height) {
    const scale = Math.min(die.width / extents.width, die.height / extents.height)
    w *= scale
    h *= scale
    extents = rotatedExtents(w, h, block.rotation ?? 0)
  }

  const minX = -extents.minX
  const maxX = die.width - extents.maxX
  const minY = -extents.minY
  const maxY = die.height - extents.maxY

  return {
    x: cleanZero(Math.min(Math.max(block.x, minX), maxX)),
    y: cleanZero(Math.min(Math.max(block.y, minY), maxY)),
    w,
    h,
  }
}

function cleanZero(value: number) {
  return Math.abs(value) < 1e-10 ? 0 : value
}

function rotatedExtents(w: number, h: number, rotation: number) {
  const radians = (rotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const corners = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: 0, y: h },
    { x: w, y: h },
  ].map((corner) => ({
    x: corner.x * cos - corner.y * sin,
    y: corner.x * sin + corner.y * cos,
  }))
  const xs = corners.map((corner) => corner.x)
  const ys = corners.map((corner) => corner.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
}

export function clampBlockToRadial(block: BlockRect, die: DieRect, radius: number): BlockRect {
  const centerX = die.width / 2
  const centerY = die.height / 2

  let { w, h } = block
  let halfDiagonal = Math.hypot(w / 2, h / 2)
  if (halfDiagonal > radius && halfDiagonal > 0) {
    const scale = radius / halfDiagonal
    w *= scale
    h *= scale
    halfDiagonal = radius
  }

  const maxDistance = Math.max(0, radius - halfDiagonal)
  let blockCenterX = block.x + block.w / 2
  let blockCenterY = block.y + block.h / 2
  const offsetX = blockCenterX - centerX
  const offsetY = blockCenterY - centerY
  const distance = Math.hypot(offsetX, offsetY)
  if (distance > maxDistance && distance > 0) {
    const scale = maxDistance / distance
    blockCenterX = centerX + offsetX * scale
    blockCenterY = centerY + offsetY * scale
  }

  return { x: blockCenterX - w / 2, y: blockCenterY - h / 2, w, h }
}

export function clampBlockToDie(block: BlockRect, die: Die): BlockRect {
  switch (die.shape) {
    case 'rect':
    case 'square':
      return clampBlockToRect(block, { width: die.width, height: die.height })
    case 'circle':
      return clampBlockToRadial(block, die, die.width / 2)
    case 'hexagon':
      return clampBlockToRadial(block, die, (die.width / 2) * HEXAGON_INCIRCLE_RATIO)
    case 'octagon':
    case 'rounded-rect':
    case 'chamfered-rect':
    case 'keyed':
    case 'l-shape':
    case 'plus': {
      const outline = resolveDieOutline(die)
      return clampBlockToPolygon(block, outlineToPolygon(outline), outline.centroid)
    }
  }
}

export function normalizeDie(die: Die, shape: DieShape): Die {
  const next = { ...die, shape }
  delete next.dieShapeParams
  if (
    shape === 'rect' ||
    shape === 'rounded-rect' ||
    shape === 'chamfered-rect' ||
    shape === 'keyed' ||
    shape === 'l-shape'
  ) {
    return next
  }
  const side = Math.min(die.width, die.height)
  return { ...next, width: side, height: side }
}

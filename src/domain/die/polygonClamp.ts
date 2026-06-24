import type { Point } from './dieOutline'

const BOUNDARY_EPSILON = 1e-9

function pointOnSegment(point: Point, from: Point, to: Point): boolean {
  const segmentX = to.x - from.x
  const segmentY = to.y - from.y
  const pointX = point.x - from.x
  const pointY = point.y - from.y
  const cross = segmentX * pointY - segmentY * pointX
  if (Math.abs(cross) > BOUNDARY_EPSILON) return false

  const dot = pointX * segmentX + pointY * segmentY
  if (dot < -BOUNDARY_EPSILON) return false
  const lengthSquared = segmentX * segmentX + segmentY * segmentY
  return dot <= lengthSquared + BOUNDARY_EPSILON
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false

  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index]
    const previousPoint = polygon[previous]
    if (pointOnSegment(point, previousPoint, currentPoint)) return true

    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x
    if (intersects) inside = !inside
  }
  return inside
}

export type ClampBlock = { x: number; y: number; w: number; h: number; rotation?: number }

function rotatedCorners(block: ClampBlock): Point[] {
  const radians = ((block.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [
    { x: 0, y: 0 },
    { x: block.w, y: 0 },
    { x: block.w, y: block.h },
    { x: 0, y: block.h },
  ].map((corner) => ({
    x: block.x + corner.x * cos - corner.y * sin,
    y: block.y + corner.x * sin + corner.y * cos,
  }))
}

function allInside(corners: Point[], polygon: Point[]): boolean {
  return corners.every((corner) => pointInPolygon(corner, polygon))
}

function centroidOf(points: Point[]): Point {
  const sum = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 },
  )
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function placedAtCentroid(block: ClampBlock, centroid: Point, scale: number): ClampBlock {
  const sized = { ...block, w: block.w * scale, h: block.h * scale }
  const cornerCentroid = centroidOf(rotatedCorners(sized))
  return {
    ...sized,
    x: sized.x + centroid.x - cornerCentroid.x,
    y: sized.y + centroid.y - cornerCentroid.y,
  }
}

export function clampBlockToPolygon(
  block: ClampBlock,
  polygon: Point[],
  centroid: Point,
): { x: number; y: number; w: number; h: number } {
  if (allInside(rotatedCorners(block), polygon)) {
    return { x: block.x, y: block.y, w: block.w, h: block.h }
  }

  const centered = placedAtCentroid(block, centroid, 1)
  if (allInside(rotatedCorners(centered), polygon)) {
    let outside = 0
    let inside = 1
    for (let iteration = 0; iteration < 40; iteration += 1) {
      const fraction = (outside + inside) / 2
      const probe = {
        ...block,
        x: block.x + (centered.x - block.x) * fraction,
        y: block.y + (centered.y - block.y) * fraction,
      }
      if (allInside(rotatedCorners(probe), polygon)) inside = fraction
      else outside = fraction
    }
    return {
      x: block.x + (centered.x - block.x) * inside,
      y: block.y + (centered.y - block.y) * inside,
      w: block.w,
      h: block.h,
    }
  }

  let fittingScale = 0
  let failingScale = 1
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const scale = (fittingScale + failingScale) / 2
    if (allInside(rotatedCorners(placedAtCentroid(block, centroid, scale)), polygon)) {
      fittingScale = scale
    } else {
      failingScale = scale
    }
  }
  const fitted = placedAtCentroid(block, centroid, fittingScale)
  return { x: fitted.x, y: fitted.y, w: fitted.w, h: fitted.h }
}

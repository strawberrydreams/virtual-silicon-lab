import type { Die, DieCorner } from '../project'
import { resolveDieShapeParams } from './dieShapeParams'

export type Point = { x: number; y: number }

export type OutlineSegment =
  | { kind: 'line'; from: Point; to: Point }
  | {
      kind: 'arc'
      center: Point
      radius: number
      startAngle: number
      endAngle: number
      counterclockwise: boolean
    }

export type DieOutline = {
  segments: OutlineSegment[]
  centroid: Point
}

function polygonOutline(points: Point[], centroid: Point): DieOutline {
  return {
    segments: points.map((from, index) => ({
      kind: 'line',
      from,
      to: points[(index + 1) % points.length],
    })),
    centroid,
  }
}

function rectangleOutline(width: number, height: number): DieOutline {
  return polygonOutline(
    [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
    { x: width / 2, y: height / 2 },
  )
}

function hexagonOutline(width: number, height: number): DieOutline {
  const radius = width / 2
  const cx = width / 2
  const cy = height / 2
  const corners: Point[] = []
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 3) * index - Math.PI / 2
    corners.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) })
  }
  return polygonOutline(corners, { x: cx, y: cy })
}

function circleOutline(width: number, height: number): DieOutline {
  const center = { x: width / 2, y: height / 2 }
  return {
    segments: [
      {
        kind: 'arc',
        center,
        radius: width / 2,
        startAngle: 0,
        endAngle: Math.PI * 2,
        counterclockwise: false,
      },
    ],
    centroid: center,
  }
}

function chamferedOutline(width: number, height: number, amount: number): DieOutline {
  const cut = Math.min(width, height) * amount
  return polygonOutline(
    [
      { x: cut, y: 0 },
      { x: width - cut, y: 0 },
      { x: width, y: cut },
      { x: width, y: height - cut },
      { x: width - cut, y: height },
      { x: cut, y: height },
      { x: 0, y: height - cut },
      { x: 0, y: cut },
    ],
    { x: width / 2, y: height / 2 },
  )
}

function roundedRectangleOutline(width: number, height: number, amount: number): DieOutline {
  const radius = Math.min(width, height) * amount
  return {
    centroid: { x: width / 2, y: height / 2 },
    segments: [
      { kind: 'line', from: { x: radius, y: 0 }, to: { x: width - radius, y: 0 } },
      {
        kind: 'arc',
        center: { x: width - radius, y: radius },
        radius,
        startAngle: -Math.PI / 2,
        endAngle: 0,
        counterclockwise: false,
      },
      { kind: 'line', from: { x: width, y: radius }, to: { x: width, y: height - radius } },
      {
        kind: 'arc',
        center: { x: width - radius, y: height - radius },
        radius,
        startAngle: 0,
        endAngle: Math.PI / 2,
        counterclockwise: false,
      },
      { kind: 'line', from: { x: width - radius, y: height }, to: { x: radius, y: height } },
      {
        kind: 'arc',
        center: { x: radius, y: height - radius },
        radius,
        startAngle: Math.PI / 2,
        endAngle: Math.PI,
        counterclockwise: false,
      },
      { kind: 'line', from: { x: 0, y: height - radius }, to: { x: 0, y: radius } },
      {
        kind: 'arc',
        center: { x: radius, y: radius },
        radius,
        startAngle: Math.PI,
        endAngle: (Math.PI * 3) / 2,
        counterclockwise: false,
      },
    ],
  }
}

function keyedOutline(
  width: number,
  height: number,
  corner: DieCorner,
  amount: number,
): DieOutline {
  const cut = Math.min(width, height) * amount
  const points: Record<DieCorner, Point[]> = {
    'top-left': [
      { x: cut, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
      { x: 0, y: cut },
    ],
    'top-right': [
      { x: 0, y: 0 },
      { x: width - cut, y: 0 },
      { x: width, y: cut },
      { x: width, y: height },
      { x: 0, y: height },
    ],
    'bottom-right': [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height - cut },
      { x: width - cut, y: height },
      { x: 0, y: height },
    ],
    'bottom-left': [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: cut, y: height },
      { x: 0, y: height - cut },
    ],
  }
  return polygonOutline(points[corner], { x: width / 2, y: height / 2 })
}

function lShapeOutline(
  width: number,
  height: number,
  corner: DieCorner,
  amount: number,
): DieOutline {
  const cutWidth = width * amount
  const cutHeight = height * amount
  const definitions: Record<DieCorner, { points: Point[]; centroid: Point }> = {
    'top-left': {
      points: [
        { x: cutWidth, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
        { x: 0, y: cutHeight },
        { x: cutWidth, y: cutHeight },
      ],
      centroid: { x: cutWidth + (width - cutWidth) / 2, y: cutHeight + (height - cutHeight) / 2 },
    },
    'top-right': {
      points: [
        { x: 0, y: 0 },
        { x: width - cutWidth, y: 0 },
        { x: width - cutWidth, y: cutHeight },
        { x: width, y: cutHeight },
        { x: width, y: height },
        { x: 0, y: height },
      ],
      centroid: { x: (width - cutWidth) / 2, y: cutHeight + (height - cutHeight) / 2 },
    },
    'bottom-right': {
      points: [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height - cutHeight },
        { x: width - cutWidth, y: height - cutHeight },
        { x: width - cutWidth, y: height },
        { x: 0, y: height },
      ],
      centroid: { x: (width - cutWidth) / 2, y: (height - cutHeight) / 2 },
    },
    'bottom-left': {
      points: [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: cutWidth, y: height },
        { x: cutWidth, y: height - cutHeight },
        { x: 0, y: height - cutHeight },
      ],
      centroid: { x: cutWidth + (width - cutWidth) / 2, y: (height - cutHeight) / 2 },
    },
  }
  const definition = definitions[corner]
  return polygonOutline(definition.points, definition.centroid)
}

function plusOutline(width: number, height: number, amount: number): DieOutline {
  const arm = Math.min(width, height) * amount
  const left = (width - arm) / 2
  const right = left + arm
  const top = (height - arm) / 2
  const bottom = top + arm
  return polygonOutline(
    [
      { x: left, y: 0 },
      { x: right, y: 0 },
      { x: right, y: top },
      { x: width, y: top },
      { x: width, y: bottom },
      { x: right, y: bottom },
      { x: right, y: height },
      { x: left, y: height },
      { x: left, y: bottom },
      { x: 0, y: bottom },
      { x: 0, y: top },
      { x: left, y: top },
    ],
    { x: width / 2, y: height / 2 },
  )
}

export function resolveDieOutline(die: Die): DieOutline {
  switch (die.shape) {
    case 'rect':
    case 'square':
      return rectangleOutline(die.width, die.height)
    case 'circle':
      return circleOutline(die.width, die.height)
    case 'hexagon':
      return hexagonOutline(die.width, die.height)
    case 'octagon':
    case 'chamfered-rect': {
      const params = resolveDieShapeParams(die.shape, die.dieShapeParams)
      return chamferedOutline(die.width, die.height, params?.chamfer ?? 0.1)
    }
    case 'rounded-rect': {
      const params = resolveDieShapeParams(die.shape, die.dieShapeParams)
      return roundedRectangleOutline(die.width, die.height, params?.cornerRadius ?? 0.12)
    }
    case 'keyed': {
      const params = resolveDieShapeParams(die.shape, die.dieShapeParams)
      return keyedOutline(
        die.width,
        die.height,
        params?.notch?.corner ?? 'top-left',
        params?.notch?.size ?? 0.14,
      )
    }
    case 'l-shape': {
      const params = resolveDieShapeParams(die.shape, die.dieShapeParams)
      return lShapeOutline(
        die.width,
        die.height,
        params?.notch?.corner ?? 'bottom-right',
        params?.notch?.size ?? 0.5,
      )
    }
    case 'plus': {
      const params = resolveDieShapeParams(die.shape, die.dieShapeParams)
      return plusOutline(die.width, die.height, params?.armWidth ?? 0.36)
    }
  }
}

const DEFAULT_ARC_SEGMENTS_PER_CIRCLE = 64

export function outlineToPolygon(
  outline: DieOutline,
  arcSegmentsPerCircle = DEFAULT_ARC_SEGMENTS_PER_CIRCLE,
): Point[] {
  const points: Point[] = []
  const pushPoint = (point: Point) => {
    const previous = points[points.length - 1]
    if (previous && Math.hypot(previous.x - point.x, previous.y - point.y) < 1e-9) return
    points.push({ x: point.x, y: point.y })
  }
  for (const segment of outline.segments) {
    if (segment.kind === 'line') {
      pushPoint(segment.from)
      continue
    }

    let sweep = segment.endAngle - segment.startAngle
    if (segment.counterclockwise) {
      while (sweep > 0) sweep -= Math.PI * 2
    } else {
      while (sweep < 0) sweep += Math.PI * 2
    }
    const fraction = Math.min(1, Math.abs(sweep) / (Math.PI * 2))
    const steps = Math.max(2, Math.ceil(arcSegmentsPerCircle * fraction))
    for (let index = 0; index <= steps; index += 1) {
      const angle = segment.startAngle + sweep * (index / steps)
      pushPoint({
        x: segment.center.x + segment.radius * Math.cos(angle),
        y: segment.center.y + segment.radius * Math.sin(angle),
      })
    }
  }
  if (
    points.length > 1 &&
    Math.hypot(
      points[0].x - points[points.length - 1].x,
      points[0].y - points[points.length - 1].y,
    ) < 1e-9
  ) {
    points.pop()
  }
  return points
}

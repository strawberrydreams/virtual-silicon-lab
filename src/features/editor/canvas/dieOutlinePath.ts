import type { DieOutline, OutlineSegment, Point } from '../../../domain/die/dieOutline'

export type OutlineContext = {
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void
  closePath(): void
}

function segmentStart(segment: OutlineSegment): Point {
  if (segment.kind === 'line') return segment.from
  return {
    x: segment.center.x + segment.radius * Math.cos(segment.startAngle),
    y: segment.center.y + segment.radius * Math.sin(segment.startAngle),
  }
}

export function traceDieOutline(context: OutlineContext, outline: DieOutline): void {
  const first = outline.segments[0]
  if (first === undefined) return
  const start = segmentStart(first)
  context.moveTo(start.x, start.y)
  for (const segment of outline.segments) {
    if (segment.kind === 'line') {
      context.lineTo(segment.to.x, segment.to.y)
    } else {
      context.arc(
        segment.center.x,
        segment.center.y,
        segment.radius,
        segment.startAngle,
        segment.endAngle,
        segment.counterclockwise,
      )
    }
  }
  context.closePath()
}

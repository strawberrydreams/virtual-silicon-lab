import type { FreeformVertex } from '../project'

const UNIT_RECTANGLE: readonly FreeformVertex[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

function clamp01(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(1, Math.max(0, value))
}

export function resolveFreeformVertices(value: unknown): FreeformVertex[] {
  const source =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const raw = Array.isArray(source.vertices) ? source.vertices : []
  const vertices: FreeformVertex[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const point = entry as Record<string, unknown>
    const x = clamp01(point.x)
    const y = clamp01(point.y)
    if (x === null || y === null) continue
    vertices.push({ x, y })
  }
  if (vertices.length < 3) return UNIT_RECTANGLE.map((vertex) => ({ ...vertex }))
  return vertices
}

// Pure Manhattan bus routing: a bundle of N parallel L-shaped wires from one block
// center to another, with a via dot at each wire's elbow. Shared by editor + export.
export type Point = { x: number; y: number }

export type BusBundle = {
  wires: number[][] // each wire is a polyline [x0,y0, x1,y1, x2,y2]
  vias: Point[] // elbow via per wire
}

export function busBundle(
  from: Point,
  to: Point,
  opts: { wires?: number; spacing?: number } = {},
): BusBundle {
  const count = Math.max(1, Math.round(opts.wires ?? 3))
  const spacing = opts.spacing ?? 3
  const wires: number[][] = []
  const vias: Point[] = []
  for (let index = 0; index < count; index += 1) {
    // Center the bundle so the middle wire is unshifted.
    const offset = (index - (count - 1) / 2) * spacing
    const runY = from.y + offset // horizontal run height
    const elbowX = to.x + offset // vertical run column / elbow
    // L-route: from → elbow (horizontal then vertical) → to.
    wires.push([from.x, runY, elbowX, runY, elbowX, to.y])
    vias.push({ x: elbowX, y: runY })
  }
  return { wires, vias }
}

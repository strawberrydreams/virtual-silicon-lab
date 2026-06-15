import type { Block, Die, Project } from '../domain/project'

const PADDING = 16
const HEXAGON_INCIRCLE_RATIO = Math.sqrt(3) / 2
const MAX_FILLER_CELLS = 600
const BLOCK_MARGIN = 6
const GAP = 4

export type FillerKind = 'logic' | 'sram' | 'io'

export type FillerCell = {
  id: string
  x: number
  y: number
  w: number
  h: number
  kind: FillerKind
  seed: number
}

export type FillerRegion = { x: number; y: number; width: number; height: number }

// Incircle of a non-rect die outline: the circle itself, or the hexagon's
// inscribed circle. Rect/square dies have no curved boundary and return null.
export function dieIncircle(die: Die): { cx: number; cy: number; r: number } | null {
  if (die.shape === 'rect' || die.shape === 'square') return null
  const base = Math.min(die.width, die.height) / 2
  return {
    cx: die.width / 2,
    cy: die.height / 2,
    r: die.shape === 'circle' ? base : base * HEXAGON_INCIRCLE_RATIO,
  }
}

// Largest axis-aligned rect that stays inside the die outline. Mirrors the
// packRegion logic in globalReflow so filler never escapes circle/hex dies.
export function usableDieRegion(die: Die): FillerRegion {
  const incircle = dieIncircle(die)
  if (incircle === null) {
    return {
      x: PADDING,
      y: PADDING,
      width: Math.max(0, die.width - PADDING * 2),
      height: Math.max(0, die.height - PADDING * 2),
    }
  }
  const usable = Math.max(0, incircle.r - PADDING)
  const half = usable / Math.SQRT2
  return {
    x: incircle.cx - half,
    y: incircle.cy - half,
    width: half * 2,
    height: half * 2,
  }
}

type BlockBounds = { x: number; y: number; w: number; h: number }

// Rotation-aware AABB of a block (rotation is about its top-left origin, like
// the canvas renderer), inflated by the filler margin.
function blockBounds(block: Block): BlockBounds {
  const radians = ((block.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const xs = [0, block.w * cos, -block.h * sin, block.w * cos - block.h * sin]
  const ys = [0, block.w * sin, block.h * cos, block.w * sin + block.h * cos]
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return {
    x: block.x + minX - BLOCK_MARGIN,
    y: block.y + minY - BLOCK_MARGIN,
    w: Math.max(...xs) - minX + BLOCK_MARGIN * 2,
    h: Math.max(...ys) - minY + BLOCK_MARGIN * 2,
  }
}

function overlapsBlock(x: number, y: number, size: number, bounds: BlockBounds[]): boolean {
  for (const rect of bounds) {
    if (x < rect.x + rect.w && x + size > rect.x && y < rect.y + rect.h && y + size > rect.y)
      return true
  }
  return false
}

function pickKind(seed: number): FillerKind {
  const m = Math.abs(seed) % 10
  if (m < 5) return 'logic'
  if (m < 8) return 'sram'
  return 'io'
}

// Deterministic projection of blocks + die into procedural macro-cells that fill
// the empty die area, so even a sparse chip reads as a fully packed floorplan.
// Pure and not persisted — the source of truth stays the block list.
export function buildFillerCells(project: Project): FillerCell[] {
  const region = usableDieRegion(project.die)
  if (region.width <= 0 || region.height <= 0) return []

  const density = Math.min(1, Math.max(0, project.studio.tileSettings.detailDensity))
  let size = Math.round(120 - density * 56) // 120 (sparse) .. 64 (dense)
  const cols = Math.max(0, Math.floor(region.width / size))
  const rows = Math.max(0, Math.floor(region.height / size))
  if (cols * rows > MAX_FILLER_CELLS) {
    size = Math.ceil(size * Math.sqrt((cols * rows) / MAX_FILLER_CELLS))
  }

  const step = size + GAP
  const bounds = project.blocks.map(blockBounds)
  const cells: FillerCell[] = []
  for (let y = region.y; y + size <= region.y + region.height + 0.001; y += step) {
    for (let x = region.x; x + size <= region.x + region.width + 0.001; x += step) {
      if (overlapsBlock(x, y, size, bounds)) continue
      const seed = (Math.round(x) * 73856093) ^ (Math.round(y) * 19349663)
      cells.push({
        id: `filler-${Math.round(x)}-${Math.round(y)}`,
        x,
        y,
        w: size,
        h: size,
        kind: pickKind(seed),
        seed,
      })
    }
  }
  return cells
}

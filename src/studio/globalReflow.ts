import type { Block, Die } from '../domain/project'

const GRID = 16
const PADDING = 16
const HEXAGON_INCIRCLE_RATIO = Math.sqrt(3) / 2

type ReflowInput = {
  blocks: Block[]
  die: Die
  targetBlockId: string
  target: { x: number; y: number }
}

type OrderedBlock = {
  block: Block
  sortX: number
  sortY: number
}

type PackRegion = { x: number; y: number; width: number; height: number }
type Zone = PackRegion & { id: 'nw' | 'ne' | 'sw' | 'se' }

type FitExtents = {
  minX: number
  minY: number
  width: number
  height: number
  blockW: number
  blockH: number
}

type PlacedBlock = {
  block: Block
  fit: FitExtents
  cellX: number
  cellY: number
}

export function reflowBlocksGlobally({ blocks, die, targetBlockId, target }: ReflowInput): Block[] {
  const region = packRegion(die)
  const zones = packZones(region)
  const buckets = new Map<Zone['id'], OrderedBlock[]>()
  for (const zone of zones) buckets.set(zone.id, [])

  blocks
    .map((block): OrderedBlock => {
      if (block.id === targetBlockId) return { block, sortX: target.x, sortY: target.y }
      return { block, sortX: block.x, sortY: block.y }
    })
    .slice()
    .sort(
      (a: OrderedBlock, b: OrderedBlock) =>
        a.sortY - b.sortY || a.sortX - b.sortX || a.block.zIndex - b.block.zIndex,
    )
    .forEach((item) => {
      const zone = nearestZone(zones, item.sortX + item.block.w / 2, item.sortY + item.block.h / 2)
      buckets.get(zone.id)!.push(item)
    })

  const placedBlocks = zones.flatMap((zone) => packOrderedBlocks(buckets.get(zone.id) ?? [], zone))
  const byId = new Map(placedBlocks.map((block) => [block.id, block]))
  return blocks.map((block) => byId.get(block.id) ?? block)
}

function packOrderedBlocks(ordered: OrderedBlock[], region: PackRegion): Block[] {
  if (ordered.length === 0) return []

  // Pack into the region using origin-relative cell coordinates so the layout can
  // be uniformly scaled down afterwards when the die is overcrowded.
  let cursorX = 0
  let cursorY = 0
  let rowHeight = 0
  let contentWidth = 0
  let contentHeight = 0

  const placed: PlacedBlock[] = ordered.map(({ block }) => {
    const fit = fitExtents(block, region)
    if (cursorX + fit.width > region.width && cursorX > 0) {
      cursorX = 0
      cursorY += rowHeight + GRID
      rowHeight = 0
    }

    const cellX = cursorX
    const cellY = cursorY
    cursorX += fit.width + GRID
    rowHeight = Math.max(rowHeight, fit.height)
    contentWidth = Math.max(contentWidth, cellX + fit.width)
    contentHeight = Math.max(contentHeight, cellY + fit.height)
    return { block, fit, cellX, cellY }
  })

  const scale = Math.min(
    1,
    region.width / Math.max(GRID, contentWidth),
    region.height / Math.max(GRID, contentHeight),
  )

  return placed.map(({ block, fit, cellX, cellY }) => ({
    ...block,
    x: region.x + scale * (cellX - fit.minX),
    y: region.y + scale * (cellY - fit.minY),
    w: scale * fit.blockW,
    h: scale * fit.blockH,
    rotation: block.rotation ?? 0,
  }))
}

function packZones(region: PackRegion): Zone[] {
  const gap = GRID
  const halfW = Math.max(GRID, (region.width - gap) / 2)
  const halfH = Math.max(GRID, (region.height - gap) / 2)
  return [
    { id: 'nw', x: region.x, y: region.y, width: halfW, height: halfH },
    { id: 'ne', x: region.x + halfW + gap, y: region.y, width: halfW, height: halfH },
    { id: 'sw', x: region.x, y: region.y + halfH + gap, width: halfW, height: halfH },
    { id: 'se', x: region.x + halfW + gap, y: region.y + halfH + gap, width: halfW, height: halfH },
  ]
}

function nearestZone(zones: Zone[], x: number, y: number): Zone {
  return zones.reduce((best, zone) => {
    const zoneCenterX = zone.x + zone.width / 2
    const zoneCenterY = zone.y + zone.height / 2
    const bestCenterX = best.x + best.width / 2
    const bestCenterY = best.y + best.height / 2
    const distance = Math.hypot(x - zoneCenterX, y - zoneCenterY)
    const bestDistance = Math.hypot(x - bestCenterX, y - bestCenterY)
    return distance < bestDistance ? zone : best
  }, zones[0])
}

// The packing region is the largest axis-aligned rectangle that stays inside the
// die outline, so reflowed tiles never escape circular/hexagonal dies.
function packRegion(die: Die): PackRegion {
  if (die.shape === 'rect' || die.shape === 'square') {
    return {
      x: PADDING,
      y: PADDING,
      width: Math.max(GRID, die.width - PADDING * 2),
      height: Math.max(GRID, die.height - PADDING * 2),
    }
  }

  // Use the smaller axis so the inscribed square stays inside non-square circle/hex dies.
  const base = Math.min(die.width, die.height)
  const radius = die.shape === 'circle' ? base / 2 : (base / 2) * HEXAGON_INCIRCLE_RATIO
  const usable = Math.max(0, radius - PADDING)
  const half = usable / Math.SQRT2
  return {
    x: die.width / 2 - half,
    y: die.height / 2 - half,
    width: Math.max(GRID, half * 2),
    height: Math.max(GRID, half * 2),
  }
}

function fitExtents(block: Block, region: PackRegion): FitExtents {
  const rotation = block.rotation ?? 0
  let w = block.w
  let h = block.h
  let extents = rotatedExtents(w, h, rotation)
  if (extents.width > region.width || extents.height > region.height) {
    const scale = Math.min(region.width / extents.width, region.height / extents.height)
    w = Math.max(GRID, w * scale)
    h = Math.max(GRID, h * scale)
    extents = rotatedExtents(w, h, rotation)
  }
  return {
    minX: extents.minX,
    minY: extents.minY,
    width: extents.width,
    height: extents.height,
    blockW: w,
    blockH: h,
  }
}

// Axis-aligned bounding box of a block rotated around its top-left origin, matching
// the canvas geometry clamp so footprints are correct for rotated tiles.
function rotatedExtents(w: number, h: number, rotation: number) {
  const radians = (rotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const corners = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: 0, y: h },
    { x: w, y: h },
  ].map((corner) => ({ x: corner.x * cos - corner.y * sin, y: corner.x * sin + corner.y * cos }))
  const xs = corners.map((corner) => corner.x)
  const ys = corners.map((corner) => corner.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { minX, minY, width: maxX - minX, height: maxY - minY }
}

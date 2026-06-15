import type { Block, Project } from '../domain/project'
import { resolveMaterialRecipe } from './materialRecipes'
import { resolveTileDetail, type TileDetail } from './tileDetail'
import { buildFillerCells, dieIncircle, type FillerCell } from '../studio/floorplan'

export type Bounds = { x: number; y: number; width: number; height: number }
export type FabricCell = { x: number; y: number; w: number; h: number }

export type FabricDetail =
  | { id: string; kind: 'padArray'; cells: FabricCell[]; opacity: number }
  | { id: string; kind: 'powerRail'; points: number[]; width: number; opacity: number }
  | { id: string; kind: 'viaCluster'; cells: FabricCell[]; opacity: number }

export type ChipLayer =
  | { id: string; kind: 'package'; bounds: Bounds; radius: number; color: string }
  | { id: string; kind: 'dieBase'; bounds: Bounds }
  | { id: string; kind: 'microTile'; bounds: Bounds; opacity: number }
  | {
      id: string
      kind: 'blockSurface'
      blockId: string
      bounds: Bounds
      emphasis: 'real' | 'fantasy'
    }
  | { id: string; kind: 'trace'; points: number[]; color: string; width: number; opacity: number }
  | { id: string; kind: 'readoutLabel'; text: string; x: number; y: number }
  | { id: string; kind: 'glassGlow'; bounds: Bounds; color: string; blur: number; opacity: number }

export type ChipLayerModel = {
  package: Extract<ChipLayer, { kind: 'package' }>
  dieBase: Extract<ChipLayer, { kind: 'dieBase' }>
  microTiles: Extract<ChipLayer, { kind: 'microTile' }>[]
  blockSurfaces: Extract<ChipLayer, { kind: 'blockSurface' }>[]
  traces: Extract<ChipLayer, { kind: 'trace' }>[]
  readoutLabels: Extract<ChipLayer, { kind: 'readoutLabel' }>[]
  glowOverlay: Extract<ChipLayer, { kind: 'glassGlow' }>
  fillerCells: FillerCell[]
  fabricDetails: FabricDetail[]
}

function center(block: Block): [number, number] {
  // Konva renders each block as a Group at (block.x, block.y) rotated about that
  // origin, so the visual center is the local midpoint (w/2, h/2) rotated by the
  // block rotation — not the axis-aligned midpoint.
  const radians = (block.rotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const localX = block.w / 2
  const localY = block.h / 2
  return [block.x + localX * cos - localY * sin, block.y + localX * sin + localY * cos]
}

function blockSurface(block: Block): Extract<ChipLayer, { kind: 'blockSurface' }> {
  return {
    id: `block-surface-${block.id}`,
    kind: 'blockSurface',
    blockId: block.id,
    bounds: { x: block.x, y: block.y, width: block.w, height: block.h },
    emphasis: block.category,
  }
}

// Keep the micro-texture node count bounded so a large die at max density does not
// flood the editor and both export stages with tens of thousands of Konva rects.
const MAX_MICRO_TILES = 4000

function buildMicroTiles(
  project: Project,
  opacity: number,
  detail: TileDetail,
): Extract<ChipLayer, { kind: 'microTile' }>[] {
  const tiles: Extract<ChipLayer, { kind: 'microTile' }>[] = []
  const tile = 18
  let step = detail.microStep
  const cols = Math.max(0, Math.floor((project.die.width - 24 - tile) / step) + 1)
  const rows = Math.max(0, Math.floor((project.die.height - 24 - tile) / step) + 1)
  if (cols * rows > MAX_MICRO_TILES) {
    step = Math.ceil(step * Math.sqrt((cols * rows) / MAX_MICRO_TILES))
  }
  const tileOpacity = Math.min(1, opacity * detail.microOpacityScale)
  for (let y = 24; y + tile <= project.die.height; y += step) {
    for (let x = 24; x + tile <= project.die.width; x += step) {
      tiles.push({
        id: `micro-${x}-${y}`,
        kind: 'microTile',
        bounds: { x, y, width: tile, height: tile },
        opacity: tileOpacity,
      })
    }
  }
  return tiles
}

function buildTraces(
  project: Project,
  detail: TileDetail,
): Extract<ChipLayer, { kind: 'trace' }>[] {
  const recipe = resolveMaterialRecipe(project.theme)
  const ordered = project.blocks.slice().sort((left, right) => left.zIndex - right.zIndex)
  return ordered.slice(1).map((block, index) => {
    const [fromX, fromY] = center(ordered[index])
    const [toX, toY] = center(block)
    return {
      id: `trace-${ordered[index].id}-${block.id}`,
      kind: 'trace',
      points: [fromX, fromY, toX, toY],
      color: index % 2 === 0 ? recipe.metalTrace.color : recipe.metalTrace.secondaryColor,
      width: recipe.metalTrace.width * detail.traceWidthScale,
      opacity: Math.min(1, recipe.metalTrace.opacity * detail.traceOpacityScale),
    }
  })
}

type DieIncircle = ReturnType<typeof dieIncircle>

// Whole pad cells must stay inside the die outline: a pad that crosses the
// circle/hexagon boundary would be hard-cut mid-cell by the renderer clip.
function cellInsideOutline(cell: FabricCell, incircle: DieIncircle): boolean {
  if (incircle === null) return true
  const corners = [
    [cell.x, cell.y],
    [cell.x + cell.w, cell.y],
    [cell.x, cell.y + cell.h],
    [cell.x + cell.w, cell.y + cell.h],
  ]
  return corners.every(([x, y]) => Math.hypot(x - incircle.cx, y - incircle.cy) <= incircle.r)
}

function padCellsForEdge(
  project: Project,
  edge: 'top' | 'right' | 'bottom' | 'left',
  incircle: DieIncircle,
): FabricCell[] {
  const cells: FabricCell[] = []
  const spacing = 18
  const pad = 10
  if (edge === 'top' || edge === 'bottom') {
    for (let x = 22; x <= project.die.width - 30; x += spacing) {
      cells.push({ x, y: edge === 'top' ? pad : project.die.height - pad - 4, w: 8, h: 4 })
    }
  } else {
    for (let y = 22; y <= project.die.height - 30; y += spacing) {
      cells.push({ x: edge === 'left' ? pad : project.die.width - pad - 4, y, w: 4, h: 8 })
    }
  }
  return cells.filter((cell) => cellInsideOutline(cell, incircle))
}

// Chord span for an axis-aligned rail crossing the incircle at `offset` from
// the perpendicular center axis, inset so both endpoints stay inside the outline.
function railSpan(
  offset: number,
  axisCenter: number,
  spanCenter: number,
  r: number,
): [number, number] | null {
  const distance = Math.abs(offset - axisCenter)
  if (distance >= r - 24) return null
  const halfChord = Math.sqrt(r * r - distance * distance)
  const from = spanCenter - halfChord + 24
  const to = spanCenter + halfChord - 24
  return to - from < 40 ? null : [from, to]
}

function buildFabricDetails(project: Project, detail: TileDetail): FabricDetail[] {
  const incircle = dieIncircle(project.die)
  const details: FabricDetail[] = [
    {
      id: 'pad-array-top',
      kind: 'padArray',
      cells: padCellsForEdge(project, 'top', incircle),
      opacity: 0.28,
    },
    {
      id: 'pad-array-right',
      kind: 'padArray',
      cells: padCellsForEdge(project, 'right', incircle),
      opacity: 0.24,
    },
    {
      id: 'pad-array-bottom',
      kind: 'padArray',
      cells: padCellsForEdge(project, 'bottom', incircle),
      opacity: 0.24,
    },
    {
      id: 'pad-array-left',
      kind: 'padArray',
      cells: padCellsForEdge(project, 'left', incircle),
      opacity: 0.24,
    },
  ]

  const railStep = Math.max(74, Math.round(112 - detail.traceWidthScale * 20))
  for (let y = 54; y < project.die.height - 40; y += railStep) {
    const span = incircle
      ? railSpan(y, incircle.cy, incircle.cx, incircle.r)
      : [24, project.die.width - 24]
    if (span === null) continue
    details.push({
      id: `power-rail-h-${Math.round(y)}`,
      kind: 'powerRail',
      points: [span[0], y, span[1], y],
      width: 0.8,
      opacity: 0.16,
    })
  }
  for (let x = 54; x < project.die.width - 40; x += railStep) {
    const span = incircle
      ? railSpan(x, incircle.cx, incircle.cy, incircle.r)
      : [24, project.die.height - 24]
    if (span === null) continue
    details.push({
      id: `power-rail-v-${Math.round(x)}`,
      kind: 'powerRail',
      points: [x, span[0], x, span[1]],
      width: 0.7,
      opacity: 0.12,
    })
  }

  for (const block of project.blocks) {
    const x = Math.round(block.x + block.w / 2)
    const y = Math.round(block.y + block.h / 2)
    details.push({
      id: `via-cluster-${block.id}`,
      kind: 'viaCluster',
      cells: [
        { x: x - 5, y: y - 5, w: 3, h: 3 },
        { x: x + 2, y: y - 5, w: 3, h: 3 },
        { x: x - 5, y: y + 2, w: 3, h: 3 },
        { x: x + 2, y: y + 2, w: 3, h: 3 },
      ],
      opacity: 0.42,
    })
  }
  return details
}

export function buildChipLayers(project: Project): ChipLayerModel {
  const recipe = resolveMaterialRecipe(project.theme)
  const detail = resolveTileDetail(project.studio.tileSettings)
  const margin = Math.max(28, Math.round(Math.min(project.die.width, project.die.height) * 0.05))
  return {
    package: {
      id: 'chip-package',
      kind: 'package',
      bounds: {
        x: -margin,
        y: -margin,
        width: project.die.width + margin * 2,
        height: project.die.height + margin * 2,
      },
      radius: project.die.shape === 'circle' ? project.die.width / 2 + margin : 28,
      color: recipe.package.fill,
    },
    dieBase: {
      id: 'die-base',
      kind: 'dieBase',
      bounds: { x: 0, y: 0, width: project.die.width, height: project.die.height },
    },
    microTiles: buildMicroTiles(project, recipe.microTile.opacity, detail),
    blockSurfaces: project.blocks.map(blockSurface),
    traces: buildTraces(project, detail),
    readoutLabels: [
      {
        id: 'readout-label',
        kind: 'readoutLabel',
        text: `${project.spec.brand} ${project.spec.series}`,
        x: 20,
        y: project.die.height - 34,
      },
    ],
    glowOverlay: {
      id: 'glass-glow',
      kind: 'glassGlow',
      bounds: { x: 0, y: 0, width: project.die.width, height: project.die.height },
      color: recipe.glassGlow.color,
      blur: recipe.glassGlow.blur,
      opacity: recipe.glassGlow.opacity,
    },
    fillerCells: buildFillerCells(project),
    fabricDetails: buildFabricDetails(project, detail),
  }
}

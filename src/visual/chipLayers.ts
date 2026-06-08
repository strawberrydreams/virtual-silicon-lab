import type { Block, Project } from '../domain/project'
import { resolveMaterialRecipe } from './materialRecipes'
import { resolveTileDetail, type TileDetail } from './tileDetail'

export type Bounds = { x: number; y: number; width: number; height: number }

export type ChipLayer =
  | { id: string; kind: 'package'; bounds: Bounds; radius: number; color: string }
  | { id: string; kind: 'dieBase'; bounds: Bounds }
  | { id: string; kind: 'microTile'; bounds: Bounds; opacity: number }
  | { id: string; kind: 'blockSurface'; blockId: string; bounds: Bounds; emphasis: 'real' | 'fantasy' }
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

function buildMicroTiles(project: Project, opacity: number, detail: TileDetail): Extract<ChipLayer, { kind: 'microTile' }>[] {
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

function buildTraces(project: Project, detail: TileDetail): Extract<ChipLayer, { kind: 'trace' }>[] {
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
  }
}

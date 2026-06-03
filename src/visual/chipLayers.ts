import type { Block, Project } from '../domain/project'
import { resolveMaterialRecipe } from './materialRecipes'

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
  return [block.x + block.w / 2, block.y + block.h / 2]
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

function buildMicroTiles(project: Project, opacity: number): Extract<ChipLayer, { kind: 'microTile' }>[] {
  const tiles: Extract<ChipLayer, { kind: 'microTile' }>[] = []
  const step = 56
  const tile = 18
  for (let y = 24; y + tile <= project.die.height; y += step) {
    for (let x = 24; x + tile <= project.die.width; x += step) {
      tiles.push({
        id: `micro-${x}-${y}`,
        kind: 'microTile',
        bounds: { x, y, width: tile, height: tile },
        opacity,
      })
    }
  }
  return tiles
}

function buildTraces(project: Project): Extract<ChipLayer, { kind: 'trace' }>[] {
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
      width: recipe.metalTrace.width,
      opacity: recipe.metalTrace.opacity,
    }
  })
}

export function buildChipLayers(project: Project): ChipLayerModel {
  const recipe = resolveMaterialRecipe(project.theme)
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
    microTiles: buildMicroTiles(project, recipe.microTile.opacity),
    blockSurfaces: project.blocks.map(blockSurface),
    traces: buildTraces(project),
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

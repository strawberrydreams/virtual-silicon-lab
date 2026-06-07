import { createStore } from 'zustand/vanilla'
import type {
  Block,
  BlockType,
  DieShape,
  FakeSpec,
  Project,
  StudioSpray,
  StudioSticker,
  StyleTheme,
} from '../domain/project'
import { buildBlock, nextZIndex } from '../domain/blockFactory'
import { buildDecoration, type DecorationKind } from '../domain/decorationFactory'
import { clampBlockToDie, normalizeDie } from '../features/editor/canvas/geometry'
import { reflowBlocksGlobally } from '../studio/globalReflow'

const MAX_HISTORY = 100

export type BlockTransform = {
  x: number
  y: number
  w: number
  h: number
  rotation?: number
}

export type SelectedStudioItem = { kind: 'sticker' | 'spray'; id: string }

export type StickerTransform = {
  x: number
  y: number
  rotation?: number
}

export type SprayTransform = {
  x: number
  y: number
  radius?: number
}

export type EditorState = {
  project: Project
  selectedBlockId: string | null
  selectedStudioItem: SelectedStudioItem | null
  past: Project[]
  future: Project[]
  select: (id: string | null) => void
  selectStudioItem: (item: SelectedStudioItem | null) => void
  addBlock: (type: BlockType) => void
  addSticker: () => void
  addSpray: () => void
  transformBlock: (id: string, transform: BlockTransform) => void
  transformSticker: (id: string, transform: StickerTransform) => void
  transformSpray: (id: string, transform: SprayTransform) => void
  updateSticker: (id: string, patch: Partial<Pick<StudioSticker, 'kind' | 'text' | 'color' | 'rotation'>>) => void
  updateSpray: (id: string, patch: Partial<Pick<StudioSpray, 'color' | 'intensity' | 'radius'>>) => void
  deleteSelected: () => void
  duplicateSelected: () => void
  bringForward: () => void
  sendBackward: () => void
  setDieShape: (shape: DieShape) => void
  setTheme: (theme: StyleTheme) => void
  setSpec: (spec: FakeSpec) => void
  addDecoration: (kind: DecorationKind) => void
  undo: () => void
  redo: () => void
}

type Options = {
  createId?: () => string
}

export function createEditorStore(initialProject: Project, options: Options = {}) {
  const createId = options.createId ?? (() => crypto.randomUUID())

  return createStore<EditorState>((set, get) => {
    function commit(next: Project, extra: Partial<EditorState> = {}) {
      const { project, past } = get()
      set({
        project: next,
        past: [...past, project].slice(-MAX_HISTORY),
        future: [],
        ...extra,
      })
    }

    function replaceBlocks(project: Project, blocks: Block[]): Project {
      return { ...project, blocks }
    }

    function clampToDie(block: Block, project: Project): Block {
      return { ...block, ...clampBlockToDie(block, project.die) }
    }

    function clampPoint(project: Project, x: number, y: number) {
      return {
        x: Math.min(Math.max(0, x), project.die.width),
        y: Math.min(Math.max(0, y), project.die.height),
      }
    }

    function clampSprayRadius(project: Project, radius: number) {
      return Math.min(Math.max(24, radius), Math.max(24, Math.min(project.die.width, project.die.height) / 2))
    }

    function hasSelectedStudioItem(project: Project, item: SelectedStudioItem | null) {
      if (item === null) return false
      if (item.kind === 'sticker') return project.studio.stickers.some((sticker) => sticker.id === item.id)
      return project.studio.sprays.some((spray) => spray.id === item.id)
    }

    function swapZIndex(direction: 'forward' | 'backward') {
      const { project, selectedBlockId } = get()
      const current = project.blocks.find((block) => block.id === selectedBlockId)
      if (current === undefined) return

      const candidates = project.blocks.filter((block) =>
        direction === 'forward' ? block.zIndex > current.zIndex : block.zIndex < current.zIndex,
      )
      if (candidates.length === 0) return

      const neighbor = candidates.reduce((best, block) =>
        direction === 'forward'
          ? block.zIndex < best.zIndex
            ? block
            : best
          : block.zIndex > best.zIndex
            ? block
            : best,
      )

      const blocks = project.blocks.map((block) => {
        if (block.id === current.id) return { ...block, zIndex: neighbor.zIndex }
        if (block.id === neighbor.id) return { ...block, zIndex: current.zIndex }
        return block
      })
      commit(replaceBlocks(project, blocks))
    }

    return {
      project: initialProject,
      selectedBlockId: null,
      selectedStudioItem: null,
      past: [],
      future: [],

      select(id) {
        set({ selectedBlockId: id, selectedStudioItem: null })
      },

      selectStudioItem(item) {
        set({ selectedBlockId: null, selectedStudioItem: item })
      },

      addBlock(type) {
        const { project } = get()
        const block = clampToDie(buildBlock(project, type, createId()), project)
        const blocks = [...project.blocks, block]
        const nextBlocks =
          project.studio.layoutMode === 'global-reflow'
            ? reflowBlocksGlobally({
                blocks,
                die: project.die,
                targetBlockId: block.id,
                target: { x: 0, y: 0 },
              })
            : blocks
        commit(replaceBlocks(project, nextBlocks), { selectedBlockId: block.id, selectedStudioItem: null })
      },

      addSticker() {
        const { project } = get()
        const sticker = {
          id: createId(),
          kind: 'badge' as const,
          x: project.die.width / 2,
          y: project.die.height / 2,
          text: 'STAR',
          color: '#f9f4ff',
          rotation: -8,
        }
        commit({
          ...project,
          studio: {
            ...project.studio,
            stickers: [...project.studio.stickers, sticker],
          },
        }, { selectedBlockId: null, selectedStudioItem: { kind: 'sticker', id: sticker.id } })
      },

      addSpray() {
        const { project } = get()
        const spray = {
          id: createId(),
          x: Math.round(project.die.width * 0.4),
          y: Math.round(project.die.height * 0.4),
          radius: Math.round(Math.min(project.die.width, project.die.height) * 0.24),
          color: '#ff70dc',
          intensity: 0.72,
        }
        commit({
          ...project,
          studio: {
            ...project.studio,
            sprays: [...project.studio.sprays, spray],
          },
        }, { selectedBlockId: null, selectedStudioItem: { kind: 'spray', id: spray.id } })
      },

      transformBlock(id, transform) {
        const { project } = get()
        const current = project.blocks.find((block) => block.id === id)
        const isDragOnly =
          current !== undefined &&
          current.w === transform.w &&
          current.h === transform.h &&
          current.rotation === (transform.rotation ?? current.rotation)
        const blocks = project.blocks.map((block) => {
          if (block.id !== id) return block
          const clamped = clampBlockToDie(
            {
              x: transform.x,
              y: transform.y,
              w: transform.w,
              h: transform.h,
              rotation: transform.rotation ?? block.rotation,
            },
            project.die,
          )
          return {
            ...block,
            ...clamped,
            rotation: transform.rotation ?? block.rotation,
          }
        })
        const nextBlocks =
          isDragOnly && project.studio.layoutMode === 'global-reflow'
            ? reflowBlocksGlobally({
                blocks,
                die: project.die,
                targetBlockId: id,
                target: { x: transform.x, y: transform.y },
              })
            : blocks
        commit(replaceBlocks(project, nextBlocks))
      },

      transformSticker(id, transform) {
        const { project } = get()
        const point = clampPoint(project, transform.x, transform.y)
        commit({
          ...project,
          studio: {
            ...project.studio,
            stickers: project.studio.stickers.map((sticker) =>
              sticker.id === id
                ? {
                    ...sticker,
                    ...point,
                    rotation: transform.rotation ?? sticker.rotation,
                  }
                : sticker,
            ),
          },
        })
      },

      transformSpray(id, transform) {
        const { project } = get()
        const point = clampPoint(project, transform.x, transform.y)
        commit({
          ...project,
          studio: {
            ...project.studio,
            sprays: project.studio.sprays.map((spray) =>
              spray.id === id
                ? {
                    ...spray,
                    ...point,
                    radius:
                      transform.radius === undefined
                        ? spray.radius
                        : clampSprayRadius(project, transform.radius),
                  }
                : spray,
            ),
          },
        })
      },

      updateSticker(id, patch) {
        const { project } = get()
        commit({
          ...project,
          studio: {
            ...project.studio,
            stickers: project.studio.stickers.map((sticker) =>
              sticker.id === id ? { ...sticker, ...patch } : sticker,
            ),
          },
        })
      },

      updateSpray(id, patch) {
        const { project } = get()
        commit({
          ...project,
          studio: {
            ...project.studio,
            sprays: project.studio.sprays.map((spray) =>
              spray.id === id
                ? {
                    ...spray,
                    ...patch,
                    intensity:
                      patch.intensity === undefined
                        ? spray.intensity
                        : Math.min(Math.max(0, patch.intensity), 1),
                    radius:
                      patch.radius === undefined ? spray.radius : clampSprayRadius(project, patch.radius),
                  }
                : spray,
            ),
          },
        })
      },

      deleteSelected() {
        const { project, selectedBlockId, selectedStudioItem } = get()
        if (selectedStudioItem !== null) {
          commit(
            {
              ...project,
              studio: {
                ...project.studio,
                stickers:
                  selectedStudioItem.kind === 'sticker'
                    ? project.studio.stickers.filter((sticker) => sticker.id !== selectedStudioItem.id)
                    : project.studio.stickers,
                sprays:
                  selectedStudioItem.kind === 'spray'
                    ? project.studio.sprays.filter((spray) => spray.id !== selectedStudioItem.id)
                    : project.studio.sprays,
              },
            },
            { selectedStudioItem: null },
          )
          return
        }
        if (selectedBlockId === null) return
        commit(
          replaceBlocks(
            project,
            project.blocks.filter((block) => block.id !== selectedBlockId),
          ),
          { selectedBlockId: null, selectedStudioItem: null },
        )
      },

      duplicateSelected() {
        const { project, selectedBlockId, selectedStudioItem } = get()
        if (selectedStudioItem?.kind === 'sticker') {
          const source = project.studio.stickers.find((sticker) => sticker.id === selectedStudioItem.id)
          if (source === undefined) return
          const copy = {
            ...source,
            id: createId(),
            x: Math.min(project.die.width, source.x + 24),
            y: Math.min(project.die.height, source.y + 24),
          }
          commit(
            {
              ...project,
              studio: { ...project.studio, stickers: [...project.studio.stickers, copy] },
            },
            { selectedBlockId: null, selectedStudioItem: { kind: 'sticker', id: copy.id } },
          )
          return
        }
        if (selectedStudioItem?.kind === 'spray') {
          const source = project.studio.sprays.find((spray) => spray.id === selectedStudioItem.id)
          if (source === undefined) return
          const copy = {
            ...source,
            id: createId(),
            x: Math.min(project.die.width, source.x + 24),
            y: Math.min(project.die.height, source.y + 24),
          }
          commit(
            {
              ...project,
              studio: { ...project.studio, sprays: [...project.studio.sprays, copy] },
            },
            { selectedBlockId: null, selectedStudioItem: { kind: 'spray', id: copy.id } },
          )
          return
        }
        const source = project.blocks.find((block) => block.id === selectedBlockId)
        if (source === undefined) return

        const copy = clampToDie(
          {
            ...source,
            id: createId(),
            x: source.x + 16,
            y: source.y + 16,
            zIndex: nextZIndex(project.blocks),
          },
          project,
        )
        commit(replaceBlocks(project, [...project.blocks, copy]), { selectedBlockId: copy.id, selectedStudioItem: null })
      },

      bringForward() {
        swapZIndex('forward')
      },

      sendBackward() {
        swapZIndex('backward')
      },

      setDieShape(shape) {
        const { project } = get()
        const die = normalizeDie(project.die, shape)
        const blocks = project.blocks.map((block) => ({
          ...block,
          ...clampBlockToDie(block, die),
        }))
        commit({ ...project, die, blocks })
      },

      setTheme(theme) {
        const { project } = get()
        if (project.theme === theme) return
        commit({ ...project, theme })
      },

      setSpec(spec) {
        const { project } = get()
        commit({ ...project, spec: { ...spec, features: [...spec.features] } })
      },

      addDecoration(kind) {
        const { project } = get()
        const decoration = buildDecoration(project, kind, createId())
        commit({ ...project, decorations: [...project.decorations, decoration] })
      },

      undo() {
        const { past, project, future, selectedBlockId, selectedStudioItem } = get()
        if (past.length === 0) return
        const previous = past[past.length - 1]
        set({
          project: previous,
          past: past.slice(0, -1),
          future: [project, ...future],
          selectedBlockId: previous.blocks.some((block) => block.id === selectedBlockId)
            ? selectedBlockId
            : null,
          selectedStudioItem: hasSelectedStudioItem(previous, selectedStudioItem) ? selectedStudioItem : null,
        })
      },

      redo() {
        const { past, project, future, selectedBlockId, selectedStudioItem } = get()
        if (future.length === 0) return
        const next = future[0]
        set({
          project: next,
          past: [...past, project].slice(-MAX_HISTORY),
          future: future.slice(1),
          selectedBlockId: next.blocks.some((block) => block.id === selectedBlockId)
            ? selectedBlockId
            : null,
          selectedStudioItem: hasSelectedStudioItem(next, selectedStudioItem) ? selectedStudioItem : null,
        })
      },
    }
  })
}

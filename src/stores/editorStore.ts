import { createStore } from 'zustand/vanilla'
import type { Block, BlockType, DieShape, Project } from '../domain/project'
import { buildBlock, nextZIndex } from '../domain/blockFactory'
import { clampBlockToDie, normalizeDie } from '../features/editor/canvas/geometry'

const MAX_HISTORY = 100

export type BlockTransform = {
  x: number
  y: number
  w: number
  h: number
  rotation?: number
}

export type EditorState = {
  project: Project
  selectedBlockId: string | null
  past: Project[]
  future: Project[]
  select: (id: string | null) => void
  addBlock: (type: BlockType) => void
  transformBlock: (id: string, transform: BlockTransform) => void
  deleteSelected: () => void
  duplicateSelected: () => void
  bringForward: () => void
  sendBackward: () => void
  setDieShape: (shape: DieShape) => void
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
      past: [],
      future: [],

      select(id) {
        set({ selectedBlockId: id })
      },

      addBlock(type) {
        const { project } = get()
        const block = clampToDie(buildBlock(project, type, createId()), project)
        commit(replaceBlocks(project, [...project.blocks, block]), { selectedBlockId: block.id })
      },

      transformBlock(id, transform) {
        const { project } = get()
        const blocks = project.blocks.map((block) => {
          if (block.id !== id) return block
          const clamped = clampBlockToDie(
            { x: transform.x, y: transform.y, w: transform.w, h: transform.h },
            project.die,
          )
          return {
            ...block,
            ...clamped,
            rotation: transform.rotation ?? block.rotation,
          }
        })
        commit(replaceBlocks(project, blocks))
      },

      deleteSelected() {
        const { project, selectedBlockId } = get()
        if (selectedBlockId === null) return
        commit(
          replaceBlocks(
            project,
            project.blocks.filter((block) => block.id !== selectedBlockId),
          ),
          { selectedBlockId: null },
        )
      },

      duplicateSelected() {
        const { project, selectedBlockId } = get()
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
        commit(replaceBlocks(project, [...project.blocks, copy]), { selectedBlockId: copy.id })
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

      undo() {
        const { past, project, future, selectedBlockId } = get()
        if (past.length === 0) return
        const previous = past[past.length - 1]
        set({
          project: previous,
          past: past.slice(0, -1),
          future: [project, ...future],
          selectedBlockId: previous.blocks.some((block) => block.id === selectedBlockId)
            ? selectedBlockId
            : null,
        })
      },

      redo() {
        const { past, project, future, selectedBlockId } = get()
        if (future.length === 0) return
        const next = future[0]
        set({
          project: next,
          past: [...past, project].slice(-MAX_HISTORY),
          future: future.slice(1),
          selectedBlockId: next.blocks.some((block) => block.id === selectedBlockId)
            ? selectedBlockId
            : null,
        })
      },
    }
  })
}

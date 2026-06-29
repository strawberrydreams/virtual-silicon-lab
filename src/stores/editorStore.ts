import { createStore } from 'zustand/vanilla'
import type { AiLayoutSuggestion } from '../domain/ai/aiLayoutSuggestion'
import { resolveAiSuggestionBlock } from '../domain/ai/resolveAiSuggestionBlock'
import type {
  Block,
  BlockType,
  DieShapeParams,
  DieShape,
  FakeSpec,
  Project,
  StudioColorPaint,
  StudioColorTarget,
  StudioSpray,
  StudioSticker,
  StudioStickerKind,
  StudioTileSettings,
  StyleTheme,
} from '../domain/project'
import type {
  Scene3DAnimationSettings,
  Scene3DCameraSettings,
  Scene3DEnvironmentSettings,
  Scene3DLightingSettings,
} from '../domain/scene3d/scene3d'
import { buildBlock, nextZIndex } from '../domain/blockFactory'
import { buildDecoration, type DecorationKind } from '../domain/decorationFactory'
import { isParametricDieShape, resolveDieShapeParams } from '../domain/die/dieShapeParams'
import type { ChipFinish } from '../domain/material/chipFinish'
import { clampBlockToDie, normalizeDie } from '../features/editor/canvas/geometry'
import { reflowBlocksGlobally } from '../studio/globalReflow'

const MAX_HISTORY = 100

const STICKER_PRESETS: Record<
  StudioStickerKind,
  { text: string; color: string; rotation: number }
> = {
  badge: { text: 'STAR', color: '#f9f4ff', rotation: -8 },
  mascot: { text: 'MAX', color: '#ffd84d', rotation: -6 },
  warning: { text: '!', color: '#ff5a5a', rotation: 0 },
  label: { text: 'LABEL', color: '#9be7ff', rotation: 0 },
}

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
  dieParameterEditActive: boolean
  select: (id: string | null) => void
  selectStudioItem: (item: SelectedStudioItem | null) => void
  addBlock: (type: BlockType) => void
  applyAiSuggestion: (suggestion: AiLayoutSuggestion) => void
  addSticker: (kind?: StudioStickerKind) => void
  addSpray: (color?: string) => void
  transformBlock: (id: string, transform: BlockTransform) => void
  transformSticker: (id: string, transform: StickerTransform) => void
  transformSpray: (id: string, transform: SprayTransform) => void
  updateSticker: (
    id: string,
    patch: Partial<Pick<StudioSticker, 'kind' | 'text' | 'color' | 'rotation'>>,
  ) => void
  updateSpray: (
    id: string,
    patch: Partial<Pick<StudioSpray, 'color' | 'intensity' | 'radius' | 'blend'>>,
  ) => void
  updateBlockVisual: (
    id: string,
    patch: Partial<Pick<Block, 'colorOverride' | 'imageDataUrl'>>,
  ) => void
  setTileSettings: (patch: Partial<StudioTileSettings>) => void
  setColorPaint: (target: StudioColorTarget, paint: StudioColorPaint) => void
  deleteSelected: () => void
  duplicateSelected: () => void
  bringForward: () => void
  sendBackward: () => void
  setDieShape: (shape: DieShape) => void
  previewDieShapeParams: (params: DieShapeParams) => void
  commitDieShapeParamEdit: () => void
  cancelDieShapeParamEdit: () => void
  setDieShapeParams: (params: DieShapeParams) => void
  setTheme: (theme: StyleTheme) => void
  setFinish: (finish: ChipFinish) => void
  setBlockFinish: (id: string, finish: ChipFinish | undefined) => void
  setScene3DCamera: (camera: Scene3DCameraSettings) => void
  resetScene3DCamera: () => void
  setScene3DLighting: (lighting: Scene3DLightingSettings) => void
  resetScene3DLighting: () => void
  setScene3DEnvironment: (environment: Scene3DEnvironmentSettings) => void
  resetScene3DEnvironment: () => void
  setScene3DAnimation: (animation: Scene3DAnimationSettings) => void
  resetScene3DAnimation: () => void
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
    // Consecutive commits sharing a tag (e.g. dragging a color picker or typing in
    // a sticker field) collapse into one undo step instead of one per keystroke.
    let lastCommitTag: string | null = null
    let dieParameterBaseline: Project | null = null

    function commit(next: Project, extra: Partial<EditorState> = {}, tag: string | null = null) {
      const { project, past } = get()
      const previewBaseline = dieParameterBaseline
      const coalesce = previewBaseline === null && tag !== null && tag === lastCommitTag
      lastCommitTag = tag
      dieParameterBaseline = null
      const history =
        previewBaseline === null || previewBaseline === project
          ? [...past, project]
          : [...past, previewBaseline, project]
      set({
        project: next,
        past: coalesce ? past : history.slice(-MAX_HISTORY),
        future: [],
        dieParameterEditActive: false,
        ...extra,
      })
    }

    function resetCoalesce() {
      lastCommitTag = null
    }

    function replaceBlocks(project: Project, blocks: Block[]): Project {
      return { ...project, blocks }
    }

    function clampToDie(block: Block, project: Project): Block {
      return { ...block, ...clampBlockToDie(block, project.die) }
    }

    function sameDieShapeParams(
      left: DieShapeParams | undefined,
      right: DieShapeParams | undefined,
    ) {
      return JSON.stringify(left) === JSON.stringify(right)
    }

    function cloneScene3DCamera(camera: Scene3DCameraSettings): Scene3DCameraSettings {
      return {
        azimuthRadians: camera.azimuthRadians,
        elevationRadians: camera.elevationRadians,
        zoom: camera.zoom,
        ...(camera.targetNudge === undefined ? {} : { targetNudge: [...camera.targetNudge] as const }),
        ...(camera.fov === undefined ? {} : { fov: camera.fov }),
      }
    }

    function sameScene3DCamera(
      left: Scene3DCameraSettings | undefined,
      right: Scene3DCameraSettings | undefined,
    ) {
      return JSON.stringify(left) === JSON.stringify(right)
    }

    function cloneScene3DLighting(lighting: Scene3DLightingSettings): Scene3DLightingSettings {
      return {
        preset: lighting.preset,
        intensity: lighting.intensity,
      }
    }

    function sameScene3DLighting(
      left: Scene3DLightingSettings | undefined,
      right: Scene3DLightingSettings | undefined,
    ) {
      return JSON.stringify(left) === JSON.stringify(right)
    }

    function cloneScene3DEnvironment(environment: Scene3DEnvironmentSettings): Scene3DEnvironmentSettings {
      return {
        topColor: environment.topColor,
        bottomColor: environment.bottomColor,
        exposure: environment.exposure,
        bloom: {
          threshold: environment.bloom.threshold,
          strength: environment.bloom.strength,
          radius: environment.bloom.radius,
        },
      }
    }

    function sameScene3DEnvironment(
      left: Scene3DEnvironmentSettings | undefined,
      right: Scene3DEnvironmentSettings | undefined,
    ) {
      return JSON.stringify(left) === JSON.stringify(right)
    }

    function cloneScene3DAnimation(animation: Scene3DAnimationSettings): Scene3DAnimationSettings {
      return {
        turntable: {
          enabled: animation.turntable.enabled,
          periodSeconds: animation.turntable.periodSeconds,
        },
        glow: {
          enabled: animation.glow.enabled,
          periodSeconds: animation.glow.periodSeconds,
          min: animation.glow.min,
          max: animation.glow.max,
        },
      }
    }

    function sameScene3DAnimation(
      left: Scene3DAnimationSettings | undefined,
      right: Scene3DAnimationSettings | undefined,
    ) {
      return JSON.stringify(left) === JSON.stringify(right)
    }

    function projectWithDieShapeParams(baseline: Project, value: unknown): Project {
      if (!isParametricDieShape(baseline.die.shape)) return baseline
      const current = resolveDieShapeParams(baseline.die.shape, baseline.die.dieShapeParams)
      const dieShapeParams = resolveDieShapeParams(baseline.die.shape, value)
      if (sameDieShapeParams(current, dieShapeParams)) return baseline
      const die = { ...baseline.die, dieShapeParams }
      const blocks = baseline.blocks.map((block) => ({
        ...block,
        ...clampBlockToDie(block, die),
      }))
      return { ...baseline, die, blocks }
    }

    function clampPoint(die: Project['die'], x: number, y: number) {
      return {
        x: Math.min(Math.max(0, x), die.width),
        y: Math.min(Math.max(0, y), die.height),
      }
    }

    function clampSprayRadius(die: Project['die'], radius: number) {
      return Math.min(Math.max(24, radius), Math.max(24, Math.min(die.width, die.height) / 2))
    }

    function hasSelectedStudioItem(project: Project, item: SelectedStudioItem | null) {
      if (item === null) return false
      if (item.kind === 'sticker')
        return project.studio.stickers.some((sticker) => sticker.id === item.id)
      return project.studio.sprays.some((spray) => spray.id === item.id)
    }

    function offsetStudioCopy<T extends { id: string; x: number; y: number }>(
      project: Project,
      source: T,
    ): T {
      return {
        ...source,
        id: createId(),
        x: Math.min(project.die.width, source.x + 24),
        y: Math.min(project.die.height, source.y + 24),
      }
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
      dieParameterEditActive: false,

      select(id) {
        resetCoalesce()
        set({ selectedBlockId: id, selectedStudioItem: null })
      },

      selectStudioItem(item) {
        resetCoalesce()
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
        commit(replaceBlocks(project, nextBlocks), {
          selectedBlockId: block.id,
          selectedStudioItem: null,
        })
      },

      applyAiSuggestion(suggestion) {
        const { project } = get()
        const block = resolveAiSuggestionBlock(project, suggestion, createId())
        if (block === null) return
        const blocks = [...project.blocks, block]
        const nextBlocks =
          project.studio.layoutMode === 'global-reflow'
            ? reflowBlocksGlobally({
                blocks,
                die: project.die,
                targetBlockId: block.id,
                target: { x: block.x, y: block.y },
              })
            : blocks
        commit(replaceBlocks(project, nextBlocks), {
          selectedBlockId: block.id,
          selectedStudioItem: null,
        })
      },

      addSticker(kind = 'badge') {
        const { project } = get()
        const preset = STICKER_PRESETS[kind]
        const sticker = {
          id: createId(),
          kind,
          x: project.die.width / 2,
          y: project.die.height / 2,
          ...preset,
        }
        commit(
          {
            ...project,
            studio: {
              ...project.studio,
              stickers: [...project.studio.stickers, sticker],
            },
          },
          { selectedBlockId: null, selectedStudioItem: { kind: 'sticker', id: sticker.id } },
        )
      },

      addSpray(color = '#ff70dc') {
        const { project } = get()
        const spray = {
          id: createId(),
          x: Math.round(project.die.width * 0.4),
          y: Math.round(project.die.height * 0.4),
          radius: Math.round(Math.min(project.die.width, project.die.height) * 0.24),
          color,
          intensity: 0.72,
          blend: 'screen' as const,
        }
        commit(
          {
            ...project,
            studio: {
              ...project.studio,
              sprays: [...project.studio.sprays, spray],
            },
          },
          { selectedBlockId: null, selectedStudioItem: { kind: 'spray', id: spray.id } },
        )
      },

      transformBlock(id, transform) {
        const { project } = get()
        const current = project.blocks.find((block) => block.id === id)
        if (current === undefined) return
        const isDragOnly =
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
        if (!project.studio.stickers.some((sticker) => sticker.id === id)) return
        const point = clampPoint(project.die, transform.x, transform.y)
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
        if (!project.studio.sprays.some((spray) => spray.id === id)) return
        const point = clampPoint(project.die, transform.x, transform.y)
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
                        : clampSprayRadius(project.die, transform.radius),
                  }
                : spray,
            ),
          },
        })
      },

      updateSticker(id, patch) {
        const { project } = get()
        if (!project.studio.stickers.some((sticker) => sticker.id === id)) return
        commit(
          {
            ...project,
            studio: {
              ...project.studio,
              stickers: project.studio.stickers.map((sticker) =>
                sticker.id === id ? { ...sticker, ...patch } : sticker,
              ),
            },
          },
          {},
          `update-sticker:${id}`,
        )
      },

      updateSpray(id, patch) {
        const { project } = get()
        if (!project.studio.sprays.some((spray) => spray.id === id)) return
        commit(
          {
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
                        patch.radius === undefined
                          ? spray.radius
                          : clampSprayRadius(project.die, patch.radius),
                    }
                  : spray,
              ),
            },
          },
          {},
          `update-spray:${id}`,
        )
      },

      updateBlockVisual(id, patch) {
        const { project } = get()
        if (!project.blocks.some((block) => block.id === id)) return
        commit(
          replaceBlocks(
            project,
            project.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
          ),
          {},
          `update-block-visual:${id}`,
        )
      },

      setTileSettings(patch) {
        const { project } = get()
        const tile = project.studio.tileSettings
        const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
        const next: StudioTileSettings = {
          ...tile,
          ...patch,
          detailDensity:
            patch.detailDensity === undefined ? tile.detailDensity : clamp01(patch.detailDensity),
          routeIntensity:
            patch.routeIntensity === undefined
              ? tile.routeIntensity
              : clamp01(patch.routeIntensity),
        }
        commit(
          { ...project, studio: { ...project.studio, tileSettings: next } },
          {},
          'set-tile-settings',
        )
      },

      setColorPaint(target, paint) {
        const { project } = get()
        commit(
          {
            ...project,
            studio: {
              ...project.studio,
              colorSettings: {
                ...project.studio.colorSettings,
                [target]: { ...paint },
              },
            },
          },
          {},
          `set-color-paint:${target}`,
        )
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
                    ? project.studio.stickers.filter(
                        (sticker) => sticker.id !== selectedStudioItem.id,
                      )
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
          const source = project.studio.stickers.find(
            (sticker) => sticker.id === selectedStudioItem.id,
          )
          if (source === undefined) return
          const copy = offsetStudioCopy(project, source)
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
          const copy = offsetStudioCopy(project, source)
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
        commit(replaceBlocks(project, [...project.blocks, copy]), {
          selectedBlockId: copy.id,
          selectedStudioItem: null,
        })
      },

      bringForward() {
        swapZIndex('forward')
      },

      sendBackward() {
        swapZIndex('backward')
      },

      setDieShape(shape) {
        const { project } = get()
        if (project.die.shape === shape) return
        const die = normalizeDie(project.die, shape)
        const blocks = project.blocks.map((block) => ({
          ...block,
          ...clampBlockToDie(block, die),
        }))
        // Studio items are clipped to the die outline when rendered, so anything
        // left outside a shrunken die would become invisible and unselectable.
        const stickers = project.studio.stickers.map((sticker) => ({
          ...sticker,
          ...clampPoint(die, sticker.x, sticker.y),
        }))
        const sprays = project.studio.sprays.map((spray) => ({
          ...spray,
          ...clampPoint(die, spray.x, spray.y),
          radius: clampSprayRadius(die, spray.radius),
        }))
        commit({ ...project, die, blocks, studio: { ...project.studio, stickers, sprays } })
      },

      previewDieShapeParams(params) {
        const { project } = get()
        const baseline = dieParameterBaseline ?? project
        const next = projectWithDieShapeParams(baseline, params)
        if (dieParameterBaseline === null && next === baseline) return
        dieParameterBaseline = baseline
        set({ project: next, dieParameterEditActive: true })
      },

      commitDieShapeParamEdit() {
        const baseline = dieParameterBaseline
        if (baseline === null) return
        const { project, past } = get()
        dieParameterBaseline = null
        resetCoalesce()
        if (project === baseline) {
          set({ dieParameterEditActive: false })
          return
        }
        set({
          past: [...past, baseline].slice(-MAX_HISTORY),
          future: [],
          dieParameterEditActive: false,
        })
      },

      cancelDieShapeParamEdit() {
        const baseline = dieParameterBaseline
        if (baseline === null) return
        dieParameterBaseline = null
        resetCoalesce()
        set({ project: baseline, dieParameterEditActive: false })
      },

      setDieShapeParams(params) {
        const { project } = get()
        const next = projectWithDieShapeParams(project, params)
        if (next === project) return
        commit(next)
      },

      setTheme(theme) {
        const { project } = get()
        if (project.theme === theme) return
        commit({ ...project, theme })
      },

      setFinish(finish) {
        const { project } = get()
        if (project.finish === finish) return
        commit({ ...project, finish })
      },

      setBlockFinish(id, finish) {
        const { project } = get()
        const current = project.blocks.find((block) => block.id === id)
        if (current === undefined || current.finish === finish) return
        const blocks = project.blocks.map((block) => {
          if (block.id !== id) return block
          const next = { ...block, finish }
          if (finish === undefined) delete next.finish
          return next
        })
        commit(replaceBlocks(project, blocks))
      },

      setScene3DCamera(camera) {
        const { project } = get()
        const nextCamera = cloneScene3DCamera(camera)
        if (sameScene3DCamera(project.scene3d?.camera, nextCamera)) return
        commit({
          ...project,
          scene3d: {
            ...project.scene3d,
            camera: nextCamera,
          },
        })
      },

      resetScene3DCamera() {
        const { project } = get()
        if (project.scene3d?.camera === undefined) return
        const scene3d = { ...project.scene3d }
        delete scene3d.camera
        const next: Project = { ...project, scene3d }
        if (Object.keys(scene3d).length === 0) delete next.scene3d
        commit(next)
      },

      setScene3DLighting(lighting) {
        const { project } = get()
        const nextLighting = cloneScene3DLighting(lighting)
        if (sameScene3DLighting(project.scene3d?.lighting, nextLighting)) return
        commit({
          ...project,
          scene3d: {
            ...project.scene3d,
            lighting: nextLighting,
          },
        })
      },

      resetScene3DLighting() {
        const { project } = get()
        if (project.scene3d?.lighting === undefined) return
        const scene3d = { ...project.scene3d }
        delete scene3d.lighting
        const next: Project = { ...project, scene3d }
        if (Object.keys(scene3d).length === 0) delete next.scene3d
        commit(next)
      },

      setScene3DEnvironment(environment) {
        const { project } = get()
        const nextEnvironment = cloneScene3DEnvironment(environment)
        if (sameScene3DEnvironment(project.scene3d?.environment, nextEnvironment)) return
        commit({
          ...project,
          scene3d: {
            ...project.scene3d,
            environment: nextEnvironment,
          },
        })
      },

      resetScene3DEnvironment() {
        const { project } = get()
        if (project.scene3d?.environment === undefined) return
        const scene3d = { ...project.scene3d }
        delete scene3d.environment
        const next: Project = { ...project, scene3d }
        if (Object.keys(scene3d).length === 0) delete next.scene3d
        commit(next)
      },

      setScene3DAnimation(animation) {
        const { project } = get()
        const nextAnimation = cloneScene3DAnimation(animation)
        if (sameScene3DAnimation(project.scene3d?.animation, nextAnimation)) return
        commit({
          ...project,
          scene3d: {
            ...project.scene3d,
            animation: nextAnimation,
          },
        })
      },

      resetScene3DAnimation() {
        const { project } = get()
        if (project.scene3d?.animation === undefined) return
        const scene3d = { ...project.scene3d }
        delete scene3d.animation
        const next: Project = { ...project, scene3d }
        if (Object.keys(scene3d).length === 0) delete next.scene3d
        commit(next)
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
        if (dieParameterBaseline !== null) get().commitDieShapeParamEdit()
        const { past, project, future, selectedBlockId, selectedStudioItem } = get()
        if (past.length === 0) return
        resetCoalesce()
        const previous = past[past.length - 1]
        set({
          project: previous,
          past: past.slice(0, -1),
          future: [project, ...future],
          selectedBlockId: previous.blocks.some((block) => block.id === selectedBlockId)
            ? selectedBlockId
            : null,
          selectedStudioItem: hasSelectedStudioItem(previous, selectedStudioItem)
            ? selectedStudioItem
            : null,
        })
      },

      redo() {
        if (dieParameterBaseline !== null) get().commitDieShapeParamEdit()
        const { past, project, future, selectedBlockId, selectedStudioItem } = get()
        if (future.length === 0) return
        resetCoalesce()
        const next = future[0]
        set({
          project: next,
          past: [...past, project].slice(-MAX_HISTORY),
          future: future.slice(1),
          selectedBlockId: next.blocks.some((block) => block.id === selectedBlockId)
            ? selectedBlockId
            : null,
          selectedStudioItem: hasSelectedStudioItem(next, selectedStudioItem)
            ? selectedStudioItem
            : null,
        })
      },
    }
  })
}

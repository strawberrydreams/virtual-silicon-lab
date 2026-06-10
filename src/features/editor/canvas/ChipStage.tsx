import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type Konva from 'konva'
import { Layer, Stage, Transformer } from 'react-konva'
import type { Block, Project, StudioSpray, StudioSticker } from '../../../domain/project'
import { snapToGrid } from './geometry'
import type { BlockTransform } from '../../../stores/editorStore'
import { stepZoom, zoomAtPointer } from './viewport'
import { resolveTheme, type ThemeTokens } from '../../../themes/themeTokens'
import { editorStageFrameSize, editorStageSize } from './artworkLayout'
import { BlockArtwork, ChipArtwork, StudioSprayArtwork, StudioStickerArtwork } from './ChipArtwork'
import type { SelectedStudioItem, SprayTransform, StickerTransform } from '../../../stores/editorStore'
import { reflowBlocksGlobally } from '../../../studio/globalReflow'
import { rafThrottle } from '../../../lib/rafThrottle'
import { resolveTileDetail } from '../../../visual/tileDetail'
import { DEFAULT_LAYER_VISIBILITY, type ChipLayerVisibility } from '../layerVisibility'

const GRID = 16
const MIN_BLOCK = 48
const COLUMN_COORDS = Array.from({ length: 16 }, (_, index) => String(index + 1).padStart(2, '0'))
const ROW_COORDS = Array.from({ length: 16 }, (_, index) => String.fromCharCode(65 + index))

type Props = {
  project: Project
  selectedBlockId: string | null
  selectedStudioItem: SelectedStudioItem | null
  onSelectBlock: (id: string | null) => void
  onSelectStudioItem: (item: SelectedStudioItem | null) => void
  layerVisibility?: ChipLayerVisibility
  onTransformBlock: (id: string, transform: BlockTransform) => void
  onTransformSticker: (id: string, transform: StickerTransform) => void
  onTransformSpray: (id: string, transform: SprayTransform) => void
}

export function ChipStage({
  project,
  selectedBlockId,
  selectedStudioItem,
  onSelectBlock,
  onSelectStudioItem,
  layerVisibility = DEFAULT_LAYER_VISIBILITY,
  onTransformBlock,
  onTransformSticker,
  onTransformSpray,
}: Props) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [previewBlocks, setPreviewBlocks] = useState<Project['blocks'] | null>(null)
  // Pointer-move events can outpace the display; coalesce the reflow + preview
  // re-render to one per animation frame so dragging stays at frame rate.
  const scheduleReflowPreview = useMemo(
    () => rafThrottle((compute: () => Project['blocks']) => setPreviewBlocks(compute())),
    [],
  )
  useEffect(() => () => scheduleReflowPreview.cancel(), [scheduleReflowPreview])
  const blockRefs = useRef(new Map<string, Konva.Group>())
  const studioRefs = useRef(new Map<string, Konva.Group>())
  const transformerRef = useRef<Konva.Transformer>(null)
  const tokens = resolveTheme(project.theme)
  const backgroundPaint = project.studio.colorSettings.background
  const stageBackground =
    backgroundPaint.mode === 'solid'
      ? backgroundPaint.color
      : `linear-gradient(135deg, ${backgroundPaint.from}, ${backgroundPaint.to})`

  useEffect(() => {
    const transformer = transformerRef.current
    if (transformer === null) return
    const studioKey = selectedStudioItem ? `${selectedStudioItem.kind}:${selectedStudioItem.id}` : null
    const node = selectedBlockId
      ? blockRefs.current.get(selectedBlockId)
      : studioKey
        ? studioRefs.current.get(studioKey)
        : undefined
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  }, [selectedBlockId, selectedStudioItem, project.blocks, project.studio.stickers, project.studio.sprays])

  const displayProject = previewBlocks === null ? project : { ...project, blocks: previewBlocks }
  // Stickers are fixed-size (rotate only); sprays scale to a radius (no rotation);
  // blocks support both — so the shared Transformer adapts to what is selected.
  const transformerKind = selectedStudioItem?.kind ?? (selectedBlockId ? 'block' : null)
  const tileDetail = useMemo(() => resolveTileDetail(project.studio.tileSettings), [project.studio.tileSettings])

  // The render props are memoized so the memoized ChipArtwork can skip
  // re-rendering its multi-thousand-node tree on zoom/pan state changes.
  const renderBlock = useCallback(
    (block: Block, blockTokens: ThemeTokens) => (
      <BlockArtwork
        block={block}
        tokens={blockTokens}
        selected={block.id === selectedBlockId}
        detail={tileDetail}
        colors={project.studio.colorSettings}
        showLabel={layerVisibility.Label}
        groupRef={(node) => {
          if (node) blockRefs.current.set(block.id, node)
          else blockRefs.current.delete(block.id)
        }}
        groupProps={{
          draggable: true,
          onClick: () => onSelectBlock(block.id),
          onTap: () => onSelectBlock(block.id),
          onDragStart: () => {
            onSelectBlock(block.id)
            setPreviewBlocks(project.blocks)
          },
          onDragMove: (event) => {
            if (project.studio.layoutMode !== 'global-reflow') return
            const pointerX = event.target.x()
            const pointerY = event.target.y()
            scheduleReflowPreview(() => {
              const blocks = project.blocks.map((candidate) =>
                candidate.id === block.id ? { ...candidate, x: pointerX, y: pointerY } : candidate,
              )
              const reflowed = reflowBlocksGlobally({
                blocks,
                die: project.die,
                targetBlockId: block.id,
                target: { x: pointerX, y: pointerY },
              })
              // Keep the dragged tile under the pointer so React's prop does
              // not fight Konva's live drag position; only the others reflow.
              return reflowed.map((candidate) =>
                candidate.id === block.id ? { ...candidate, x: pointerX, y: pointerY } : candidate,
              )
            })
          },
          onDragEnd: (event) => {
            // Drop any pending preview frame so it cannot resurrect stale
            // preview blocks after the drag commits.
            scheduleReflowPreview.cancel()
            setPreviewBlocks(null)
            onTransformBlock(block.id, {
              x: snapToGrid(event.target.x(), GRID),
              y: snapToGrid(event.target.y(), GRID),
              w: block.w,
              h: block.h,
              rotation: block.rotation,
            })
          },
          onTransformEnd: (event) => {
            const node = event.target as Konva.Group
            const scaleX = node.scaleX()
            const scaleY = node.scaleY()
            node.scaleX(1)
            node.scaleY(1)
            onTransformBlock(block.id, {
              x: node.x(),
              y: node.y(),
              w: Math.max(MIN_BLOCK, block.w * scaleX),
              h: Math.max(MIN_BLOCK, block.h * scaleY),
              rotation: node.rotation(),
            })
          },
        }}
      />
    ),
    [project, selectedBlockId, tileDetail, layerVisibility, onSelectBlock, onTransformBlock, scheduleReflowPreview],
  )

  const renderStudioSpray = useCallback(
    (spray: StudioSpray) => (
      <StudioSprayArtwork
        spray={spray}
        selected={selectedStudioItem?.kind === 'spray' && selectedStudioItem.id === spray.id}
        groupRef={(node) => {
          const key = `spray:${spray.id}`
          if (node) studioRefs.current.set(key, node)
          else studioRefs.current.delete(key)
        }}
        groupProps={{
          draggable: true,
          onClick: () => onSelectStudioItem({ kind: 'spray', id: spray.id }),
          onTap: () => onSelectStudioItem({ kind: 'spray', id: spray.id }),
          onDragStart: () => onSelectStudioItem({ kind: 'spray', id: spray.id }),
          onDragEnd: (event) => {
            onTransformSpray(spray.id, {
              x: snapToGrid(event.target.x(), GRID),
              y: snapToGrid(event.target.y(), GRID),
              radius: spray.radius,
            })
          },
          onTransformEnd: (event) => {
            const node = event.target as Konva.Group
            const scaleX = node.scaleX()
            const scaleY = node.scaleY()
            node.scaleX(1)
            node.scaleY(1)
            onTransformSpray(spray.id, {
              x: node.x(),
              y: node.y(),
              radius: Math.max(24, spray.radius * Math.max(scaleX, scaleY)),
            })
          },
        }}
      />
    ),
    [selectedStudioItem, onSelectStudioItem, onTransformSpray],
  )

  const renderStudioSticker = useCallback(
    (sticker: StudioSticker) => (
      <StudioStickerArtwork
        sticker={sticker}
        selected={selectedStudioItem?.kind === 'sticker' && selectedStudioItem.id === sticker.id}
        groupRef={(node) => {
          const key = `sticker:${sticker.id}`
          if (node) studioRefs.current.set(key, node)
          else studioRefs.current.delete(key)
        }}
        groupProps={{
          draggable: true,
          onClick: () => onSelectStudioItem({ kind: 'sticker', id: sticker.id }),
          onTap: () => onSelectStudioItem({ kind: 'sticker', id: sticker.id }),
          onDragStart: () => onSelectStudioItem({ kind: 'sticker', id: sticker.id }),
          onDragEnd: (event) => {
            onTransformSticker(sticker.id, {
              x: snapToGrid(event.target.x(), GRID),
              y: snapToGrid(event.target.y(), GRID),
              rotation: sticker.rotation,
            })
          },
          onTransformEnd: (event) => {
            const node = event.target as Konva.Group
            node.scaleX(1)
            node.scaleY(1)
            onTransformSticker(sticker.id, {
              x: node.x(),
              y: node.y(),
              rotation: node.rotation(),
            })
          },
        }}
      />
    ),
    [selectedStudioItem, onSelectStudioItem, onTransformSticker],
  )

  const stageSize = editorStageSize(project.die)
  const frameSize = editorStageFrameSize(project.die)
  const zoomLabel = `Zoom ${Math.round(scale * 100)}%`
  const adjustZoom = (delta: number) => {
    setScale((current) => stepZoom(current, delta))
  }
  const resetView = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  return (
    <div
      className="chip-stage-frame"
      style={{ background: stageBackground || tokens.background[tokens.background.length - 1].color }}
    >
      <div className="chip-stage-frame__chrome" style={{ width: frameSize.width, minHeight: frameSize.height }}>
        <div className="chip-stage-frame__readout" aria-hidden="true">
          <span>scale {scale.toFixed(2)}x</span>
          <span>x {Math.round(position.x)}</span>
          <span>y {Math.round(position.y)}</span>
        </div>
        <div
          aria-label="Chip coordinate workspace"
          className="chip-coordinate-workspace"
          role="region"
          style={{ width: stageSize.width, height: stageSize.height }}
        >
          <div aria-label="Column coordinates" className="chip-coordinate-workspace__columns">
            {COLUMN_COORDS.map((coord) => (
              <span key={coord}>{coord}</span>
            ))}
          </div>
          <div aria-label="Row coordinates" className="chip-coordinate-workspace__rows">
            {ROW_COORDS.map((coord) => (
              <span key={coord}>{coord}</span>
            ))}
          </div>
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            scaleX={scale}
            scaleY={scale}
            x={position.x}
            y={position.y}
            draggable
            onWheel={(event) => {
              event.evt.preventDefault()
              const stage = event.target.getStage()
              const pointer = stage?.getPointerPosition()
              if (!stage || !pointer) return
              const next = zoomAtPointer({
                pointer,
                stagePos: { x: stage.x(), y: stage.y() },
                oldScale: scale,
                deltaY: event.evt.deltaY,
              })
              setScale(next.scale)
              setPosition(next.pos)
            }}
            onDragEnd={(event) => {
              if (event.target === event.target.getStage()) {
                setPosition({ x: event.target.x(), y: event.target.y() })
              }
            }}
            onMouseDown={(event) => {
              if (event.target === event.target.getStage()) onSelectBlock(null)
            }}
            className="chip-stage-canvas"
          >
            <Layer>
              <ChipArtwork
                project={displayProject}
                layerVisibility={layerVisibility}
                renderBlock={renderBlock}
                renderStudioSpray={renderStudioSpray}
                renderStudioSticker={renderStudioSticker}
              />
              <Transformer
                ref={transformerRef}
                rotateEnabled={transformerKind !== 'spray'}
                resizeEnabled={transformerKind !== 'sticker'}
                enabledAnchors={transformerKind === 'sticker' ? [] : undefined}
                boundBoxFunc={(oldBox, newBox) =>
                  newBox.width < MIN_BLOCK || newBox.height < MIN_BLOCK ? oldBox : newBox
                }
              />
            </Layer>
          </Stage>
          <div aria-label="Canvas zoom controls" className="chip-stage-zoom-controls" role="group">
            <button aria-label="Fit view" type="button" onClick={resetView}>
              []
            </button>
            <button aria-label="Zoom out" type="button" onClick={() => adjustZoom(-0.1)}>
              -
            </button>
            <span>{zoomLabel}</span>
            <button aria-label="Zoom in" type="button" onClick={() => adjustZoom(0.1)}>
              +
            </button>
            <button aria-label="Reset view" type="button" onClick={resetView}>
              R
            </button>
          </div>
        </div>
        <div aria-label="Canvas status readouts" className="chip-stage-status" role="region">
          <span>VIEW {Math.round(scale * 100)}%</span>
          <span>GRID 10µm</span>
          <span>SNAP ON</span>
          <span>DRC OFF</span>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type Konva from 'konva'
import { Layer, Stage, Transformer } from 'react-konva'
import type { Project } from '../../../domain/project'
import { snapToGrid } from './geometry'
import type { BlockTransform } from '../../../stores/editorStore'
import { zoomAtPointer } from './viewport'
import { resolveTheme } from '../../../themes/themeTokens'
import { editorStageFrameSize, editorStageSize } from './artworkLayout'
import { BlockArtwork, ChipArtwork, StudioSprayArtwork, StudioStickerArtwork } from './ChipArtwork'
import type { SelectedStudioItem, SprayTransform, StickerTransform } from '../../../stores/editorStore'
import { reflowBlocksGlobally } from '../../../studio/globalReflow'

const GRID = 16
const MIN_BLOCK = 48

type Props = {
  project: Project
  selectedBlockId: string | null
  selectedStudioItem: SelectedStudioItem | null
  onSelectBlock: (id: string | null) => void
  onSelectStudioItem: (item: SelectedStudioItem | null) => void
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
  onTransformBlock,
  onTransformSticker,
  onTransformSpray,
}: Props) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [previewBlocks, setPreviewBlocks] = useState<Project['blocks'] | null>(null)
  const blockRefs = useRef(new Map<string, Konva.Group>())
  const studioRefs = useRef(new Map<string, Konva.Group>())
  const transformerRef = useRef<Konva.Transformer>(null)
  const tokens = resolveTheme(project.theme)

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
  const stageSize = editorStageSize(project.die)
  const frameSize = editorStageFrameSize(project.die)

  return (
    <div
      className="chip-stage-frame"
      style={{ backgroundColor: tokens.background[tokens.background.length - 1].color }}
    >
      <div className="chip-stage-frame__chrome" style={{ width: frameSize.width, minHeight: frameSize.height }}>
        <div className="chip-stage-frame__readout" aria-hidden="true">
          <span>scale {scale.toFixed(2)}x</span>
          <span>x {Math.round(position.x)}</span>
          <span>y {Math.round(position.y)}</span>
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
              renderBlock={(block, tokens) => (
                <BlockArtwork
                  block={block}
                  tokens={tokens}
                  selected={block.id === selectedBlockId}
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
                      const blocks = project.blocks.map((candidate) =>
                        candidate.id === block.id
                          ? { ...candidate, x: event.target.x(), y: event.target.y() }
                          : candidate,
                      )
                      setPreviewBlocks(
                        reflowBlocksGlobally({
                          blocks,
                          die: project.die,
                          targetBlockId: block.id,
                          target: { x: event.target.x(), y: event.target.y() },
                        }),
                      )
                    },
                    onDragEnd: (event) => {
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
              )}
              renderStudioSpray={(spray) => (
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
              )}
              renderStudioSticker={(sticker) => (
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
              )}
            />
            <Transformer
              ref={transformerRef}
              rotateEnabled
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < MIN_BLOCK || newBox.height < MIN_BLOCK ? oldBox : newBox
              }
            />
          </Layer>
        </Stage>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Layer, Stage } from 'react-konva'
import type { Project } from '../../domain/project'
import { ChipArtwork } from './canvas/ChipArtwork'

// Display-only preview of the chip die for the mobile editor route. It reuses the
// shared ChipArtwork render (same path as DieExportStage) but scales to the
// container width for on-screen display. It is NOT an export stage: the export
// raster contract lives in ExportPanel's own offscreen stages.
export function MobileChipPreview({ project }: { project: Project }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = wrapRef.current
    if (el === null) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const dieWidth = project.die.width
  const dieHeight = project.die.height
  const scale = width > 0 ? width / dieWidth : 0
  const height = Math.round(dieHeight * scale)

  return (
    <div ref={wrapRef} className="mobile-editor-preview__stage">
      {width > 0 ? (
        <Stage width={width} height={height} scaleX={scale} scaleY={scale}>
          <Layer>
            <ChipArtwork project={project} renderMode="die-only" />
          </Layer>
        </Stage>
      ) : null}
    </div>
  )
}

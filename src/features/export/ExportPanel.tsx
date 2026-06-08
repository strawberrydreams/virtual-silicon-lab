import { useEffect, useRef, useState } from 'react'
import type Konva from 'konva'
import type { Project } from '../../domain/project'
import { resolveHeroSetForProject } from '../../visual/heroSetCatalog'
import type { ChipLayerVisibility } from '../editor/layerVisibility'
import { DieExportStage } from './DieExportStage'
import { PosterExportStage } from './PosterExportStage'
import { DIE_EXPORT_PIXEL_RATIO, POSTER_EXPORT } from './exportLayout'
import { dataUrlToFile, downloadDataUrl, downloadFile, shareFileOrDownload } from './exportStage'
import { POSTER_FORMATS, type PosterFormat } from './posterCompositions'

const buttonClass =
  'w-full rounded border border-cyan-700 px-3 py-2 text-xs uppercase tracking-wider text-cyan-100 transition-colors hover:border-cyan-400 hover:bg-cyan-950'

export function ExportPanel({
  project,
  layerVisibility,
}: {
  project: Project
  layerVisibility?: ChipLayerVisibility
}) {
  const dieStageRef = useRef<Konva.Stage>(null)
  const posterStageRef = useRef<Konva.Stage>(null)
  const defaultPosterFormat = resolveHeroSetForProject(project)?.posterFormat ?? 'press-hero'
  const [posterFormat, setPosterFormat] = useState<PosterFormat>(defaultPosterFormat)
  const baseName = project.name || 'chip'

  useEffect(() => {
    setPosterFormat(defaultPosterFormat)
  }, [defaultPosterFormat, project.id])

  function downloadDie() {
    const url = dieStageRef.current?.toDataURL({ pixelRatio: DIE_EXPORT_PIXEL_RATIO })
    if (url) downloadDataUrl(url, `${baseName}-die.png`)
  }

  function downloadPoster() {
    const url = posterStageRef.current?.toDataURL({ pixelRatio: POSTER_EXPORT.pixelRatio })
    if (url) downloadDataUrl(url, `${baseName}-${posterFormat}.png`)
  }

  async function sharePoster() {
    const url = posterStageRef.current?.toDataURL({ pixelRatio: POSTER_EXPORT.pixelRatio })
    if (!url) return
    try {
      const file = dataUrlToFile(url, `${baseName}-${posterFormat}.png`)
      await shareFileOrDownload(file, {
        canShare: navigator.canShare?.bind(navigator),
        share: navigator.share?.bind(navigator),
        download: downloadFile,
      })
    } catch (error) {
      // Never leave a failed share as an unhandled rejection; fall back to a plain download.
      console.error('[export] poster share failed; downloading instead', error)
      downloadDataUrl(url, `${baseName}-poster.png`)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs uppercase tracking-[0.25em] text-cyan-300">Export</h2>
      <div className="grid grid-cols-1 gap-1" aria-label="Poster format">
        {POSTER_FORMATS.map((format) => (
          <button
            key={format.id}
            type="button"
            className={`${buttonClass} ${posterFormat === format.id ? 'border-cyan-300 bg-cyan-950 text-white' : ''}`}
            aria-pressed={posterFormat === format.id}
            onClick={() => setPosterFormat(format.id)}
          >
            {format.label}
          </button>
        ))}
      </div>
      <button type="button" className={buttonClass} onClick={downloadDie}>
        Download Die PNG
      </button>
      <button type="button" className={buttonClass} onClick={downloadPoster}>
        Download Poster PNG
      </button>
      <button type="button" className={buttonClass} onClick={sharePoster}>
        Share Poster
      </button>

      <div className="pointer-events-none absolute left-[-10000px] top-[-10000px]" aria-hidden="true">
        <DieExportStage ref={dieStageRef} project={project} layerVisibility={layerVisibility} />
        <PosterExportStage
          ref={posterStageRef}
          project={project}
          format={posterFormat}
          layerVisibility={layerVisibility}
        />
      </div>
    </div>
  )
}

import { useState } from 'react'
import { isMp4ExportSupported } from '../../three/chip3dEncoder'
import type { Chip3DModel } from '../../visual/chip3d/chip3dModel'
import { downloadFile } from './exportStage'

export function VideoExportPanel({ model, name }: { model: Chip3DModel; name: string }) {
  const [progress, setProgress] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  if (!isMp4ExportSupported()) {
    return <span className="chip-3d-export__note">MP4 export isn’t available in this browser.</span>
  }

  const recording = progress !== null

  async function exportMp4() {
    setFailed(false)
    setProgress(0)
    try {
      const { recordTurntableMp4 } = await import('../../three/chip3dRecorder')
      const blob = await recordTurntableMp4(model, { onProgress: setProgress })
      const baseName = name || 'chip'
      downloadFile(new File([blob], `${baseName}-turntable.mp4`, { type: 'video/mp4' }))
    } catch {
      setFailed(true)
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="chip-3d-export">
      <button type="button" onClick={exportMp4} disabled={recording}>
        {recording ? `Encoding ${Math.round((progress ?? 0) * 100)}%` : 'Export turntable MP4'}
      </button>
      {failed ? <span className="chip-3d-export__note">MP4 export failed. Try again.</span> : null}
    </div>
  )
}

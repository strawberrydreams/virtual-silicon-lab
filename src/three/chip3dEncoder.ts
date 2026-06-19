export function isMp4ExportSupported(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window
}

export type Mp4Encoder = {
  addFrame(frame: VideoFrame, keyFrame: boolean): void
  finish(): Promise<Blob>
}

export async function createMp4Encoder(opts: {
  width: number
  height: number
  fps: number
}): Promise<Mp4Encoder> {
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer')
  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: opts.width, height: opts.height },
    fastStart: 'in-memory',
  })

  let encoderError: unknown = null
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encoderError = error
    },
  })
  encoder.configure({
    codec: 'avc1.42001f',
    width: opts.width,
    height: opts.height,
    bitrate: 6_000_000,
    framerate: opts.fps,
  })

  return {
    addFrame(frame, keyFrame) {
      encoder.encode(frame, { keyFrame })
    },
    async finish() {
      await encoder.flush()
      if (encoderError) throw encoderError
      encoder.close()
      muxer.finalize()
      return new Blob([target.buffer], { type: 'video/mp4' })
    },
  }
}

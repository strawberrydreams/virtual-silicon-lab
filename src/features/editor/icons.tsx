import type { ReactNode } from 'react'
import type { BlockType } from '../../domain/project'
import { blockTexture, type TextureFamily } from './canvas/blockTexture'

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const FAMILY_GLYPHS: Record<TextureFamily, ReactNode> = {
  compute: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="1" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  parallel: <path d="M7 5v14M12 5v14M17 5v14" />,
  signal: <path d="M3 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0" />,
  memory: (
    <>
      <rect x="5" y="6" width="14" height="3" rx="0.5" />
      <rect x="5" y="11" width="14" height="3" rx="0.5" />
      <rect x="5" y="16" width="14" height="3" rx="0.5" />
    </>
  ),
  analog: <path d="M4 18V14h4v-4h4V6h4V4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  io: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="1" />
      <path d="M9 12h6M13 9l3 3-3 3" />
    </>
  ),
  expressive: <path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />,
  synthesis: <path d="M6 19v-6M11 19V7M16 19v-9" />,
  awareness: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  distortion: (
    <>
      <path d="M12 3 7 12l5 9 5-9z" />
      <path d="M4 12h16" />
    </>
  ),
  temporal: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
    </>
  ),
}

export function TileGlyph({ type }: { type: BlockType }) {
  return <Glyph>{FAMILY_GLYPHS[blockTexture(type).family]}</Glyph>
}

export const SelectIcon = () => (
  <Glyph>
    <path d="M5 3l6 16 2.2-6.6L20 11z" fill="currentColor" stroke="none" />
  </Glyph>
)
export const MoveIcon = () => (
  <Glyph>
    <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
  </Glyph>
)
export const RotateIcon = () => (
  <Glyph>
    <path d="M20 11a8 8 0 1 0-2 6" />
    <path d="M20 4v6h-6" />
  </Glyph>
)
export const ResizeIcon = () => (
  <Glyph>
    <path d="M9 4H4v5M15 20h5v-5M4 4l7 7M20 20l-7-7" />
  </Glyph>
)
export const UndoIcon = () => (
  <Glyph>
    <path d="M9 7 4 12l5 5" />
    <path d="M4 12h11a5 5 0 0 1 0 10h-2" />
  </Glyph>
)
export const RedoIcon = () => (
  <Glyph>
    <path d="M15 7l5 5-5 5" />
    <path d="M20 12H9a5 5 0 0 0 0 10h2" />
  </Glyph>
)
export const PlayIcon = () => (
  <Glyph>
    <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />
  </Glyph>
)

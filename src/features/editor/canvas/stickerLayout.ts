import type { StudioStickerKind } from '../../../domain/project'

// Pure geometry for studio stickers so each kind renders as a distinct, fixed-size
// icon (or a text-driven pill) shared by the editor and PNG export artwork.
export type StickerForm = 'circle' | 'star' | 'triangle' | 'pill'

export type StickerLayout = {
  form: StickerForm
  width: number
  height: number
  fontSize: number
  letterSpacing: number
}

const FORMS: Record<StudioStickerKind, StickerForm> = {
  badge: 'circle',
  mascot: 'star',
  warning: 'triangle',
  label: 'pill',
}

export function resolveStickerLayout(kind: StudioStickerKind, text: string): StickerLayout {
  const form = FORMS[kind] ?? 'circle'
  switch (form) {
    case 'pill':
      return { form, width: Math.max(76, text.length * 9 + 18), height: 32, fontSize: 12, letterSpacing: 1 }
    case 'triangle':
      return { form, width: 56, height: 56, fontSize: 18, letterSpacing: 0 }
    case 'star':
      return { form, width: 58, height: 58, fontSize: 13, letterSpacing: 0 }
    default:
      return { form, width: 52, height: 52, fontSize: 16, letterSpacing: 0 }
  }
}

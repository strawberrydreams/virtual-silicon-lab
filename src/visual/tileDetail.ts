import type { StudioContactStyle, StudioTileSettings } from '../domain/project'

// Pure projection of the semi-automatic tile settings onto concrete render knobs
// shared by the chip layer builder and per-block artwork, so density / route
// intensity / contact style visibly change the rendered (and exported) tiles.
export type TileDetail = {
  microStep: number
  microOpacityScale: number
  traceWidthScale: number
  traceOpacityScale: number
  blockStride: number
  contactCell: number
  contactGap: number
}

const CONTACT_STYLES: Record<StudioContactStyle, { contactCell: number; contactGap: number }> = {
  minimal: { contactCell: 12, contactGap: 8 },
  balanced: { contactCell: 10, contactGap: 4 },
  dense: { contactCell: 8, contactGap: 3 },
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function resolveTileDetail(settings: StudioTileSettings): TileDetail {
  const density = clamp01(settings.detailDensity)
  const route = clamp01(settings.routeIntensity)
  const contacts = CONTACT_STYLES[settings.contactStyle] ?? CONTACT_STYLES.balanced

  return {
    microStep: Math.round(72 - density * 40),
    microOpacityScale: 0.6 + density * 0.8,
    traceWidthScale: 0.5 + route,
    traceOpacityScale: 0.5 + route * 0.8,
    blockStride: Math.round(26 - density * 14),
    contactCell: contacts.contactCell,
    contactGap: contacts.contactGap,
  }
}

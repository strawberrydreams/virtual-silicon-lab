import type { StudioState } from './project'

export function createDefaultStudioState(): StudioState {
  return {
    layoutMode: 'global-reflow',
    detailMode: 'semi-auto',
    tileSettings: {
      detailDensity: 0.62,
      routeIntensity: 0.58,
      contactStyle: 'balanced',
    },
    sprays: [],
    stickers: [],
  }
}

export function cloneStudioState(studio: StudioState): StudioState {
  return {
    layoutMode: studio.layoutMode,
    detailMode: studio.detailMode,
    tileSettings: { ...studio.tileSettings },
    sprays: studio.sprays.map((spray) => ({ ...spray, blend: spray.blend ?? 'screen' })),
    stickers: studio.stickers.map((sticker) => ({ ...sticker })),
  }
}

import type { StudioColorPaint, StudioColorSettings, StudioState } from './project'

export const DEFAULT_COLOR_SETTINGS: StudioColorSettings = {
  background: { mode: 'solid', color: '#03070b' },
  package: { mode: 'solid', color: '#080d12' },
  die: { mode: 'gradient', from: '#13203a', to: '#1b1640' },
  block: { mode: 'solid', color: '#16253d' },
  tile: { mode: 'solid', color: '#58d9f5' },
  trace: { mode: 'solid', color: '#58d9f5' },
  label: { mode: 'solid', color: '#d8f7ff' },
  mark: { mode: 'solid', color: '#ffd84d' },
}

function clonePaint(paint: StudioColorPaint): StudioColorPaint {
  return { ...paint }
}

export function cloneColorSettings(settings: Partial<StudioColorSettings> | undefined): StudioColorSettings {
  return {
    background: clonePaint(settings?.background ?? DEFAULT_COLOR_SETTINGS.background),
    package: clonePaint(settings?.package ?? DEFAULT_COLOR_SETTINGS.package),
    die: clonePaint(settings?.die ?? DEFAULT_COLOR_SETTINGS.die),
    block: clonePaint(settings?.block ?? DEFAULT_COLOR_SETTINGS.block),
    tile: clonePaint(settings?.tile ?? DEFAULT_COLOR_SETTINGS.tile),
    trace: clonePaint(settings?.trace ?? DEFAULT_COLOR_SETTINGS.trace),
    label: clonePaint(settings?.label ?? DEFAULT_COLOR_SETTINGS.label),
    mark: clonePaint(settings?.mark ?? DEFAULT_COLOR_SETTINGS.mark),
  }
}

export function createDefaultStudioState(): StudioState {
  return {
    layoutMode: 'global-reflow',
    detailMode: 'semi-auto',
    tileSettings: {
      detailDensity: 0.62,
      routeIntensity: 0.58,
      contactStyle: 'balanced',
    },
    colorSettings: cloneColorSettings(DEFAULT_COLOR_SETTINGS),
    sprays: [],
    stickers: [],
  }
}

export function cloneStudioState(studio: StudioState): StudioState {
  return {
    layoutMode: studio.layoutMode,
    detailMode: studio.detailMode,
    tileSettings: { ...studio.tileSettings },
    colorSettings: cloneColorSettings(studio.colorSettings),
    sprays: studio.sprays.map((spray) => ({ ...spray, blend: spray.blend ?? 'screen' })),
    stickers: studio.stickers.map((sticker) => ({ ...sticker })),
  }
}

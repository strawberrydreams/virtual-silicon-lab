export const CHIP_LAYER_IDS = ['M1', 'M2', 'M3', 'M4', 'M5', 'Label'] as const

export type ChipLayerId = (typeof CHIP_LAYER_IDS)[number]

export type ChipLayerVisibility = Record<ChipLayerId, boolean>

export const DEFAULT_LAYER_VISIBILITY: ChipLayerVisibility = {
  M1: true,
  M2: true,
  M3: true,
  M4: true,
  M5: true,
  Label: true,
}

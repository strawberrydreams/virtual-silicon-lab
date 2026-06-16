import type { Block, Decoration } from './project'

/**
 * Shared shapes for curated chip definitions (presets + hero sets). Blueprints
 * omit the per-instance `id`/`zIndex`; factories assign those when materializing
 * a blueprint into an editable `Project`.
 */
export type BlockBlueprint = Omit<Block, 'id' | 'zIndex'>

export type DecorationBlueprint =
  | Omit<Extract<Decoration, { kind: 'neonLine' }>, 'id' | 'zIndex'>
  | Omit<Extract<Decoration, { kind: 'warningMark' }>, 'id' | 'zIndex'>
  | Omit<Extract<Decoration, { kind: 'label' }>, 'id' | 'zIndex'>
  | Omit<Extract<Decoration, { kind: 'sciFiObject' }>, 'id' | 'zIndex'>

export function materializeDecoration(
  blueprint: DecorationBlueprint,
  id: string,
  zIndex: number,
): Decoration {
  if (blueprint.kind === 'neonLine')
    return { ...blueprint, points: [...blueprint.points], id, zIndex }
  return { ...blueprint, id, zIndex }
}

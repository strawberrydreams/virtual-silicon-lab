import type { Die, FreeformVertex } from '../project'
import { outlineToPolygon, resolveDieOutline } from './dieOutline'
import { resolveFreeformVertices } from './freeformVertices'

export function seedFreeformFromDie(die: Die): FreeformVertex[] {
  const polygon = outlineToPolygon(resolveDieOutline(die))
  const vertices = polygon.map((point) => ({
    x: die.width === 0 ? 0 : point.x / die.width,
    y: die.height === 0 ? 0 : point.y / die.height,
  }))
  return resolveFreeformVertices({ vertices })
}

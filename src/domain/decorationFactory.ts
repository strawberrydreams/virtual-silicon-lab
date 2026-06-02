import type { Decoration, Project } from './project'

export type DecorationKind = Decoration['kind']

export function nextDecorationZIndex(decorations: Decoration[]): number {
  return decorations.reduce((max, decoration) => Math.max(max, decoration.zIndex + 1), 0)
}

export function buildDecoration(
  project: Project,
  kind: DecorationKind,
  id: string = crypto.randomUUID(),
): Decoration {
  const zIndex = nextDecorationZIndex(project.decorations)
  const cx = project.die.width / 2
  const cy = project.die.height / 2
  switch (kind) {
    case 'neonLine':
      return { id, kind, points: [cx - 120, cy, cx + 120, cy], color: '', zIndex }
    case 'warningMark':
      return { id, kind, x: cx, y: cy, zIndex }
    case 'label':
      return { id, kind, x: cx, y: cy, text: 'LABEL', zIndex }
    case 'sciFiObject':
      return { id, kind, assetKey: 'bondRing', x: cx, y: cy, zIndex }
  }
}

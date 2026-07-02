import type { DieShape } from '../../domain/project'

const SHAPE_CLASSES = {
  rect: 'aspect-[3/2]',
  square: 'aspect-square',
  circle: 'aspect-square rounded-full',
  hexagon: 'aspect-square [clip-path:polygon(50%_0%,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]',
  octagon:
    'aspect-square [clip-path:polygon(18%_0%,82%_0%,100%_18%,100%_82%,82%_100%,18%_100%,0%_82%,0%_18%)]',
  'rounded-rect': 'aspect-[3/2] [clip-path:inset(0_round_12%)]',
  'chamfered-rect':
    'aspect-[3/2] [clip-path:polygon(10%_0%,90%_0%,100%_10%,100%_90%,90%_100%,10%_100%,0%_90%,0%_10%)]',
  keyed: 'aspect-[3/2] [clip-path:polygon(14%_0%,100%_0%,100%_100%,0%_100%,0%_14%)]',
  'l-shape': 'aspect-[3/2] [clip-path:polygon(0%_0%,100%_0%,100%_50%,50%_50%,50%_100%,0%_100%)]',
  plus: 'aspect-square [clip-path:polygon(32%_0%,68%_0%,68%_32%,100%_32%,100%_68%,68%_68%,68%_100%,32%_100%,32%_68%,0%_68%,0%_32%,32%_32%)]',
  freeform:
    'aspect-[3/2] [clip-path:polygon(0%_22%,28%_0%,72%_8%,100%_38%,84%_100%,34%_86%,10%_64%)]',
} satisfies Record<DieShape, string>

export function dieShapePreviewClass(shape: DieShape): string {
  return SHAPE_CLASSES[shape]
}

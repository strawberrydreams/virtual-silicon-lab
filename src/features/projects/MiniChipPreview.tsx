import type { BlockType, DieShape } from '../../domain/project'

const SHAPE_CLASSES: Record<DieShape, string> = {
  rect: 'aspect-[3/2]',
  square: 'aspect-square',
  circle: 'aspect-square rounded-full',
  hexagon: 'aspect-square [clip-path:polygon(50%_0%,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]',
}

export function MiniChipPreview({
  shape,
  blocks,
  label,
}: {
  shape: DieShape
  blocks: readonly BlockType[] | readonly string[]
  label?: string
}) {
  return (
    <div className="v2-preset-card__chip-frame" aria-label={label}>
      <div className={`v2-mini-chip ${SHAPE_CLASSES[shape]}`}>
        {blocks.slice(0, 4).map((block, index) => (
          <span className="v2-mini-chip__tile" data-tile={block} key={`${block}-${index}`}>
            {block}
          </span>
        ))}
      </div>
    </div>
  )
}

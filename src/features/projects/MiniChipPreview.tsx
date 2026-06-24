import type { BlockType, DieShape } from '../../domain/project'
import { dieShapePreviewClass } from './dieShapePreview'

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
      <div className={`v2-mini-chip ${dieShapePreviewClass(shape)}`}>
        {blocks.slice(0, 4).map((block, index) => (
          <span className="v2-mini-chip__tile" data-tile={block} key={`${block}-${index}`}>
            {block}
          </span>
        ))}
      </div>
    </div>
  )
}

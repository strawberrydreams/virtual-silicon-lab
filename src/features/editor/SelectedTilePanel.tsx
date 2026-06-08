import type { Block, Project } from '../../domain/project'

type Props = {
  block: Block | null
  project: Project
}

function blockUtilization(block: Block, project: Project) {
  const dieArea = Math.max(1, project.die.width * project.die.height)
  return Math.min(100, Math.max(1, Math.round((block.w * block.h * 100) / dieArea)))
}

function blockPowerEstimate(block: Block) {
  const base = block.category === 'real' ? 1.8 : 2.4
  const sizeFactor = Math.max(0.8, Math.min(3.8, (block.w * block.h) / 18000))
  return `${(base * sizeFactor).toFixed(1)} W`
}

export function SelectedTilePanel({ block, project }: Props) {
  return (
    <section aria-label="Selected tile summary" className="editor-inspector-card selected-tile-panel">
      <div className="selected-tile-panel__header">
        <div>
          <p className="editor-kicker">Selected tile</p>
          <h2>Selected Tile</h2>
        </div>
        <span className="selected-tile-panel__status">{block === null ? 'Idle' : 'Active'}</span>
      </div>
      {block === null ? (
        <div className="selected-tile-panel__empty">
          <strong>No tile selected</strong>
          <p>Select a tile on the die or add one from Library.</p>
        </div>
      ) : (
        <div className="selected-tile-panel__body">
          <div className="selected-tile-panel__info">
            <h3 className="selected-tile-panel__name">{block.label ?? block.type}</h3>
            <p className="selected-tile-panel__category">
              {block.category === 'real' ? 'Hardware tile' : 'Speculative tile'}
            </p>
            <div className="selected-tile-panel__metrics">
              <div className="selected-tile-panel__metric">
                <span>Type</span>
                <strong>{block.type}</strong>
              </div>
              <div className="selected-tile-panel__metric">
                <span>Size</span>
                <strong>{Math.round(block.w)} x {Math.round(block.h)}</strong>
              </div>
              <div className="selected-tile-panel__metric">
                <span>Utilization</span>
                <strong>{blockUtilization(block, project)}%</strong>
              </div>
              <div className="selected-tile-panel__metric">
                <span>Power</span>
                <strong>{blockPowerEstimate(block)}</strong>
              </div>
            </div>
          </div>
          <div className="selected-tile-panel__mini" aria-hidden="true">
            <span />
          </div>
        </div>
      )}
    </section>
  )
}

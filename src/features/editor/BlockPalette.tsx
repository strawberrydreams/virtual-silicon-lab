import { useMemo, useState } from 'react'
import type { DecorationKind } from '../../domain/decorationFactory'
import type { BlockType, StudioStickerKind } from '../../domain/project'
import { TileGlyph } from './icons'

const BLOCK_GROUPS: { label: string; blocks: BlockType[] }[] = [
  {
    label: 'Hardware Tiles',
    blocks: ['CPU', 'GPU', 'DSP', 'SRAM', 'Cache', 'DAC', 'ADC', 'PLL', 'IO', 'USB'],
  },
  {
    label: 'Speculative Tiles',
    blocks: [
      'EmotionEngine',
      'DreamSynth',
      'QuantumMemory',
      'ConsciousnessProcessor',
      'RealityDistortionUnit',
      'TimeCore',
    ],
  },
]

const STICKER_KINDS: { kind: StudioStickerKind; label: string }[] = [
  { kind: 'badge', label: 'Round badge' },
  { kind: 'mascot', label: 'Mascot mark' },
  { kind: 'warning', label: 'Warning label' },
  { kind: 'label', label: 'Text label' },
]

const SPRAY_COLORS: { color: string; label: string }[] = [
  { color: '#ff70dc', label: 'Pink' },
  { color: '#70eeff', label: 'Cyan' },
  { color: '#ffd84d', label: 'Gold' },
  { color: '#9b7bff', label: 'Violet' },
]

const MODE_ITEMS = [
  { label: 'Library', marker: 'LB' },
  { label: 'Tiles', marker: 'TL' },
  { label: 'Decorate', marker: 'DC' },
  { label: 'Connect', marker: 'CN' },
  { label: 'Text', marker: 'TX' },
  { label: 'Layers', marker: 'LY' },
  { label: 'Settings', marker: 'ST' },
] as const

type LibraryFilter = 'all' | 'hardware' | 'speculative'

type Props = {
  addBlock: (type: BlockType) => void
  addDecoration: (kind: DecorationKind) => void
  addSticker: (kind: StudioStickerKind) => void
  addSpray: (color: string) => void
}

type EditorMode = (typeof MODE_ITEMS)[number]['label']

function ToolNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="editor-mode-note">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  )
}

export function BlockPalette({ addBlock, addDecoration, addSticker, addSpray }: Props) {
  const [activeMode, setActiveMode] = useState<EditorMode>('Library')
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const showTiles = activeMode === 'Library' || activeMode === 'Tiles'
  const showDecorate = activeMode === 'Library' || activeMode === 'Decorate'
  const visibleGroups = useMemo(
    () =>
      BLOCK_GROUPS.map((group) => {
        const category: LibraryFilter =
          group.label === 'Hardware Tiles' ? 'hardware' : 'speculative'
        return {
          ...group,
          blocks: group.blocks.filter((type) => {
            const matchesFilter = filter === 'all' || filter === category
            const matchesQuery =
              normalizedQuery.length === 0 || type.toLowerCase().includes(normalizedQuery)
            return matchesFilter && matchesQuery
          }),
        }
      }).filter((group) => group.blocks.length > 0),
    [filter, normalizedQuery],
  )

  return (
    <aside aria-label="Creation rail" className="editor-left-shell">
      <nav aria-label="Editor mode rail" className="editor-mode-rail">
        {MODE_ITEMS.map((item) => (
          <button
            aria-pressed={activeMode === item.label}
            className="editor-mode-rail__button"
            key={item.label}
            onClick={() => setActiveMode(item.label)}
            type="button"
          >
            <span aria-hidden="true">{item.marker}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <section aria-label="Library panel" className="editor-side-rail editor-creation-rail">
        <div className="editor-rail-heading">
          <p className="editor-kicker">{activeMode}</p>
          <h2>{activeMode === 'Library' ? 'Library' : `${activeMode} Tools`}</h2>
        </div>
        {showTiles ? (
          <>
            <label className="editor-search-field">
              <span className="sr-only">Search components</span>
              <input
                aria-label="Search components"
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Search components..."
                type="search"
                value={query}
              />
            </label>
            <div aria-label="Library filters" className="editor-library-filters" role="group">
              <button
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
                type="button"
              >
                All
              </button>
              <button
                aria-pressed={filter === 'hardware'}
                onClick={() => setFilter('hardware')}
                type="button"
              >
                Hardware
              </button>
              <button
                aria-pressed={filter === 'speculative'}
                onClick={() => setFilter('speculative')}
                type="button"
              >
                Speculative
              </button>
            </div>
          </>
        ) : null}
        {activeMode === 'Library' ? (
          <div className="editor-rail-heading editor-rail-heading--compact">
            <p className="editor-kicker">Studio kit</p>
            <h2>Tiles / Stickers / Spray</h2>
          </div>
        ) : null}
        <div className="editor-library-content">
          {showTiles ? (
            <>
              {visibleGroups.map((group) => (
                <section key={group.label}>
                  <h3 className="editor-section-label">{group.label}</h3>
                  <div
                    className={`editor-block-grid ${
                      group.label === 'Hardware Tiles'
                        ? 'editor-block-grid--hardware'
                        : 'editor-block-grid--speculative'
                    } mt-2`}
                  >
                    {group.blocks.map((type) => (
                      <button
                        className="editor-block-button editor-block-button--tile"
                        key={type}
                        onClick={() => addBlock(type)}
                      >
                        <span className="editor-block-button__icon" aria-hidden="true">
                          <TileGlyph type={type} />
                        </span>
                        <span className="editor-block-button__label">{type}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              <button
                aria-label="Add custom tile"
                className="editor-add-custom-tile"
                type="button"
                disabled
              >
                + Add custom tile
              </button>
            </>
          ) : null}
          {showDecorate ? (
            <section className="editor-studio-tools" aria-label="Studio decoration tools">
              <h3 className="editor-section-label">
                {activeMode === 'Decorate' ? 'Decoration Tools' : 'Decorate'}
              </h3>
              <div className="mt-2 grid gap-2">
                {STICKER_KINDS.map(({ kind, label }) => (
                  <button
                    className="editor-block-button"
                    key={kind}
                    type="button"
                    onClick={() => addSticker(kind)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="editor-spray-swatches mt-2" role="group" aria-label="Spray colors">
                {SPRAY_COLORS.map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Spray ${label}`}
                    title={`Spray ${label}`}
                    style={{ background: color }}
                    onClick={() => addSpray(color)}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {activeMode === 'Connect' ? (
            <section aria-label="Connection tools" className="editor-mode-panel">
              <h3 className="editor-section-label">Connection Tools</h3>
              <ToolNote
                title="Bus guide"
                body="Add a visible routing guide, then tune bus color and layer visibility in the inspector."
              />
              <button
                className="editor-block-button"
                type="button"
                onClick={() => addDecoration('neonLine')}
              >
                Add route guide
              </button>
            </section>
          ) : null}
          {activeMode === 'Text' ? (
            <section aria-label="Text tools" className="editor-mode-panel">
              <h3 className="editor-section-label">Text Actions</h3>
              <ToolNote
                title="Die annotation"
                body="Place an editable label on the die and adjust its text from the inspector."
              />
              <button
                className="editor-block-button"
                type="button"
                onClick={() => addDecoration('label')}
              >
                Add text label
              </button>
            </section>
          ) : null}
          {activeMode === 'Layers' ? (
            <section aria-label="Layer controls" className="editor-mode-panel">
              <h3 className="editor-section-label">Layer Controls</h3>
              <ToolNote
                title="Layer visibility"
                body="Use the right inspector to toggle M1-M5 and label visibility."
              />
            </section>
          ) : null}
          {activeMode === 'Settings' ? (
            <section aria-label="Settings controls" className="editor-mode-panel">
              <h3 className="editor-section-label">Settings Tools</h3>
              <ToolNote
                title="Appearance settings"
                body="Use the right inspector to adjust density, routing intensity, colors, and tile imagery."
              />
            </section>
          ) : null}
        </div>
      </section>
    </aside>
  )
}

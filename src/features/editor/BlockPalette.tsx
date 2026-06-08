import { useMemo, useState } from 'react'
import type { BlockType, StudioStickerKind } from '../../domain/project'

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
  addSticker: (kind: StudioStickerKind) => void
  addSpray: (color: string) => void
}

export function BlockPalette({ addBlock, addSticker, addSpray }: Props) {
  const [activeMode, setActiveMode] = useState<(typeof MODE_ITEMS)[number]['label']>('Tiles')
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleGroups = useMemo(
    () =>
      BLOCK_GROUPS.map((group) => {
        const category: LibraryFilter = group.label === 'Hardware Tiles' ? 'hardware' : 'speculative'
        return {
          ...group,
          blocks: group.blocks.filter((type) => {
            const matchesFilter = filter === 'all' || filter === category
            const matchesQuery = normalizedQuery.length === 0 || type.toLowerCase().includes(normalizedQuery)
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
          <p className="editor-kicker">Library</p>
          <h2>Library</h2>
        </div>
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
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')} type="button">
            All
          </button>
          <button aria-pressed={filter === 'hardware'} onClick={() => setFilter('hardware')} type="button">
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
        <div className="editor-rail-heading editor-rail-heading--compact">
          <p className="editor-kicker">Studio kit</p>
          <h2>Tiles / Stickers / Spray</h2>
        </div>
        <div className="editor-library-content">
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
                    className="editor-block-button"
                    key={type}
                    onClick={() => addBlock(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </section>
          ))}
          <button aria-label="Add custom tile" className="editor-add-custom-tile" type="button" disabled>
            + Add custom tile
          </button>
          <section className="editor-studio-tools" aria-label="Studio decoration tools">
            <h3 className="editor-section-label">Decorate</h3>
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
        </div>
      </section>
    </aside>
  )
}

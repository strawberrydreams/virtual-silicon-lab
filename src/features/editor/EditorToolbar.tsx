import type { DieShape, StyleTheme } from '../../domain/project'
import type { DecorationKind } from '../../domain/decorationFactory'

type Props = {
  dieShape: DieShape
  theme: StyleTheme
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  onSetDieShape: (shape: DieShape) => void
  onSetTheme: (theme: StyleTheme) => void
  onAddDecoration: (kind: DecorationKind) => void
  onUndo: () => void
  onRedo: () => void
  onDuplicate: () => void
  onDelete: () => void
  onBringForward: () => void
  onSendBackward: () => void
}

const SHAPES: { shape: DieShape; label: string }[] = [
  { shape: 'rect', label: 'Rect' },
  { shape: 'square', label: 'Square' },
  { shape: 'circle', label: 'Circle' },
  { shape: 'hexagon', label: 'Hexagon' },
]

const THEME_OPTIONS: { theme: StyleTheme; label: string }[] = [
  { theme: 'neon', label: 'Neon' },
  { theme: 'retro', label: 'Retro' },
  { theme: 'military', label: 'Military' },
  { theme: 'keynote', label: 'Keynote' },
  { theme: 'mono', label: 'Mono' },
]

const DECORATIONS: { kind: DecorationKind; label: string }[] = [
  { kind: 'neonLine', label: 'Neon Line' },
  { kind: 'warningMark', label: 'Warning' },
  { kind: 'label', label: 'Label' },
]

const buttonClass = 'border border-cyan-900 px-3 py-1 text-xs uppercase tracking-wider disabled:opacity-30'

export function EditorToolbar({
  dieShape,
  theme,
  canUndo,
  canRedo,
  hasSelection,
  onSetDieShape,
  onSetTheme,
  onAddDecoration,
  onUndo,
  onRedo,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-cyan-900 bg-[#071015] p-3">
      <div className="flex gap-1">
        {SHAPES.map(({ shape, label }) => (
          <button
            key={shape}
            className={`${buttonClass} ${shape === dieShape ? 'bg-cyan-400/20 text-cyan-200' : ''}`}
            onClick={() => onSetDieShape(shape)}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="mx-2 h-4 w-px bg-cyan-900" />
      <div className="flex gap-1">
        {THEME_OPTIONS.map(({ theme: option, label }) => (
          <button
            key={option}
            className={`${buttonClass} ${option === theme ? 'bg-cyan-400/20 text-cyan-200' : ''}`}
            onClick={() => onSetTheme(option)}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="mx-2 h-4 w-px bg-cyan-900" />
      <div className="flex gap-1">
        {DECORATIONS.map(({ kind, label }) => (
          <button key={kind} className={buttonClass} onClick={() => onAddDecoration(kind)}>
            {label}
          </button>
        ))}
      </div>
      <span className="mx-2 h-4 w-px bg-cyan-900" />
      <button className={buttonClass} disabled={!canUndo} onClick={onUndo}>
        Undo
      </button>
      <button className={buttonClass} disabled={!canRedo} onClick={onRedo}>
        Redo
      </button>
      <span className="mx-2 h-4 w-px bg-cyan-900" />
      <button className={buttonClass} disabled={!hasSelection} onClick={onDuplicate}>
        Duplicate
      </button>
      <button className={buttonClass} disabled={!hasSelection} onClick={onDelete}>
        Delete
      </button>
      <button className={buttonClass} disabled={!hasSelection} onClick={onBringForward}>
        Forward
      </button>
      <button className={buttonClass} disabled={!hasSelection} onClick={onSendBackward}>
        Backward
      </button>
    </div>
  )
}

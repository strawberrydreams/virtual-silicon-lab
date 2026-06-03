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
  { kind: 'sciFiObject', label: 'Object' },
]

const buttonClass = 'editor-tool-button'
const activeButtonClass = 'editor-tool-button editor-tool-button--active'

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
    <div className="editor-toolbar" aria-label="Editor command toolbar">
      <div aria-label="Die shape controls" className="editor-tool-group" role="group">
        {SHAPES.map(({ shape, label }) => (
          <button
            key={shape}
            aria-pressed={shape === dieShape}
            className={shape === dieShape ? activeButtonClass : buttonClass}
            onClick={() => onSetDieShape(shape)}
          >
            {label}
          </button>
        ))}
      </div>
      <div aria-label="Chip theme controls" className="editor-tool-group" role="group">
        {THEME_OPTIONS.map(({ theme: option, label }) => (
          <button
            key={option}
            aria-pressed={option === theme}
            className={option === theme ? activeButtonClass : buttonClass}
            onClick={() => onSetTheme(option)}
          >
            {label}
          </button>
        ))}
      </div>
      <div aria-label="Decoration controls" className="editor-tool-group" role="group">
        {DECORATIONS.map(({ kind, label }) => (
          <button key={kind} className={buttonClass} onClick={() => onAddDecoration(kind)}>
            {label}
          </button>
        ))}
      </div>
      <div aria-label="History controls" className="editor-tool-group" role="group">
        <button className={buttonClass} disabled={!canUndo} onClick={onUndo}>
          Undo
        </button>
        <button className={buttonClass} disabled={!canRedo} onClick={onRedo}>
          Redo
        </button>
      </div>
      <div aria-label="Selection controls" className="editor-tool-group" role="group">
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
    </div>
  )
}

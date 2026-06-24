import { useEffect, useRef, useState } from 'react'
import type { DieShape, StyleTheme } from '../../domain/project'
import type { DecorationKind } from '../../domain/decorationFactory'
import { chipThemeLabel } from '../../visual/themeFinish'
import { MoveIcon, RedoIcon, ResizeIcon, RotateIcon, SelectIcon, UndoIcon } from './icons'

type Props = {
  dieShape: DieShape
  theme: StyleTheme
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  hasBlockSelection: boolean
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

const PARAMETRIC_SHAPES: { shape: DieShape; label: string }[] = [
  { shape: 'octagon', label: 'Octagon' },
  { shape: 'rounded-rect', label: 'Rounded Rect' },
  { shape: 'chamfered-rect', label: 'Chamfered Rect' },
  { shape: 'keyed', label: 'Keyed' },
  { shape: 'l-shape', label: 'L-Shape' },
  { shape: 'plus', label: 'Plus' },
]

const THEME_OPTIONS: { theme: StyleTheme; label: string }[] = (
  ['neon', 'retro', 'military', 'keynote', 'mono'] as StyleTheme[]
).map((theme) => ({ theme, label: chipThemeLabel(theme) }))

const DECORATIONS: { kind: DecorationKind; label: string }[] = [
  { kind: 'neonLine', label: 'Glow Route' },
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
  hasBlockSelection,
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
  const [parametricOpen, setParametricOpen] = useState(false)
  const parametricRootRef = useRef<HTMLDivElement>(null)
  const parametricTriggerRef = useRef<HTMLButtonElement>(null)
  const activeParametric = PARAMETRIC_SHAPES.find(({ shape }) => shape === dieShape)

  useEffect(() => {
    if (!parametricOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!parametricRootRef.current?.contains(event.target as Node)) setParametricOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setParametricOpen(false)
      parametricTriggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [parametricOpen])

  return (
    <div className="editor-toolbar" aria-label="Editor command toolbar">
      <section
        aria-label="Shape and theme controls"
        className="editor-toolbar__row editor-toolbar__row--tabs"
      >
        <div
          aria-label="Die shape controls"
          className="editor-tool-group editor-tool-group--tabs"
          role="group"
        >
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
          <div className="editor-parametric-picker" ref={parametricRootRef}>
            <button
              ref={parametricTriggerRef}
              aria-controls="parametric-die-shape-menu"
              aria-expanded={parametricOpen}
              aria-label="Parametric die shapes"
              className={activeParametric ? activeButtonClass : buttonClass}
              onClick={() => setParametricOpen((open) => !open)}
              type="button"
            >
              Parametric ▾
            </button>
            {activeParametric ? (
              <span
                aria-label="Current parametric shape"
                className="editor-parametric-picker__chip"
              >
                {activeParametric.label}
              </span>
            ) : null}
            {parametricOpen ? (
              <div
                aria-label="Parametric die shapes"
                className="editor-parametric-picker__menu"
                id="parametric-die-shape-menu"
                role="menu"
              >
                {PARAMETRIC_SHAPES.map(({ shape, label }) => (
                  <button
                    key={shape}
                    aria-current={shape === dieShape ? 'true' : undefined}
                    className={shape === dieShape ? activeButtonClass : buttonClass}
                    onClick={() => {
                      onSetDieShape(shape)
                      setParametricOpen(false)
                    }}
                    role="menuitem"
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div
          aria-label="Chip theme controls"
          className="editor-tool-group editor-tool-group--theme"
          role="group"
        >
          {THEME_OPTIONS.map(({ theme: option, label }) => (
            <button
              key={option}
              aria-pressed={option === theme}
              className={option === theme ? activeButtonClass : buttonClass}
              data-theme={option}
              onClick={() => onSetTheme(option)}
            >
              <span aria-hidden="true" className="editor-tool-button__swatch" />
              {label}
            </button>
          ))}
        </div>
      </section>
      <section
        aria-label="Editor operation strip"
        className="editor-toolbar__row editor-toolbar__row--operations"
      >
        <div aria-label="Canvas interaction tools" className="editor-tool-group" role="group">
          <button className={activeButtonClass} type="button">
            <span className="editor-tool-button__icon" aria-hidden="true">
              <SelectIcon />
            </span>
            Select
          </button>
          <button className={buttonClass} type="button" disabled>
            <span className="editor-tool-button__icon" aria-hidden="true">
              <MoveIcon />
            </span>
            Move
          </button>
          <button className={buttonClass} type="button" disabled>
            <span className="editor-tool-button__icon" aria-hidden="true">
              <RotateIcon />
            </span>
            Rotate
          </button>
          <button className={buttonClass} type="button" disabled>
            <span className="editor-tool-button__icon" aria-hidden="true">
              <ResizeIcon />
            </span>
            Resize
          </button>
        </div>
        <div aria-label="Selection controls" className="editor-tool-group" role="group">
          {/* Reference placeholder until a real clipboard command exists. */}
          <button className={buttonClass} disabled type="button">
            Copy
          </button>
          <button className={buttonClass} disabled={!hasSelection} onClick={onDuplicate}>
            Duplicate
          </button>
          <button className={buttonClass} disabled={!hasSelection} onClick={onDelete}>
            Delete
          </button>
          {/* Z-order only applies to blocks; stickers/sprays have no zIndex. */}
          <button className={buttonClass} disabled={!hasBlockSelection} onClick={onBringForward}>
            Forward
          </button>
          <button className={buttonClass} disabled={!hasBlockSelection} onClick={onSendBackward}>
            Backward
          </button>
        </div>
        <div aria-label="Arrangement controls" className="editor-tool-group" role="group">
          <button className={buttonClass} disabled type="button">
            Align
          </button>
          <button className={buttonClass} disabled type="button">
            Distribute
          </button>
          <button className={buttonClass} type="button" disabled>
            Snap
          </button>
        </div>
        <div aria-label="History controls" className="editor-tool-group" role="group">
          <button className={buttonClass} disabled={!canUndo} onClick={onUndo}>
            <span className="editor-tool-button__icon" aria-hidden="true">
              <UndoIcon />
            </span>
            Undo
          </button>
          <button className={buttonClass} disabled={!canRedo} onClick={onRedo}>
            <span className="editor-tool-button__icon" aria-hidden="true">
              <RedoIcon />
            </span>
            Redo
          </button>
        </div>
        <div aria-label="Decoration controls" className="editor-tool-group" role="group">
          {DECORATIONS.map(({ kind, label }) => (
            <button key={kind} className={buttonClass} onClick={() => onAddDecoration(kind)}>
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

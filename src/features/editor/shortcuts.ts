export type ShortcutCommand =
  | 'undo'
  | 'redo'
  | 'delete'
  | 'duplicate'
  | 'bringForward'
  | 'sendBackward'
  | 'deselect'

export type ShortcutEvent = {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
}

export function resolveShortcut(event: ShortcutEvent): ShortcutCommand | null {
  const mod = event.metaKey || event.ctrlKey
  const key = event.key.toLowerCase()

  if (mod && key === 'z') return event.shiftKey ? 'redo' : 'undo'
  if (mod && key === 'd') return 'duplicate'
  if (!mod && (event.key === 'Delete' || event.key === 'Backspace')) return 'delete'
  if (!mod && event.key === ']') return 'bringForward'
  if (!mod && event.key === '[') return 'sendBackward'
  if (!mod && event.key === 'Escape') return 'deselect'
  return null
}

import { useEffect } from 'react'
import { resolveShortcut, type ShortcutCommand } from './shortcuts'

export function useEditorShortcuts(handlers: Record<ShortcutCommand, () => void>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      const command = resolveShortcut(event)
      if (command === null) return
      event.preventDefault()
      handlers[command]()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}

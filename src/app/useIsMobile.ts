import { useEffect, useState } from 'react'
import { MOBILE_MEDIA_QUERY } from '../lib/breakpoints'

// Reactive viewport check for the few places that must branch structurally on
// mobile (the nav drawer's auto-close here; the editor read-only preview in M3).
// Pure CSS handles styling; this hook is only for JS-side structural decisions.
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(MOBILE_MEDIA_QUERY).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY)
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resync to the live viewport in case it changed between the lazy initializer (render) and effect mount; subsequent updates flow through the change subscription
    setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

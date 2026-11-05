'use client'

// ThemeProvider — light/dark mode state with localStorage persistence.
// The initial theme is set BEFORE hydration by the inline no-flash script in
// app/layout.tsx; this provider reads what is already on <html> and gives
// components a hook to flip it.
//
// On every change it also:
//   - rewrites <meta name="theme-color"> to the new --space-0, so the mobile
//     browser chrome follows the chosen theme instead of the OS;
//   - runs a View Transition when the browser supports it: the new theme is
//     revealed as a circle growing from the toggle that was pressed. The
//     circle is held closed for ~90ms after the new view goes live, so the
//     WebGL canvas has already redrawn in the new palette (no flash of the
//     old sky inside the circle). Reduced motion or no API: instant switch.
// It also follows the OS setting until the visitor picks a theme, and syncs
// across tabs.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export type Theme = 'light' | 'dark'
const STORAGE_KEY = 'theme'

/** --space-0 per theme (keep in sync with app/globals.css and lib/palette.ts). */
export const THEME_COLOR: Record<Theme, string> = { dark: '#05080f', light: '#f4f7fb' }

/** Anything with a pointer position works: a click event, or a plain point. */
export interface ThemeOrigin {
  clientX?: number
  clientY?: number
  detail?: number
  currentTarget?: EventTarget | null
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme, origin?: ThemeOrigin) => void
  /** Pass the click event (onClick={toggle}) to reveal from the toggle. */
  toggle: (origin?: ThemeOrigin) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  toggle: () => {},
})

type ViewTransitionLike = {
  ready: Promise<void>
  finished: Promise<void>
  skipTransition: () => void
}
type DocWithVT = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => ViewTransitionLike
}

const VT_STYLE_ID = 'theme-vt-style'
const VT_CSS = `
::view-transition-old(root),
::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
::view-transition-old(root) { z-index: 1; }
::view-transition-new(root) { z-index: 2; }
`

function readTheme(): Theme | null {
  if (typeof document === 'undefined') return null
  const attr = document.documentElement.getAttribute('data-theme')
  return attr === 'light' || attr === 'dark' ? attr : null
}

function storedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    return t === 'light' || t === 'dark' ? t : null
  } catch {
    return null
  }
}

function syncThemeColor(t: Theme) {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
  if (metas.length === 0) {
    const m = document.createElement('meta')
    m.name = 'theme-color'
    m.content = THEME_COLOR[t]
    document.head.appendChild(m)
    return
  }
  // layout.tsx ships one per OS scheme (media queries); point both at the
  // chosen theme so whichever matches shows the right colour.
  metas.forEach((m) => m.setAttribute('content', THEME_COLOR[t]))
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
  syncThemeColor(t)
}

function originPoint(origin?: ThemeOrigin): { x: number; y: number } {
  const w = window.innerWidth
  const h = window.innerHeight
  // A real pointer click carries coordinates; a keyboard "click" has 0,0 and
  // detail 0, so fall back to the centre of the button that fired it.
  if (origin && typeof origin.clientX === 'number' && typeof origin.clientY === 'number'
      && (origin.detail !== 0 || origin.clientX !== 0 || origin.clientY !== 0)) {
    return { x: origin.clientX, y: origin.clientY }
  }
  const el = (origin?.currentTarget instanceof Element ? origin.currentTarget : null)
    ?? (document.activeElement instanceof Element && document.activeElement !== document.body
      ? document.activeElement
      : null)
  if (el) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 || r.height > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  return { x: w - 48, y: 48 }
}

/** Frames the WebGL scene gets to repaint before the reveal starts. */
const CANVAS_SETTLE_MS = 90

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default 'dark' for SSR. The actual value is reconciled in the effect.
  const [theme, setThemeState] = useState<Theme>('dark')
  const themeRef = useRef<Theme>('dark')
  const vtRef = useRef<ViewTransitionLike | null>(null)

  const commit = useCallback((t: Theme) => {
    themeRef.current = t
    setThemeState(t)
  }, [])

  useEffect(() => {
    const current = readTheme() ?? 'dark'
    commit(current)
    syncThemeColor(current)

    // Follow the OS until the visitor makes an explicit choice.
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    const onScheme = () => {
      if (storedTheme()) return
      const t: Theme = mql.matches ? 'light' : 'dark'
      applyTheme(t)
      commit(t)
    }
    // Another tab changed the theme.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const t = e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : null
      if (!t || t === themeRef.current) return
      applyTheme(t)
      commit(t)
    }
    mql.addEventListener('change', onScheme)
    window.addEventListener('storage', onStorage)
    return () => {
      mql.removeEventListener('change', onScheme)
      window.removeEventListener('storage', onStorage)
    }
  }, [commit])

  const setTheme = useCallback((t: Theme, origin?: ThemeOrigin) => {
    try { localStorage.setItem(STORAGE_KEY, t) } catch { /* private mode etc. */ }
    if (typeof document === 'undefined') { commit(t); return }
    if (t === readTheme()) { commit(t); syncThemeColor(t); return }

    const doc = document as DocWithVT
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (typeof doc.startViewTransition !== 'function' || reduce || document.visibilityState !== 'visible') {
      applyTheme(t)
      commit(t)
      return
    }

    const { x, y } = originPoint(origin)
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    if (!document.getElementById(VT_STYLE_ID)) {
      const style = document.createElement('style')
      style.id = VT_STYLE_ID
      style.textContent = VT_CSS
      document.head.appendChild(style)
    }

    vtRef.current?.skipTransition()
    let vt: ViewTransitionLike
    try {
      // The update is synchronous on purpose: rendering is suppressed while
      // the callback is pending, so waiting for frames here could stall.
      vt = doc.startViewTransition.call(doc, () => {
        applyTheme(t)
        flushSync(() => commit(t))
      })
    } catch {
      applyTheme(t)
      commit(t)
      return
    }
    vtRef.current = vt
    vt.ready
      .then(() => {
        // The new view is live from here. Hold the circle closed for a few
        // frames (fill: backwards) so canvas consumers listening to
        // data-theme redraw in the new palette before any of it is revealed.
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          {
            duration: 640,
            delay: CANVAS_SETTLE_MS,
            fill: 'backwards',
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .catch(() => { /* skipped or aborted: the DOM update already ran */ })
    vt.finished
      .catch(() => {})
      .finally(() => { if (vtRef.current === vt) vtRef.current = null })
  }, [commit])

  const toggle = useCallback((origin?: ThemeOrigin) => {
    setTheme(themeRef.current === 'dark' ? 'light' : 'dark', origin)
  }, [setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

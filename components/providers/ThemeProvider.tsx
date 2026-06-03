'use client'

// ThemeProvider — light/dark mode state with localStorage persistence.
// Initial theme is set BEFORE hydration by the inline no-flash script in
// app/layout.tsx, so this provider just reads what's already on <html> and
// gives components a hook to flip it.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
const STORAGE_KEY = 'theme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default 'dark' for SSR. The actual value is reconciled in the effect.
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'light' || attr === 'dark') setThemeState(attr)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', t)
    }
    try { localStorage.setItem(STORAGE_KEY, t) } catch { /* private mode etc. */ }
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

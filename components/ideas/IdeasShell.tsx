'use client'

// IdeasShell — the frame around every /ideas page: the same world as the site
// (deep space in dark, the illustrated sea in light), a quiet header with a
// way back to the index and the theme toggle, and room for one concept.

import Link from 'next/link'
import { FaArrowLeft, FaMoon, FaSun } from 'react-icons/fa6'
import { StarfieldBackground } from '@/components/mobile/StarfieldBackground'
import { SeaBackground } from '@/components/mobile/SeaBackground'
import { useTheme } from '@/components/providers/ThemeProvider'

export function IdeasShell({ title, children, back = true }: { title: string; children: React.ReactNode; back?: boolean }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  return (
    <div className="ideas-root">
      <div className="ideas-space"><StarfieldBackground /></div>
      <SeaBackground />
      <header className="ideas-head">
        {back ? (
          <Link href="/ideas" className="btn btn--ghost btn--sm"><FaArrowLeft size={11} aria-hidden /> All ideas</Link>
        ) : (
          <Link href="/" className="t-subtitle ideas-mark">Shah Fahad</Link>
        )}
        <span className="t-label ideas-title">{title}</span>
        <button type="button" onClick={toggle} className="btn btn--ghost btn--sm" aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}>
          {isDark ? <FaMoon size={12} aria-hidden /> : <FaSun size={13} aria-hidden />} {isDark ? 'Dark' : 'Light'}
        </button>
      </header>
      <main className="ideas-main">{children}</main>
      <style>{`
        .ideas-root { position: relative; min-height: 100dvh; color: rgb(var(--ink)); }
        :root[data-theme='light'] .ideas-space { display: none; }
        .ideas-head {
          position: sticky; top: 0; z-index: var(--z-chrome);
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 16px clamp(16px, 4vw, 40px);
        }
        .ideas-mark { font-variation-settings: 'wdth' 125; font-size: 16px; }
        .ideas-title { color: rgb(var(--ink-2)); }
        .ideas-main { position: relative; z-index: var(--z-content); padding: 8px clamp(16px, 4vw, 40px) 64px; }
      `}</style>
    </div>
  )
}

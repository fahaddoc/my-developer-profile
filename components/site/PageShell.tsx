'use client'

// PageShell — the frame for every page that isn't the home journey (case
// studies, open source, achievements, 404). The same world as the home page
// (deep space in dark, the illustrated sea in light), a HUD top bar with the
// way back into the journey, the theme, and "Set course" (⌘K / Ctrl K) whose
// destinations land on the home page's stations (/#<station>).

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { FaArrowLeft, FaGithub, FaLinkedinIn, FaMoon, FaSun } from 'react-icons/fa6'
import { StarfieldBackground } from '@/components/mobile/StarfieldBackground'
import { SeaBackground } from '@/components/mobile/SeaBackground'
import { CourseDock, NavComputer } from '@/components/nav/NavComputer'
import { useTheme } from '@/components/providers/ThemeProvider'
import { AUTHOR, SOCIALS } from '@/lib/seo/site'
import { STATIONS } from '@/lib/tunnel'
import s from './site.module.css'

export function PageShell({ back, where, children }: {
  /** the way back into the journey, e.g. { href: '/#projects', label: 'All work' } */
  back: { href: string; label: string }
  /** where the visitor is, for the nav computer ("from …") and the dock */
  where: string
  children: React.ReactNode
}) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()
  const [course, setCourse] = useState(false)
  const [mod, setMod] = useState('⌘K')

  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) setMod('Ctrl K')
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return
      if (document.documentElement.hasAttribute('data-drawer-open')) return
      e.preventDefault()
      setCourse((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = useCallback((id: string) => router.push(`/#${id}`), [router])

  return (
    <div className={s.page}>
      <div className={s.space} aria-hidden><StarfieldBackground /></div>
      <SeaBackground />

      <header className={s.bar}>
        <Link href="/" className={`t-subtitle ${s.mark}`}>{AUTHOR.name}</Link>
        <Link href={back.href} className={`btn btn--ghost btn--sm ${s.back}`}>
          <FaArrowLeft size={11} aria-hidden /> {back.label}
        </Link>
        <div className={s.tools}>
          <button type="button" className={`btn btn--ghost btn--sm ${s.course}`} onClick={() => setCourse(true)} aria-keyshortcuts="Meta+K Control+K">
            <span className={s.space2}>Set course</span>
            <span className={s.sea2}>Chart a course</span>
            <kbd className={s.kbd}>{mod}</kbd>
          </button>
          <button type="button" onClick={(e) => toggle(e)} className="btn btn--ghost btn--sm" aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}>
            {isDark ? <FaMoon size={12} aria-hidden /> : <FaSun size={13} aria-hidden />}
            <span className={s.themeLabel}>{isDark ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </header>

      <main id="content" className={s.main}>{children}</main>

      <footer className={s.foot}>
        <span className="t-label">{AUTHOR.name} · {AUTHOR.jobTitle}</span>
        <span className={s.footLinks}>
          <a href={`mailto:${AUTHOR.email}`} className="link-quiet t-label">{AUTHOR.email}</a>
          <a href={SOCIALS.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className={s.social}><FaGithub size={15} aria-hidden /></a>
          <a href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={s.social}><FaLinkedinIn size={15} aria-hidden /></a>
        </span>
      </footer>

      {/* phones reach the nav computer from a dock, like the home page */}
      <div className={s.dock}>
        <CourseDock station={{ ...STATIONS[0], num: '··', short: where }} onOpen={() => setCourse(true)} />
      </div>
      <NavComputer open={course} onClose={() => setCourse(false)} progress={0} activeId="" showEta={false} fromLabel={where} onGo={go} />
    </div>
  )
}

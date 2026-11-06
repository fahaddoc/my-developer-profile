'use client'

// TunnelHUD — the DOM layer over the WebGL tunnel (desktop only).
//
// Station content lives here as flat overlays, not inside the 3D scene, so it
// never collides with geometry. Layout, type, colour and motion follow
// DESIGN.md: one ember accent through tokens, Archivo roles (.t-*), a thin
// station rail, and a per-station reveal (title lines rise out of a mask, the
// rest fades up after it, a 280ms crossfade on exit). Styles live in
// TunnelHUD.module.css so hover, focus and reduced motion are real CSS.
//
// The right-hand objects (Experience timeline, Contact links, the finale) are
// placed for the 3D framing in TunnelScene: Experience's planet sits lower
// right, Contact's Earth rises as a horizon from the bottom edge.
//
// Perf: useScrollProgress throttles re-renders to 0.003 of progress; chrome
// that never depends on progress is memoised; every side object returns null
// outside its band or while a rail flight is heading somewhere else.

import {
  memo, useCallback, useEffect, useRef, useState, useSyncExternalStore,
  type CSSProperties, type FocusEvent, type MouseEvent,
} from 'react'
import Link from 'next/link'
import {
  FaArrowLeft, FaArrowRight, FaArrowUp, FaDownload, FaEnvelope, FaGithub, FaLinkedinIn,
  FaMoon, FaPause, FaPhone, FaPlay, FaStop, FaSun,
} from 'react-icons/fa6'
import type { IconType } from 'react-icons'
import { contributions, openSourceStats } from '@/data/open-source'
import { FlutterLogo, GitHubLogo, MergedGlyph } from '@/components/featured/BrandLogos'
import { STATIONS, nearestStation, useScrollProgress, useSound, type StationDef } from '@/lib/tunnel'
import { FlipPhotoCard } from '@/components/r3f/FlipPhotoCard'
import { QualityToggleSlot } from '@/components/r3f/QualityToggle'
import { lenisInstance } from '@/components/providers/SmoothScroll'
import { useTheme } from '@/components/providers/ThemeProvider'
import { experience, skills } from '@/data/projects'
import { StarMap } from '@/components/projects/starmap/StarMap'
import { FlightPlan } from '@/components/nav/FlightPlan'
import { NavComputer } from '@/components/nav/NavComputer'
import { testimonials } from '@/data/testimonials'
import { AUTHOR, SOCIALS } from '@/lib/seo/site'
import styles from './TunnelHUD.module.css'

const T = Object.fromEntries(STATIONS.map((s) => [s.id, s.t])) as Record<string, number>
const FIRST = STATIONS[0]
const LAST  = STATIONS[STATIONS.length - 1]

/** Where the finale takes over from Contact (fully in by FINALE_FULL, well
 *  before the last 2% of scroll). */
const FINALE_START = 0.945
const FINALE_FULL  = 0.97

/** Distance from a station. Before the first station (page load sits at
 *  progress 0, the hero at 0.04) counts as arrived, so the first screen is
 *  fully present. Past the last station the distance grows twice as fast, so
 *  Contact has left before the finale arrives. */
function stationDist(progress: number, s: { id: string; t: number }) {
  if (s.id === FIRST.id) return Math.max(0, progress - s.t)
  if (s.id === LAST.id && progress > s.t) return (progress - s.t) * 2
  return Math.abs(progress - s.t)
}
const pad   = (n: number) => String(n).padStart(2, '0')
const order = (n: number) => ({ '--i': n }) as CSSProperties
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// A flight is Lenis' own tween, so a wheel or trackpad gesture can take over
// mid-way. While it is heading somewhere, only the destination may reveal:
// the stations flown past keep their content (and their side objects) hidden.
// ─────────────────────────────────────────────────────────────────────────────
let navTarget: string | null = null
const navListeners = new Set<() => void>()

function setNavTarget(v: string | null) {
  if (navTarget === v) return
  navTarget = v
  navListeners.forEach((cb) => cb())
}
function subscribeNav(cb: () => void) {
  navListeners.add(cb)
  return () => { navListeners.delete(cb) }
}
function useNavTarget() {
  return useSyncExternalStore(subscribeNav, () => navTarget, () => null)
}
/** True while a flight is heading to a station other than `id`. */
function useHiddenByFlight(id: string) {
  const target = useNavTarget()
  return target !== null && target !== id
}

function focusStation(id: string) {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>(`[data-station-panel="${id}"]`)
    el?.focus({ preventScroll: true })
  }, 140)
}

function scrollToStation(id: string, { focus = false, then }: { focus?: boolean; then?: () => void } = {}) {
  const t = T[id]
  if (t === undefined) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const arrive = () => {
    if (focus) focusStation(id)
    then?.()
  }

  if (lenisInstance) {
    // Lenis measured the page before the 500vh spacer mounted; refresh.
    lenisInstance.resize()
    const limit  = lenisInstance.limit
    const target = t * limit
    const dist   = Math.abs(target - lenisInstance.scroll)
    if (dist < 1) { arrive(); return }

    if (reduce) {
      lenisInstance.scrollTo(target, { immediate: true, force: true })
      // let the hero portrait mount before anything that needs it
      window.setTimeout(arrive, 60)
      return
    }

    // Longer jumps take a little longer, capped so the rail never feels slow.
    const duration = Math.min(1.4, 0.7 + (dist / Math.max(1, limit)) * 1.2)
    setNavTarget(id)
    lenisInstance.scrollTo(target, {
      duration,
      easing: (x: number) => 1 - Math.pow(1 - x, 5), // quint
      force: true,
      onComplete: () => {
        setNavTarget(null)
        arrive()
      },
    })
    return
  }

  const el = document.getElementById(id)
  if (el) window.scrollTo({ top: el.offsetTop, behavior: reduce ? 'auto' : 'smooth' })
  window.setTimeout(arrive, reduce ? 60 : 900)
}

function currentProgress() {
  const w = window as unknown as { __lenis?: { scroll: number; limit: number }; __scrollRef?: { current: number } }
  if (w.__lenis && w.__lenis.limit > 0) return w.__lenis.scroll / w.__lenis.limit
  return w.__scrollRef?.current ?? 0
}

/** User input takes over a flight; PageDown/PageUp/Space step between stations. */
function useNavigationKeys() {
  useEffect(() => {
    const cancel = () => setNavTarget(null)
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      if (el && (el.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'))) return
      // Space on a button/link activates it; only handle it on the page itself.
      const onControl = !!el && el !== document.body && !!el.closest('button, a, [role="button"]')

      let dir = 0
      if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey && !onControl)) dir = 1
      else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey && !onControl)) dir = -1
      if (!dir) return

      e.preventDefault()
      const now  = nearestStation(currentProgress())
      const idx  = STATIONS.findIndex((s) => s.id === (navTarget ?? now.id))
      const next = STATIONS[Math.max(0, Math.min(STATIONS.length - 1, idx + dir))]
      if (next) scrollToStation(next.id, { focus: true })
    }
    window.addEventListener('wheel', cancel, { passive: true })
    window.addEventListener('touchstart', cancel, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchstart', cancel)
      window.removeEventListener('keydown', onKey)
    }
  }, [])
}

// ─────────────────────────────────────────────────────────────────────────────
// Small hooks
// ─────────────────────────────────────────────────────────────────────────────

/** False for the first two frames after mount, so a reveal has a start state
 *  to transition from instead of appearing already arrived. */
function useArmed() {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    let r2 = 0
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setArmed(true)) })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
  }, [])
  return armed
}

/** Latching threshold: true once value >= on, false again once value <= off. */
function useLatch(value: number, on: number, off: number) {
  const ref = useRef(false)
  if (value >= on) ref.current = true
  else if (value <= off) ref.current = false
  return ref.current
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

/** Fade band for the right-hand station objects. Contact leaves early on the
 *  way out, so the finale has the frame to itself. */
function band(progress: number, t: number, half = 0.075, ramp = 0.035) {
  const dist = Math.abs(progress - t)
  let opacity = clamp01((half - dist) / ramp)
  if (t === LAST.t && progress > t) opacity = Math.min(opacity, clamp01((FINALE_START - progress) / 0.03))
  return { dist, opacity: smoothstep(0, 1, opacity) }
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD root
// ─────────────────────────────────────────────────────────────────────────────
export function TunnelHUD() {
  const progress = useScrollProgress()
  const station  = nearestStation(progress)
  useNavigationKeys()

  return (
    <>
      {/* cinematic frame: above the canvas, below every HUD layer */}
      <div className={`vignette ${styles.vignetteLayer}`} aria-hidden="true" />

      <TopBar />
      <FlightRail activeId={station.id} progress={progress} />

      <main id="content" className={styles.main}>
        <StationStage station={station} progress={progress} />

        <HeroPortrait progress={progress} />
        <ProjectsGallery progress={progress} />
        <ExperienceJourney progress={progress} />
        <ContactOrbit progress={progress} />
        <Finale progress={progress} />
      </main>

      <ScrollHint visible={progress < 0.03} />
      <Socials />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Chrome
// ─────────────────────────────────────────────────────────────────────────────
const TopBar = memo(function TopBar() {
  const [sound, setSound] = useSound()
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  const goHome = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    scrollToStation('hero', { focus: e.detail === 0 })
  }

  return (
    <header className={styles.topbar}>
      <a href="#hero" onClick={goHome} className={styles.wordmark}>Shah Fahad</a>

      <div className={styles.cluster}>
        <button
          type="button"
          onClick={() => { if (sound) setSound(false); else startIntro(setSound) }}
          className={styles.chromeBtn}
        >
          {sound ? <FaStop size={10} aria-hidden /> : <FaPlay size={10} aria-hidden />}
          {sound ? 'Stop intro' : 'Play intro'}
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={`${isDark ? 'Dark' : 'Light'} theme, switch to ${isDark ? 'light' : 'dark'}`}
          className={styles.chromeBtn}
        >
          {isDark ? <FaMoon size={12} aria-hidden /> : <FaSun size={13} aria-hidden />}
          {isDark ? 'Dark' : 'Light'}
        </button>
        <QualityToggleSlot className={`${styles.chromeBtn} ${styles.chromeQuiet}`} />
      </div>
    </header>
  )
})

/** The intro plays in the hero portrait; from any other station, fly back to
    the hero first and start it on arrival. */
function startIntro(setSound: (v: boolean) => void) {
  if (nearestStation(currentProgress()).id === FIRST.id) setSound(true)
  else scrollToStation(FIRST.id, { then: () => setSound(true) })
}

// The station rail as a flight plan, plus the ⌘K / Ctrl K nav computer.
const FlightRail = memo(function FlightRail({ activeId, progress }: { activeId: string; progress: number }) {
  const [, setSound] = useSound()
  const [course, setCourse] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return
      if (document.documentElement.hasAttribute('data-drawer-open')) return
      e.preventDefault()
      setCourse((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = useCallback((id: string, keyboard: boolean) => scrollToStation(id, { focus: keyboard }), [])
  const goFromComputer = useCallback((id: string) => scrollToStation(id, { focus: true }), [])
  const playIntro = useCallback(() => startIntro(setSound), [setSound])

  return (
    <>
      <div className={styles.rail}>
        <FlightPlan activeId={activeId} progress={progress} onGo={go} onSetCourse={() => setCourse(true)} />
      </div>
      <NavComputer
        open={course}
        onClose={() => setCourse(false)}
        progress={progress}
        activeId={activeId}
        onGo={goFromComputer}
        onPlayIntro={playIntro}
      />
    </>
  )
})

function ScrollHint({ visible }: { visible: boolean }) {
  return (
    <div className={styles.scrollHint} data-visible={visible} aria-hidden="true">
      <span className="t-label">Scroll</span>
      <span className={styles.scrollLine} />
    </div>
  )
}

const Socials = memo(function Socials() {
  return (
    <nav aria-label="Profiles" className={styles.socials}>
      <a href={SOCIALS.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className={styles.socialLink}>
        <FaGithub size={16} aria-hidden />
      </a>
      <a href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={styles.socialLink}>
        <FaLinkedinIn size={16} aria-hidden />
      </a>
      <a href={`mailto:${AUTHOR.email}`} aria-label="Email" className={styles.socialLink}>
        <FaEnvelope size={15} aria-hidden />
      </a>
    </nav>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Station stage — the left overlay. When the nearest station changes, the
// outgoing panel stays mounted for a 280ms crossfade instead of hard-swapping.
// ─────────────────────────────────────────────────────────────────────────────
interface Shown { id: string; leaving: boolean }

function StationStage({ station, progress }: { station: StationDef; progress: number }) {
  const [shown, setShown] = useState<Shown[]>(() => [{ id: station.id, leaving: false }])

  useEffect(() => {
    setShown((prev) => {
      const current = prev.find((p) => !p.leaving)
      if (current?.id === station.id) return prev
      return [
        ...prev.filter((p) => p.id !== station.id).map((p) => ({ ...p, leaving: true })),
        { id: station.id, leaving: false },
      ]
    })
  }, [station.id])

  useEffect(() => {
    if (!shown.some((p) => p.leaving)) return
    const id = window.setTimeout(() => setShown((prev) => prev.filter((p) => !p.leaving)), 320)
    return () => window.clearTimeout(id)
  }, [shown])

  return (
    <div className={styles.stage}>
      {shown.map(({ id, leaving }) => {
        const s = STATIONS.find((x) => x.id === id)
        if (!s || s.id === 'projects') return null
        return <StationPanel key={id} station={s} progress={progress} leaving={leaving} />
      })}
    </div>
  )
}

function StationPanel({ station, progress, leaving }: { station: StationDef; progress: number; leaving: boolean }) {
  const proximity = clamp01(1 - stationDist(progress, station) / 0.10)
  // Near full opacity by the time the title starts to rise.
  const opacity   = smoothstep(0, 0.6, proximity)
  const armed     = useArmed()
  const near      = useLatch(proximity, 0.6, 0.35)
  const elsewhere = useHiddenByFlight(station.id)
  const isIn      = armed && near && !elsewhere
  const live      = isIn && !leaving
  const titleId   = `station-${station.id}-title`

  return (
    <section
      className={`${styles.panel} ${styles.reveal}`}
      data-in={isIn}
      data-leaving={leaving}
      data-station-panel={station.id}
      aria-labelledby={titleId}
      tabIndex={-1}
      style={{ opacity }}
      inert={!live}
    >
      <StationCard station={station} active={live} titleId={titleId} />
    </section>
  )
}

function StationCard({ station, active, titleId }: { station: StationDef; active: boolean; titleId: string }) {
  switch (station.id) {
    case 'hero':       return <HeroCard       station={station} titleId={titleId} />
    case 'about':      return <AboutCard      station={station} titleId={titleId} />
    case 'skills':     return <SkillsCard     station={station} titleId={titleId} />
    case 'opensource': return <OpenSourceCard station={station} titleId={titleId} active={active} />
    case 'experience': return <ExperienceCard station={station} titleId={titleId} />
    case 'contact':    return <ContactCard    station={station} titleId={titleId} />
    default:           return null
  }
}

/** Station title whose lines ("\n" in the copy) each rise out of a mask. */
function MaskedTitle({ text, as: Tag = 'h2', className, id }: { text: string; as?: 'h1' | 'h2'; className: string; id?: string }) {
  const lines = text.split('\n')
  return (
    <Tag className={className} id={id}>
      {lines.map((line, i) => (
        <span key={i} className={styles.line}>
          <span className={styles.lineInner} style={order(i)}>
            {line}{i < lines.length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </Tag>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Station cards (left overlay)
// ─────────────────────────────────────────────────────────────────────────────
interface CardProps { station: StationDef; titleId: string }

function HeroCard({ station, titleId }: CardProps) {
  return (
    <>
      <MaskedTitle as="h1" id={titleId} text={station.heading} className={`t-display ${styles.heroName}`} />
      <p className={`t-lead ${styles.lead} ${styles.heroLead} ${styles.rise}`} style={order(0)}>
        {station.tagline}
      </p>
      <div className={`${styles.actions} ${styles.rise} ${styles.hit}`} style={order(1)}>
        <a
          href="#projects"
          onClick={(e) => { e.preventDefault(); scrollToStation('projects', { focus: e.detail === 0 }) }}
          className="btn btn--primary"
        >
          See the work <span className="btn-arrow" aria-hidden="true">→</span>
        </a>
        <a href="/Shah_Fahad_Resume.pdf" download aria-label="Resume, PDF" className="btn btn--ghost">
          <FaDownload size={12} aria-hidden /> Resume
        </a>
      </div>
    </>
  )
}

function AboutCard({ station, titleId }: CardProps) {
  return (
    <>
      <MaskedTitle id={titleId} text={station.heading} className={`t-title ${styles.title}`} />
      <p className={`t-lead ${styles.lead} ${styles.rise}`} style={order(0)}>{station.tagline}</p>
      <ul className={`${styles.facts} ${styles.rise}`} style={order(1)}>
        <li className="t-data"><span className={styles.ember}>8+</span>&nbsp;years</li>
        <li className="t-data">DigitalHire · Kistpay · Miletap</li>
        <li className="t-data">Karachi, PK</li>
      </ul>
    </>
  )
}

const SKILL_GROUPS = skills.map((s) => s.label).join(' · ')

function SkillsCard({ station, titleId }: CardProps) {
  return (
    <>
      <MaskedTitle id={titleId} text={station.heading} className={`t-title ${styles.title}`} />
      <p className={`t-lead ${styles.lead} ${styles.rise}`} style={order(0)}>{station.tagline}</p>
      <p className={`t-label ${styles.hint} ${styles.rise}`} style={order(1)}>{SKILL_GROUPS}</p>
    </>
  )
}

// Long enough to read a PR title and its meta line before the next one.
const OS_AUTOPLAY_MS = 7000
const OS_MERGED = openSourceStats().merged

function OpenSourceCard({ station, titleId, active }: CardProps & { active: boolean }) {
  const [idx, setIdx]               = useState(0)
  const [hoverPaused, setHover]     = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const reduced = useReducedMotion()
  const n       = contributions.length
  const running = active && !hoverPaused && !userPaused && !reduced && n > 1

  // Pausing keeps the time already spent on this card; picking a card resets.
  const elapsedRef = useRef(0)
  const startRef   = useRef(0)
  useEffect(() => { elapsedRef.current = 0 }, [idx])
  useEffect(() => {
    if (!running) return
    startRef.current = performance.now()
    const remaining = Math.max(0, OS_AUTOPLAY_MS - elapsedRef.current)
    const id = window.setTimeout(() => setIdx((i) => (i + 1) % n), remaining)
    return () => {
      window.clearTimeout(id)
      elapsedRef.current += performance.now() - startRef.current
    }
  }, [running, idx, n])

  const leave = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(false)
  }
  const [before, after = ''] = station.tagline.split('{n}')

  return (
    <>
      <MaskedTitle id={titleId} text={station.heading} className={`t-title ${styles.title}`} />
      <p className={`t-lead ${styles.lead} ${styles.rise}`} style={order(0)}>
        {before}
        {station.tagline.includes('{n}') && <span className={styles.leadNum}>{OS_MERGED}</span>}
        {after}
      </p>

      {/* Hover or focus anywhere in the card or its controls pauses rotation. */}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocusCapture={() => setHover(true)}
        onBlurCapture={leave}
      >
        <div className={`${styles.surface} ${styles.prCard} ${styles.rise} ${styles.hit}`} style={order(1)}>
          <div className={styles.stack} aria-live={running ? 'off' : 'polite'}>
            {contributions.map((c, i) => {
              const on = i === idx
              return (
                <article key={c.id} className={styles.stackItem} data-active={on} aria-hidden={!on} inert={!on}>
                  <div className={styles.prHead}>
                    {c.org === 'Flutter'
                      ? <FlutterLogo size={22} className={styles.flutter} title="Flutter" />
                      : <span className={`t-label ${styles.prOrg}`}>{c.org}</span>}
                    <GitHubLogo size={20} className={styles.gh} />
                    <span className={`t-label ${styles.merged}`}>
                      <MergedGlyph size={13} /> Merged
                    </span>
                  </div>
                  <h3 className={`t-subtitle ${styles.prTitle}`}>{c.prTitle}</h3>
                  <p className={`t-data ${styles.prMeta}`}>
                    {c.repo} · #{c.prNumber} · {c.displayDate} ·{' '}
                    <span className={styles.add}>+{c.additions}</span>/<span className={styles.del}>−{c.deletions}</span>
                  </p>
                  <div className={styles.actions}>
                    <a href={c.prUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
                      View pull request <span className="btn-arrow" aria-hidden="true">↗</span>
                    </a>
                    <Link href={`/achievements/${c.id}`} className="btn btn--ghost">
                      Read case study <span className="btn-arrow" aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        {n > 1 && (
          <div className={`${styles.carousel} ${styles.rise} ${styles.hit}`} style={order(2)}>
            <div role="group" aria-label="Merged pull requests" className={styles.dots}>
              {contributions.map((c, i) => {
                const on = i === idx
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setIdx(i); setUserPaused(true) }}
                    aria-label={`Pull request #${c.prNumber}, ${c.repo}`}
                    aria-current={on ? 'true' : undefined}
                    className={styles.dot}
                  >
                    <span className={styles.dotTrack}>
                      <span
                        key={idx}
                        className={styles.dotFill}
                        data-running={on && running}
                        data-done={on && (userPaused || reduced)}
                        style={{ '--autoplay': `${OS_AUTOPLAY_MS}ms` } as CSSProperties}
                      />
                    </span>
                  </button>
                )
              })}
            </div>
            <span className={`t-data ${styles.counter}`}>{pad(idx + 1)} / {pad(n)}</span>
            <button
              type="button"
              onClick={() => setUserPaused(!userPaused)}
              aria-label={userPaused ? 'Resume rotation' : 'Pause rotation'}
              className={`${styles.iconBtn} ${styles.iconBtnQuiet}`}
            >
              {userPaused ? <FaPlay size={9} aria-hidden /> : <FaPause size={9} aria-hidden />}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function ExperienceCard({ station, titleId }: CardProps) {
  const [ti, setTi] = useState(0)
  const n = testimonials.length
  const go = (d: number) => setTi((t) => (t + d + n) % n)

  return (
    <>
      <MaskedTitle id={titleId} text={station.heading} className={`t-title ${styles.title}`} />
      <p className={`t-lead ${styles.lead} ${styles.rise}`} style={order(0)}>{station.tagline}</p>

      <figure className={`${styles.surface} ${styles.quoteCard} ${styles.rise} ${styles.hit}`} style={order(1)}>
        <div className={styles.stack} aria-live="polite">
          {testimonials.map((q, i) => (
            <div key={q.name} className={styles.stackItem} data-active={i === ti} aria-hidden={i !== ti} inert={i !== ti}>
              <blockquote className={`t-lead ${styles.quote}`}>&ldquo;{q.short}&rdquo;</blockquote>
              <figcaption>
                <span className={`t-subtitle ${styles.quoteName}`}>{q.name}</span>
                <span className={`t-label ${styles.quoteRole}`}>{q.role}</span>
              </figcaption>
            </div>
          ))}
        </div>
        {n > 1 && (
          <div className={styles.quoteNav}>
            <span className={`t-data ${styles.counter}`}>{pad(ti + 1)} / {pad(n)}</span>
            <button type="button" onClick={() => go(-1)} aria-label="Previous recommendation" className={styles.iconBtn}>
              <FaArrowLeft size={12} aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next recommendation" className={styles.iconBtn}>
              <FaArrowRight size={12} aria-hidden />
            </button>
          </div>
        )}
      </figure>
    </>
  )
}

function ContactCard({ station, titleId }: CardProps) {
  const call = station.cta?.href ?? 'https://cal.com/shahfahad'
  return (
    <>
      <MaskedTitle id={titleId} text={station.heading} className={`t-title ${styles.title}`} />
      <p className={`t-lead ${styles.lead} ${styles.rise}`} style={order(0)}>{station.tagline}</p>
      <div className={`${styles.rise} ${styles.hit}`} style={order(1)}>
        <a href={`mailto:${AUTHOR.email}`} className={`link-quiet t-subtitle ${styles.email}`}>{AUTHOR.email}</a>
      </div>
      <div className={`${styles.actions} ${styles.rise} ${styles.hit}`} style={order(2)}>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('contact-drawer-open'))}
          className="btn btn--primary"
        >
          Write to me <span className="btn-arrow" aria-hidden="true">→</span>
        </button>
        <a href={call} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
          Book a 15-min call
        </a>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Right-hand station objects
// ─────────────────────────────────────────────────────────────────────────────

/** Hero portrait. Bottom-anchored and sized from the viewport (CSS), so it
 *  clears the hero text at 1024–1280px and the intro player above it. */
function HeroPortrait({ progress }: { progress: number }) {
  const opacity  = smoothstep(0, 0.6, clamp01(1 - stationDist(progress, FIRST) / 0.10))
  const hidden   = useHiddenByFlight(FIRST.id)
  if (opacity < 0.01 || hidden) return null
  return (
    <div className={styles.portraitDock} style={{ opacity }} inert={opacity < 0.5}>
      <FlipPhotoCard />
    </div>
  )
}

// The star map is heavy; never re-render it just because progress moved.
const Showcase = memo(function Showcase() { return <StarMap title="Selected work." /> })

// A readable project gallery takes over the station, then fades before OSS.
function ProjectsGallery({ progress }: { progress: number }) {
  const projectT  = T.projects
  const midpoint  = (projectT + T.opensource) / 2
  const distance  = Math.abs(progress - projectT)
  const approach  = clamp01((0.11 - distance) / 0.04)
  const departure = progress <= projectT ? 1 : clamp01((midpoint - progress) / 0.025)
  const opacity   = smoothstep(0, 1, Math.min(approach, departure))
  const hidden    = useHiddenByFlight('projects')
  if (opacity < 0.01 || hidden) return null

  return (
    <div className={styles.gallery} style={{ opacity, pointerEvents: opacity > 0.4 ? 'auto' : 'none' }}>
      <Showcase />
    </div>
  )
}

// Experience: a quiet trajectory in the clear sky above the station's planet
// (which sits lower right), newest role at the top. Coordinates are % of the
// .journey box; every label stays off the planet disc at 1280–1440 wide.
const EJ_NODES: { x: number; y: number; side: 'left' | 'right' }[] = [
  { x: 82, y: 4,  side: 'left'  },
  { x: 54, y: 33, side: 'right' },
  { x: 76, y: 62, side: 'left'  },
  { x: 47, y: 92, side: 'right' },
]
const EJ_PATH = 'M 82 4 C 70 14, 60 22, 54 33 S 80 50, 76 62 S 52 84, 47 92'

function ExperienceJourney({ progress }: { progress: number }) {
  // Experience (0.75) and contact (0.90) both use the right side; the tight
  // band hands off around their midpoint without overlap.
  const { dist, opacity } = band(progress, T.experience)
  const armed  = useArmed()
  const near   = useLatch(opacity, 0.6, 0.35)
  const hidden = useHiddenByFlight('experience')
  if (dist > 0.08 || hidden) return null
  const roles = experience.slice(0, EJ_NODES.length)

  return (
    <div
      className={`${styles.side} ${styles.reveal} ${styles.journey}`}
      data-in={armed && near}
      style={{ opacity }}
      aria-hidden={!near}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.journeyPath} aria-hidden="true">
        <path d={EJ_PATH} />
      </svg>
      {roles.map((e, i) => {
        const p = EJ_NODES[i]
        return (
          <div key={e.id} className={styles.node} data-current={e.current} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <span className={styles.nodeDot} />
            <div className={styles.nodeLabel} data-side={p.side}>
              <div className={`${styles.rise} ${styles.nodeTag}`} style={order(i)}>
                <span className={`t-data ${styles.nodePeriod}`}>{e.period}</span>
                <span className={`t-subtitle ${styles.nodeRole}`}>{e.role}</span>
                <span className={`t-label ${styles.nodeCompany}`}>{e.company}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Contact: the four real channels ride an arc just above the Earth's horizon
// (which rises from the bottom edge, apex around 68% across). Coordinates are
// % of the .orbit box; the arc echoes the horizon curve.
interface Channel { icon: IconType; label: string; href: string; aria: string; external: boolean; x: number; y: number }
const CHANNELS: Channel[] = [
  { icon: FaEnvelope,   label: 'Email',    href: `mailto:${AUTHOR.email}`,                 aria: `Email ${AUTHOR.email}`,                external: false, x: 9,  y: 75 },
  { icon: FaLinkedinIn, label: 'LinkedIn', href: SOCIALS.linkedin,                          aria: 'LinkedIn profile, opens in a new tab', external: true,  x: 34, y: 70 },
  { icon: FaGithub,     label: 'GitHub',   href: SOCIALS.github,                            aria: 'GitHub profile, opens in a new tab',   external: true,  x: 59, y: 73 },
  { icon: FaPhone,      label: 'Phone',    href: `tel:${AUTHOR.phone.replace(/\s+/g, '')}`, aria: `Phone ${AUTHOR.phone}`,                external: false, x: 84, y: 83 },
]

function ContactOrbit({ progress }: { progress: number }) {
  const { dist, opacity } = band(progress, T.contact)
  const armed  = useArmed()
  const near   = useLatch(opacity, 0.6, 0.35)
  const hidden = useHiddenByFlight('contact')
  if (dist > 0.08 || opacity < 0.01 || hidden) return null
  const isIn = armed && near

  return (
    <div
      className={`${styles.side} ${styles.reveal} ${styles.orbit}`}
      data-in={isIn}
      style={{ opacity }}
      inert={!near}
    >
      <ul className={styles.orbitList}>
        {CHANNELS.map((c, i) => {
          const Icon = c.icon
          return (
            <li key={c.label} className={styles.orbitNode} style={{ left: `${c.x}%`, top: `${c.y}%` }}>
              <div className={`${styles.rise} ${styles.hit}`} style={order(i)}>
                <a
                  href={c.href}
                  aria-label={c.aria}
                  {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={styles.orbitLink}
                >
                  <span className={styles.orbitChip}><Icon size={18} aria-hidden /></span>
                  <span className={`t-label ${styles.orbitLabel}`}>{c.label}</span>
                </a>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// End of the journey: the name again over the Earth's horizon, the one
// address to write to, and a way back to the start (no automatic loop).
function Finale({ progress }: { progress: number }) {
  const opacity = smoothstep(FINALE_START, FINALE_FULL, progress)
  const armed   = useArmed()
  const near    = useLatch(opacity, 0.6, 0.3)
  const hidden  = useHiddenByFlight('finale')
  if (opacity < 0.01 || hidden) return null
  const isIn = armed && near

  return (
    <section
      className={`${styles.finale} ${styles.reveal}`}
      data-in={isIn}
      aria-labelledby="finale-title"
      style={{ opacity }}
      inert={!near}
    >
      <MaskedTitle id="finale-title" text={'Shah Fahad'} className={`t-display ${styles.finaleName}`} />
      <p className={`t-lead ${styles.finaleLead} ${styles.rise}`} style={order(0)}>
        Thanks for flying through. Say hello any time.
      </p>
      <div className={`${styles.rise} ${styles.hit}`} style={order(1)}>
        <a href={`mailto:${AUTHOR.email}`} className={`link-quiet t-subtitle ${styles.finaleEmail}`}>{AUTHOR.email}</a>
      </div>
      <div className={`${styles.finaleLinks} ${styles.rise} ${styles.hit}`} style={order(2)}>
        <a href={SOCIALS.github} target="_blank" rel="noopener noreferrer" className="link-quiet t-label">
          <FaGithub size={14} aria-hidden /> GitHub
        </a>
        <a href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer" className="link-quiet t-label">
          <FaLinkedinIn size={14} aria-hidden /> LinkedIn
        </a>
        <a href="/Shah_Fahad_Resume.pdf" download className="link-quiet t-label">
          <FaDownload size={12} aria-hidden /> Resume
        </a>
      </div>
      <div className={`${styles.rise} ${styles.hit}`} style={order(3)}>
        <button
          type="button"
          onClick={(e) => scrollToStation('hero', { focus: e.detail === 0 })}
          className="btn btn--ghost"
        >
          <FaArrowUp size={12} aria-hidden /> Back to the start
        </button>
      </div>
    </section>
  )
}

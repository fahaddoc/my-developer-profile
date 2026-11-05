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
// Perf: useScrollProgress throttles re-renders to 0.003 of progress; the top
// progress hairline runs on its own rAF + ref (no React state per frame);
// every side panel returns null outside its band.

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import Link from 'next/link'
import {
  FaArrowLeft, FaArrowRight, FaDownload, FaEnvelope, FaGithub, FaLinkedinIn,
  FaMoon, FaPause, FaPhone, FaPlay, FaStop, FaSun,
} from 'react-icons/fa6'
import type { IconType } from 'react-icons'
import { contributions, openSourceStats } from '@/data/open-source'
import { FlutterLogo, GitHubLogo, MergedGlyph } from '@/components/featured/BrandLogos'
import { STATIONS, nearestStation, useScrollProgress, useSound, type StationDef } from '@/lib/tunnel'
import { IntroMiniPlayer } from '@/components/r3f/IntroMiniPlayer'
import { FlipPhotoCard } from '@/components/r3f/FlipPhotoCard'
import { QualityToggleSlot } from '@/components/r3f/QualityToggle'
import { lenisInstance } from '@/components/providers/SmoothScroll'
import { useTheme } from '@/components/providers/ThemeProvider'
import { experience } from '@/data/projects'
import { ProjectShowcase } from '@/components/projects/ProjectShowcase'
import { testimonials } from '@/data/testimonials'
import { AUTHOR, SOCIALS } from '@/lib/seo/site'
import styles from './TunnelHUD.module.css'

const T = Object.fromEntries(STATIONS.map((s) => [s.id, s.t])) as Record<string, number>
const FIRST = STATIONS[0]

/** Distance from a station. Before the first station (page load sits at
 *  progress 0, the hero at 0.04) counts as arrived, so the first screen is
 *  fully present instead of 57% faded. */
function stationDist(progress: number, s: { id: string; t: number }) {
  return s.id === FIRST.id ? Math.max(0, progress - s.t) : Math.abs(progress - s.t)
}
const pad = (n: number) => String(n).padStart(2, '0')
const order = (n: number) => ({ '--i': n }) as CSSProperties

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// Lenis hijacks native scroll, so scrollIntoView({behavior:'smooth'}) gets
// cancelled mid-flight. Drive lenis.scrollTo ourselves and land exactly on
// the station's t (progress = scroll / limit), so the overlay reaches full
// opacity. While a jump is in flight only the target station may reveal, so
// the stations we fly past do not flash their content.
// ─────────────────────────────────────────────────────────────────────────────
let scrollRafId = 0
let navTarget: string | null = null

function scrollToStation(id: string) {
  const t = T[id]
  if (t === undefined) return
  if (scrollRafId) { cancelAnimationFrame(scrollRafId); scrollRafId = 0 }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (lenisInstance) {
    // Lenis measured the page before the 500vh spacer mounted; refresh.
    lenisInstance.resize()
    const limit  = lenisInstance.limit
    const target = t * limit
    const startY = lenisInstance.scroll
    const dist   = target - startY
    if (Math.abs(dist) < 1) return
    if (reduce) {
      lenisInstance.scrollTo(target, { immediate: true, lock: false, force: true })
      return
    }

    // Longer jumps take a little longer, capped so the rail never feels slow.
    const duration = Math.min(1400, 700 + (Math.abs(dist) / Math.max(1, limit)) * 1200)
    const startT   = performance.now()
    const easeOut  = (x: number) => 1 - Math.pow(1 - x, 5) // quint
    navTarget = id

    const step = (now: number) => {
      if (!lenisInstance) { scrollRafId = 0; navTarget = null; return }
      const p = Math.min(1, (now - startT) / duration)
      lenisInstance.scrollTo(startY + dist * easeOut(p), { immediate: true, lock: false, force: true })
      if (p < 1) {
        scrollRafId = requestAnimationFrame(step)
      } else {
        scrollRafId = 0
        navTarget = null
      }
    }
    scrollRafId = requestAnimationFrame(step)
    return
  }

  const el = document.getElementById(id)
  if (el) window.scrollTo({ top: el.offsetTop, behavior: reduce ? 'auto' : 'smooth' })
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

/** Linear fade band used by the right-hand station objects. */
function band(progress: number, t: number, half = 0.075, ramp = 0.035) {
  const dist = Math.abs(progress - t)
  return { dist, opacity: Math.max(0, Math.min(1, (half - dist) / ramp)) }
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD root
// ─────────────────────────────────────────────────────────────────────────────
export function TunnelHUD() {
  const progress = useScrollProgress()
  const station  = nearestStation(progress)

  return (
    <>
      {/* cinematic frame: above the canvas, below every HUD layer */}
      <div className={`vignette ${styles.vignetteLayer}`} aria-hidden="true" />

      <TopBar />
      <StationRail activeId={station.id} />
      <IntroMiniPlayer />

      <StationStage station={station} progress={progress} />

      <HeroPortrait progress={progress} />
      <AboutStatement progress={progress} />
      <ProjectsGallery progress={progress} />
      <ExperienceJourney progress={progress} />
      <ContactOrbit progress={progress} />

      <ScrollHint visible={progress < 0.03} />
      <Socials />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Chrome
// ─────────────────────────────────────────────────────────────────────────────
function TopBar() {
  const [sound, setSound] = useSound()
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  const goHome = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    scrollToStation('hero')
  }

  return (
    <header className={styles.topbar}>
      <a href="#hero" onClick={goHome} className={styles.wordmark}>Shah Fahad</a>

      <ProgressLine />

      <div className={styles.cluster}>
        <button type="button" onClick={() => setSound(!sound)} className={styles.chromeBtn}>
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
}

/** Hairline journey progress. Follows scroll continuously through a ref, so it
 *  never re-renders React. */
function ProgressLine() {
  const fillRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let raf  = 0
    let last = -1
    const tick = () => {
      const w = window as unknown as {
        __scrollRef?: { current: number }
        __lenis?:     { scroll: number; limit: number }
      }
      let cur = w.__scrollRef?.current ?? 0
      if (w.__lenis && w.__lenis.limit > 0) cur = w.__lenis.scroll / w.__lenis.limit
      cur = Math.min(1, Math.max(0, cur))
      if (fillRef.current && Math.abs(cur - last) > 0.0005) {
        last = cur
        fillRef.current.style.transform = `scaleX(${cur.toFixed(4)})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <span className={styles.progress} aria-hidden="true">
      <span ref={fillRef} className={styles.progressFill} />
    </span>
  )
}

function StationRail({ activeId }: { activeId: string }) {
  return (
    <nav aria-label="Stations" className={styles.rail}>
      <ol className={styles.railList}>
        {STATIONS.map((s) => {
          const active = s.id === activeId
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => scrollToStation(s.id)}
                aria-current={active ? 'step' : undefined}
                className={styles.railBtn}
              >
                <span className={styles.tick} aria-hidden="true" />
                {s.short}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function ScrollHint({ visible }: { visible: boolean }) {
  return (
    <div className={styles.scrollHint} data-visible={visible} aria-hidden="true">
      <span className="t-label">Scroll</span>
      <span className={styles.scrollLine} />
    </div>
  )
}

function Socials() {
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
}

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
  const proximity = Math.max(0, 1 - stationDist(progress, station) / 0.10)
  const opacity   = Math.pow(proximity, 1.1)
  const armed     = useArmed()
  const near      = useLatch(proximity, 0.35, 0.2)
  const isIn      = armed && near && (navTarget === null || navTarget === station.id)
  const live      = isIn && !leaving

  return (
    <section
      className={`${styles.panel} ${styles.reveal}`}
      data-in={isIn}
      data-leaving={leaving}
      style={{ opacity }}
      inert={!live}
    >
      <StationCard station={station} active={live} />
    </section>
  )
}

function StationCard({ station, active }: { station: StationDef; active: boolean }) {
  switch (station.id) {
    case 'hero':       return <HeroCard       station={station} />
    case 'about':      return <AboutCard      station={station} />
    case 'skills':     return <SkillsCard     station={station} />
    case 'opensource': return <OpenSourceCard station={station} active={active} />
    case 'experience': return <ExperienceCard station={station} />
    case 'contact':    return <ContactCard    station={station} />
    default:           return null
  }
}

/** Station title whose lines ("\n" in the copy) each rise out of a mask. */
function MaskedTitle({ text, as: Tag = 'h2', className }: { text: string; as?: 'h1' | 'h2'; className: string }) {
  const lines = text.split('\n')
  return (
    <Tag className={className}>
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
function HeroCard({ station }: { station: StationDef }) {
  return (
    <>
      <MaskedTitle as="h1" text={station.heading} className={`t-display ${styles.heroName}`} />
      <p className={`t-lead ${styles.lead} ${styles.heroLead} ${styles.rise}`} style={order(0)}>
        {station.tagline}
      </p>
      <div className={`${styles.actions} ${styles.rise} ${styles.hit}`} style={order(1)}>
        <a
          href="#projects"
          onClick={(e) => { e.preventDefault(); scrollToStation('projects') }}
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

function AboutCard({ station }: { station: StationDef }) {
  return (
    <>
      <MaskedTitle text={station.heading} className={`t-title ${styles.title}`} />
      <p className={`t-lead ${styles.lead} ${styles.rise}`} style={order(0)}>{station.tagline}</p>
      <ul className={`${styles.facts} ${styles.rise}`} style={order(1)}>
        <li className="t-data">8+ years</li>
        <li className="t-data">DigitalHire · Kistpay · Miletap</li>
        <li className="t-data">Karachi, PK</li>
      </ul>
    </>
  )
}

function SkillsCard({ station }: { station: StationDef }) {
  return (
    <>
      <MaskedTitle text={station.heading} className={`t-title ${styles.title}`} />
      <p className={`t-lead ${styles.lead} ${styles.rise}`} style={order(0)}>{station.tagline}</p>
      <p className={`t-label ${styles.hint} ${styles.rise}`} style={order(1)}>Select a skill to spin the orbit</p>
    </>
  )
}

// Long enough to read a PR title and its meta line before the next one.
const OS_AUTOPLAY_MS = 7000
const OS_MERGED = openSourceStats().merged

function OpenSourceCard({ station, active }: { station: StationDef; active: boolean }) {
  const [idx, setIdx]               = useState(0)
  const [hoverPaused, setHover]     = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const reduced = useReducedMotion()
  const n       = contributions.length
  const running = active && !hoverPaused && !userPaused && !reduced && n > 1

  // One timeout per card so a manual pick restarts the clock and the dot fill.
  useEffect(() => {
    if (!running) return
    const id = window.setTimeout(() => setIdx((i) => (i + 1) % n), OS_AUTOPLAY_MS)
    return () => window.clearTimeout(id)
  }, [running, idx, n])

  const [before, after = ''] = station.tagline.split('{n}')

  return (
    <>
      <MaskedTitle text={station.heading} className={`t-title ${styles.title}`} />
      <p className={`t-lead ${styles.lead} ${styles.rise}`} style={order(0)}>
        {before}
        {station.tagline.includes('{n}') && <span className={styles.leadNum}>{OS_MERGED}</span>}
        {after}
      </p>

      <div
        className={`${styles.surface} ${styles.prCard} ${styles.rise} ${styles.hit}`}
        style={order(1)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocusCapture={() => setHover(true)}
        onBlurCapture={() => setHover(false)}
      >
        <div className={styles.stack} aria-live={running ? 'off' : 'polite'}>
          {contributions.map((c, i) => {
            const on = i === idx
            return (
              <article key={c.id} className={styles.stackItem} data-active={on} aria-hidden={!on}>
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
                      key={`${idx}-${running}`}
                      className={styles.dotFill}
                      data-running={on && running}
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
    </>
  )
}

function ExperienceCard({ station }: { station: StationDef }) {
  const [ti, setTi] = useState(0)
  const n = testimonials.length
  const go = (d: number) => setTi((t) => (t + d + n) % n)

  return (
    <>
      <MaskedTitle text={station.heading} className={`t-title ${styles.title}`} />
      <p className={`t-lead ${styles.lead} ${styles.rise}`} style={order(0)}>{station.tagline}</p>

      <figure className={`${styles.surface} ${styles.quoteCard} ${styles.rise} ${styles.hit}`} style={order(1)}>
        <div className={styles.stack} aria-live="polite">
          {testimonials.map((q, i) => (
            <div key={q.name} className={styles.stackItem} data-active={i === ti} aria-hidden={i !== ti}>
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

function ContactCard({ station }: { station: StationDef }) {
  const call = station.cta?.href ?? 'https://cal.com/shahfahad'
  return (
    <>
      <MaskedTitle text={station.heading} className={`t-title ${styles.title}`} />
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
  const opacity = Math.pow(Math.max(0, 1 - stationDist(progress, FIRST) / 0.10), 1.1)
  if (opacity < 0.01) return null
  return (
    <div className={styles.portraitDock} style={{ opacity }} inert={opacity < 0.4}>
      <FlipPhotoCard />
    </div>
  )
}

function AboutStatement({ progress }: { progress: number }) {
  const { dist, opacity } = band(progress, T.about)
  const armed = useArmed()
  const near  = useLatch(opacity, 0.55, 0.35)
  if (dist > 0.08) return null
  return (
    <div className={`${styles.side} ${styles.reveal} ${styles.aboutSide}`} data-in={armed && near} style={{ opacity }} aria-hidden={!near}>
      <p className={`t-subtitle ${styles.statement} ${styles.rise}`} style={order(1)}>
        Clean code, real performance, interfaces that feel <span className={styles.ember}>alive.</span>
      </p>
    </div>
  )
}

// A readable project gallery takes over the station, then fades before OSS.
function ProjectsGallery({ progress }: { progress: number }) {
  const projectT  = T.projects
  const midpoint  = (projectT + T.opensource) / 2
  const distance  = Math.abs(progress - projectT)
  const approach  = Math.max(0, Math.min(1, (0.11 - distance) / 0.04))
  const departure = progress <= projectT ? 1 : Math.max(0, Math.min(1, (midpoint - progress) / 0.025))
  const opacity   = Math.min(approach, departure)
  if (opacity < 0.01) return null

  return (
    <div className={styles.gallery} style={{ opacity, pointerEvents: opacity > 0.4 ? 'auto' : 'none' }}>
      <ProjectShowcase />
    </div>
  )
}

// Experience: a quiet trajectory, newest role on top. The path draws in once
// when the station arrives; no floating, no flowing dashes.
const EJ_NODES = [{ x: 78, y: 10 }, { x: 40, y: 36 }, { x: 70, y: 62 }, { x: 34, y: 95 }]
const EJ_PATH  = 'M 78 10 C 55 20, 50 26, 40 36 S 78 52, 70 62 S 42 84, 34 95'

function ExperienceJourney({ progress }: { progress: number }) {
  // Experience (0.75) and contact (0.90) both use the right side; the tight
  // band hands off around their midpoint without overlap.
  const { dist, opacity } = band(progress, T.experience)
  const armed = useArmed()
  const near  = useLatch(opacity, 0.55, 0.35)
  if (dist > 0.08) return null
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
        const side = p.x > 50 ? 'left' : 'right'
        return (
          <div key={e.id} className={styles.node} data-current={e.current} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <span className={styles.nodeDot} />
            <div className={styles.nodeLabel} data-side={side}>
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

// Contact: the four real channels sit around the contact planet like
// satellites. Every node is a direct link (mailto, LinkedIn, GitHub, tel).
interface Channel { icon: IconType; label: string; href: string; aria: string; external: boolean; x: number; y: number }
const CHANNELS: Channel[] = [
  { icon: FaEnvelope,   label: 'Email',    href: `mailto:${AUTHOR.email}`,                 aria: `Email ${AUTHOR.email}`,                  external: false, x: 24, y: 24 },
  { icon: FaLinkedinIn, label: 'LinkedIn', href: SOCIALS.linkedin,                          aria: 'LinkedIn profile, opens in a new tab',   external: true,  x: 78, y: 30 },
  { icon: FaGithub,     label: 'GitHub',   href: SOCIALS.github,                            aria: 'GitHub profile, opens in a new tab',     external: true,  x: 22, y: 76 },
  { icon: FaPhone,      label: 'Phone',    href: `tel:${AUTHOR.phone.replace(/\s+/g, '')}`, aria: `Phone ${AUTHOR.phone}`,                  external: false, x: 78, y: 72 },
]

function ContactOrbit({ progress }: { progress: number }) {
  const { dist, opacity } = band(progress, T.contact)
  const armed = useArmed()
  const near  = useLatch(opacity, 0.55, 0.35)
  if (dist > 0.08) return null
  const isIn = armed && near

  return (
    <div
      className={`${styles.side} ${styles.reveal} ${styles.orbit}`}
      data-in={isIn}
      style={{ opacity }}
      inert={!near}
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
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

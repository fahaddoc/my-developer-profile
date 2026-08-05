'use client'

// MobileSpace — the mobile / touch / reduced-capability experience, rebuilt to
// match the desktop "space" tunnel identity. Combines five concepts picked in
// /lab: Starfield Parallax background (07), Station Rail (03), Mini-Nebula Hero
// (04), Scroll-Snap Planets (09), and Project Constellation w/ bottom sheet
// (12). All content is reused from the central data files — no duplication.

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useTheme } from '@/components/providers/ThemeProvider'
import { StarfieldBackground } from '@/components/mobile/StarfieldBackground'
import { projects, experience, skills } from '@/data/projects'
import { testimonials } from '@/data/testimonials'
import type { Project } from '@/data/projects'
import { FeaturedAchievement } from '@/components/featured/FeaturedAchievement'

// ── theme-adaptive accent helpers ─────────────────────────────────────────────
const A = 'rgb(var(--mob-accent))'
const Aa = (a: number) => `rgb(var(--mob-accent) / ${a})`
const TXT = 'rgb(var(--text-primary))'
const SUB = 'rgb(var(--text-secondary))'
const VIO = 'rgb(var(--accent-violet))'

const STATIONS = ['Intro', 'About', 'Skills', 'Work', 'Open Source', 'Exp', 'Contact']

// About narrative — mirrors the desktop/classic About story cards.
const STORY = [
  { label: 'Career', heading: 'The Professional Path', body: "6+ years building products people actually use — from MILETAP's real-time video platform to DigitalHire's modern hiring system. 4 companies, 9+ projects, 25+ clients." },
  { label: 'Passion', heading: 'What Drives Me', body: 'Real-time is where I come alive. WebRTC, SignalR, live video — the moment two people connect through infrastructure I built, that rush never gets old.' },
  { label: 'Human', heading: 'Behind the Code', body: "I debug best at 2am. I've shipped code that ran during a live TV broadcast. Based in Karachi — where the chai is strong and the internet is character-building." },
  { label: 'Vision', heading: "Where I'm Heading", body: 'AI-native interfaces, collaborative real-time tools, software that feels alive — making the interface between human and machine disappear.' },
]
const STATS = [
  { v: '6+', l: 'Years' }, { v: '9+', l: 'Projects' }, { v: '4+', l: 'Companies' }, { v: '25+', l: 'Clients' },
]

// Deterministic constellation coordinates (one per project, % of the field).
const NODE_XY: [number, number][] = [
  [50, 14], [79, 26], [23, 30], [66, 46], [33, 54],
  [82, 60], [16, 64], [52, 72], [72, 84], [30, 86],
]

// ═══════════════════════════════════════════════════════════════════════════
export default function MobileSpace() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stationEls = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [openProject, setOpenProject] = useState<Project | null>(null)

  const setStationRef = useCallback((i: number) => (el: HTMLElement | null) => {
    stationEls.current[i] = el
  }, [])

  // Parallax driver — push scrollTop into a CSS var (rAF-throttled).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--mob-scroll', String(el.scrollTop))
        raf = 0
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  // Active-station tracking for the rail + planet entrances.
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = stationEls.current.indexOf(e.target as HTMLElement)
            if (idx !== -1) setActive(idx)
          }
        })
      },
      { root, threshold: 0.55 },
    )
    stationEls.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  // Lock scroll behind the bottom sheet.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.style.overflowY = openProject ? 'hidden' : 'auto'
  }, [openProject])

  const goTo = (i: number) => {
    stationEls.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <StarfieldBackground />
      <TopBar />
      <StationRail active={active} onGo={goTo} />

      <div
        ref={scrollRef}
        className="mob-scroll"
        data-lenis-prevent
        style={{
          height: '100svh',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          scrollSnapType: 'y proximity',
          position: 'relative',
          zIndex: 1,
          background: 'transparent',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Station n={0} setRef={setStationRef(0)}><Hero active={active === 0} onWork={() => goTo(3)} /></Station>
        <Station n={1} setRef={setStationRef(1)}><About active={active === 1} /></Station>
        <Station n={2} setRef={setStationRef(2)}><Skills active={active === 2} /></Station>
        <Station n={3} setRef={setStationRef(3)}><Work active={active === 3} onOpen={setOpenProject} /></Station>
        <Station n={4} setRef={setStationRef(4)}><FeaturedAchievement active={active === 4} n={5} /></Station>
        <Station n={5} setRef={setStationRef(5)}><Exp active={active === 5} /></Station>
        <Station n={6} setRef={setStationRef(6)}><Contact active={active === 6} /></Station>
      </div>

      {openProject && <ProjectSheet project={openProject} onClose={() => setOpenProject(null)} />}

      <style jsx global>{`
        .mob-scroll::-webkit-scrollbar { display: none; }
        .mob-scroll { scrollbar-width: none; }
        @keyframes mob-planet-in { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes mob-fade-up { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes mob-drift { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes mob-orbit { to { transform: rotate(360deg); } }
        @keyframes mob-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes mob-quote { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .mob-scroll { scroll-snap-type: none; }
        }
      `}</style>
    </>
  )
}

// ── shell pieces ──────────────────────────────────────────────────────────────
function Station({ n, setRef, children }: { n: number; setRef: (el: HTMLElement | null) => void; children: React.ReactNode }) {
  return (
    <section
      ref={setRef}
      data-station={n}
      style={{
        minHeight: '100svh',
        scrollSnapAlign: 'start',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '84px 22px 64px 46px',
      }}
    >
      {children}
    </section>
  )
}

function Planet({ size, active, hue = 'teal', delay = 0 }: { size: number; active: boolean; hue?: 'teal' | 'violet'; delay?: number }) {
  const c = hue === 'teal' ? 'var(--mob-accent)' : 'var(--accent-violet)'
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 34% 30%, rgb(${c}), rgb(${c} / 0.15) 68%, transparent)`,
        boxShadow: `0 0 ${size * 0.55}px rgb(${c} / 0.45)`,
        border: `1px solid rgb(${c} / 0.4)`,
        animation: active ? `mob-planet-in 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s both` : 'none',
      }}
    />
  )
}

function Eyebrow({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.22em', color: A, textTransform: 'uppercase' }}>
      {String(n).padStart(2, '0')} · {label}
    </div>
  )
}

function TopBar() {
  const { theme, toggle } = useTheme()
  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        background: 'linear-gradient(rgb(var(--bg-base) / 0.7), transparent)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '0.18em', fontWeight: 700, color: TXT }}>
        SHAH FAHAD
      </span>
      <button
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center',
          background: Aa(0.08), border: `1px solid ${Aa(0.3)}`, color: A, cursor: 'pointer',
        }}
      >
        {theme === 'dark' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
        )}
      </button>
    </header>
  )
}

function StationRail({ active, onGo }: { active: number; onGo: (i: number) => void }) {
  return (
    <nav
      aria-label="Sections"
      style={{ position: 'fixed', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {STATIONS.map((label, i) => {
        const on = i === active
        return (
          <button
            key={label}
            onClick={() => onGo(i)}
            aria-label={`Go to ${label}`}
            aria-current={on}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span
              style={{
                width: on ? 11 : 7, height: on ? 11 : 7, borderRadius: '50%',
                background: on ? A : SUB, boxShadow: on ? `0 0 9px ${Aa(0.9)}` : 'none',
                transition: 'all 0.3s ease', flexShrink: 0,
              }}
            />
          </button>
        )
      })}
    </nav>
  )
}

// ── stations ────────────────────────────────────────────────────────────────
function Hero({ active, onWork }: { active: boolean; onWork: () => void }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
      {/* nebula rings + photo / intro centerpiece */}
      <MobilePhotoIntro active={active} />

      <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.24em', color: A }}>WELCOME TO MY SPACE</div>
      <h1 style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, fontSize: 'clamp(48px, 17vw, 84px)', lineHeight: 0.92, margin: '10px 0 0', color: TXT }}>
        SHAH<br /><span style={{ color: A }}>FAHAD</span>
      </h1>
      <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '0.14em', color: SUB, marginTop: 14 }}>SENIOR SOFTWARE ENGINEER</div>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: SUB, marginTop: 12, maxWidth: 360 }}>
        Building real-time, high-performance web &amp; mobile experiences from <span style={{ color: TXT }}>Karachi, Pakistan</span>.
      </p>

      <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
        <button onClick={onWork} style={ctaPrimary}>View work →</button>
        <a href="/Shah_Fahad_Resume.pdf" target="_blank" rel="noopener noreferrer" style={ctaGhost}>Resume</a>
      </div>
    </div>
  )
}

// Hero centerpiece — the sticker photo framed by nebula rings + teal glow.
// Tap flips to the intro video (mirrors the desktop FlipPhotoCard, touch-first).
function MobilePhotoIntro({ active }: { active: boolean }) {
  const [flipped, setFlipped] = useState(false)
  const [muted, setMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (flipped) {
      v.muted = muted
      v.play().catch(() => {})
    } else {
      v.pause()
      v.currentTime = 0
    }
  }, [flipped, muted])

  return (
    <div style={{ position: 'relative', alignSelf: 'center', marginBottom: 28, width: 224, height: 248, display: 'grid', placeItems: 'center' }}>
      {/* nebula rings */}
      {[224, 176, 132].map((s, i) => (
        <div key={s} aria-hidden="true" style={{
          position: 'absolute', left: '50%', top: '50%', width: s, height: s, transform: 'translate(-50%,-50%)',
          borderRadius: '50%', border: `1px solid ${Aa(0.16 - i * 0.04)}`,
        }} />
      ))}
      {/* glow */}
      <div aria-hidden="true" style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle, ${Aa(0.3)}, transparent 70%)`, filter: 'blur(28px)' }} />

      {/* flip card */}
      <div
        onClick={() => setFlipped((f) => !f)}
        role="button"
        aria-label={flipped ? 'Showing intro video. Tap to return to photo.' : 'Photo of Shah Fahad. Tap to play intro video.'}
        style={{
          position: 'relative', width: 150, height: 188, cursor: 'pointer',
          perspective: 800,
          animation: active ? 'mob-planet-in 0.7s cubic-bezier(0.22,1,0.36,1) both' : 'none',
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          {/* front — sticker photo */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            <Image
              src="/images/shah-fahad-sticker.png"
              alt="Shah Fahad — Senior Software Engineer"
              fill
              priority
              sizes="150px"
              style={{ objectFit: 'contain', objectPosition: 'bottom', filter: `drop-shadow(0 8px 12px rgb(0 0 0 / 0.45)) drop-shadow(0 0 18px ${Aa(0.55)})` }}
            />
          </div>
          {/* back — intro video */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <video
              ref={videoRef}
              poster="/videos/shah-intro-poster.png"
              playsInline
              preload="metadata"
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: `drop-shadow(0 8px 12px rgb(0 0 0 / 0.45)) drop-shadow(0 0 18px ${Aa(0.55)})` }}
            >
              <source src="/videos/shah-intro.webm" type="video/webm" />
              <source src="/videos/shah-intro.mov" type='video/mp4; codecs="hvc1"' />
              <source src="/videos/shah-intro.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </div>

      {/* affordance — play hint (front) / mute toggle (back) */}
      {!flipped ? (
        <div aria-hidden="true" style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: Aa(0.1), border: `1px solid ${Aa(0.32)}`, color: A, fontFamily: 'var(--font-mono), monospace', fontSize: 9, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
          ▶ tap for intro
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setMuted((m) => !m) }}
          aria-label={muted ? 'Unmute intro' : 'Mute intro'}
          style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: Aa(0.1), border: `1px solid ${Aa(0.32)}`, color: A, fontFamily: 'var(--font-mono), monospace', fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {muted ? '🔇 unmute' : '🔊 mute'}
        </button>
      )}
    </div>
  )
}

function About({ active }: { active: boolean }) {
  return (
    <div>
      <StationHead active={active} n={2} label="About" hue="violet">The <span style={{ color: A }}>story</span></StationHead>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
        {STORY.map((s) => (
          <div key={s.label} style={glassCard}>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, letterSpacing: '0.14em', color: A, textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TXT, marginTop: 3 }}>{s.heading}</div>
            <p style={{ fontSize: 12, lineHeight: 1.55, color: SUB, marginTop: 5 }}>{s.body}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {STATS.map((s) => (
          <div key={s.l} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 12, background: Aa(0.05), border: `1px solid ${Aa(0.14)}` }}>
            <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, fontSize: 18, color: A }}>{s.v}</div>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 8, color: SUB, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Skills({ active }: { active: boolean }) {
  return (
    <div>
      <StationHead active={active} n={3} label="Skills">The <span style={{ color: A }}>craft</span></StationHead>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
        {skills.map((cat) => (
          <div key={cat.label} style={glassCard}>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, letterSpacing: '0.12em', color: A, textTransform: 'uppercase', marginBottom: 8 }}>{cat.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cat.skills.map((sk) => (
                <span key={sk} style={chip}>{sk}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Work({ active, onOpen }: { active: boolean; onOpen: (p: Project) => void }) {
  const nodes = projects.slice(0, NODE_XY.length)
  const path = NODE_XY.map(([x, y]) => `${x},${y}`).join(' ')
  return (
    <div>
      <StationHead active={active} n={4} label="Work">Selected <span style={{ color: A }}>work</span></StationHead>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 3.6', marginTop: 14 }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <polyline points={path} fill="none" stroke={Aa(0.22)} strokeWidth="0.4" strokeDasharray="1.6 1.8" />
        </svg>
        {nodes.map((p, i) => {
          const [x, y] = NODE_XY[i]
          const big = p.featured
          const d = big ? 22 : 15
          return (
            <button
              key={p.id}
              onClick={() => onOpen(p)}
              aria-label={`Open ${p.title}`}
              style={{
                position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
                width: d, height: d, borderRadius: '50%', cursor: 'pointer', padding: 0,
                background: big ? A : Aa(0.4), border: `1px solid ${A}`,
                boxShadow: big ? `0 0 12px ${Aa(0.8)}` : `0 0 6px ${Aa(0.4)}`,
                animation: active ? `mob-planet-in 0.5s ease ${0.04 * i}s both` : 'none',
              }}
            >
              <span style={{ position: 'absolute', left: '50%', top: 'calc(100% + 3px)', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono), monospace', fontSize: 7.5, color: SUB, pointerEvents: 'none' }}>
                {p.company}
              </span>
            </button>
          )
        })}
      </div>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono), monospace', fontSize: 10, color: SUB, marginTop: 14, letterSpacing: '0.1em' }}>
        ✦ tap a node to open its case study
      </div>
    </div>
  )
}

function Exp({ active }: { active: boolean }) {
  const [ti, setTi] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTi((n) => (n + 1) % testimonials.length), 6000)
    return () => clearInterval(id)
  }, [])
  const t = testimonials[ti]
  return (
    <div>
      <StationHead active={active} n={6} label="Experience">The <span style={{ color: A }}>journey</span></StationHead>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 18 }}>
        {experience.map((e, i) => (
          <div key={e.id} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', marginTop: 4, background: e.current ? A : Aa(0.4), boxShadow: e.current ? `0 0 8px ${Aa(0.9)}` : 'none', border: `1px solid ${A}` }} />
              {i < experience.length - 1 && <span style={{ flex: 1, width: 1, background: Aa(0.25), margin: '4px 0' }} />}
            </div>
            <div style={{ paddingBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, color: A, letterSpacing: '0.08em' }}>{e.period}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: TXT, marginTop: 2 }}>{e.role}</div>
              <div style={{ fontSize: 11.5, color: SUB }}>{e.company}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                {e.tech.map((tt) => <span key={tt} style={{ ...chip, fontSize: 8.5, padding: '2px 7px' }}>{tt}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* rotating recommendation */}
      <div style={{ ...glassCard, marginTop: 4 }} key={ti}>
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, color: A, letterSpacing: '0.1em' }}>★ RECOMMENDATION</div>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: TXT, marginTop: 6, animation: 'mob-quote 0.5s ease' }}>&ldquo;{t.short}&rdquo;</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: TXT }}>{t.name}</div>
            <div style={{ fontSize: 8.5, color: SUB }}>{t.role}</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {testimonials.map((_, i) => <span key={i} style={{ width: i === ti ? 12 : 5, height: 5, borderRadius: 3, background: i === ti ? A : SUB, transition: 'all .3s' }} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function Contact({ active }: { active: boolean }) {
  const links = [
    { label: 'Email', val: 'hello@shahfahad.dev', href: 'mailto:hello@shahfahad.dev' },
    { label: 'GitHub', val: 'github.com/fahaddoc', href: 'https://github.com/fahaddoc' },
    { label: 'LinkedIn', val: 'in/fahaddoc600', href: 'https://www.linkedin.com/in/fahaddoc600' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ alignSelf: 'center', marginBottom: 22 }}><Planet size={70} active={active} /></div>
      <StationHead active={active} n={7} label="Contact">Let&apos;s <span style={{ color: A }}>connect</span></StationHead>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: SUB, marginTop: 12 }}>Open to opportunities and interesting problems. Reach out anywhere.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18, width: '100%' }}>
        {links.map((l) => (
          <a key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
            style={{ ...glassCard, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
            <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, color: A, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{l.label}</span>
            <span style={{ fontSize: 13, color: TXT }}>{l.val} →</span>
          </a>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9, color: SUB, marginTop: 26, alignSelf: 'center' }}>
        © 2026 Shah Fahad · built in space
      </div>
    </div>
  )
}

function StationHead({ active, n, label, hue = 'teal', children }: { active: boolean; n: number; label: string; hue?: 'teal' | 'violet'; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 14 }}><Planet size={56} active={active} hue={hue} /></div>
      <Eyebrow n={n} label={label} />
      <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, fontSize: 'clamp(30px, 9vw, 44px)', lineHeight: 1, margin: '8px 0 0', color: TXT }}>{children}</h2>
    </div>
  )
}

// ── project bottom sheet ──────────────────────────────────────────────────────
function ProjectSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgb(0 0 0 / 0.5)', display: 'flex', alignItems: 'flex-end' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '86svh', overflowY: 'auto',
          borderRadius: '22px 22px 0 0', background: 'rgb(var(--bg-surface) / 0.97)',
          border: `1px solid ${Aa(0.22)}`, borderBottom: 'none', padding: '14px 20px 30px',
          animation: 'mob-sheet-up 0.34s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: `0 -20px 60px rgb(0 0 0 / 0.5)`,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: SUB, margin: '0 auto 16px', cursor: 'grab' }} onClick={onClose} />

        {/* mesh cover */}
        <div style={{ height: 96, borderRadius: 14, overflow: 'hidden', position: 'relative', marginBottom: 14 }}>
          <div style={{
            position: 'absolute', inset: '-45%', filter: 'blur(16px)',
            background: `conic-gradient(from 0deg, ${project.color}, ${A}, ${VIO}, ${project.color})`,
            animation: 'mob-orbit 8s linear infinite',
          }} />
          <Image src={project.image} alt={project.title} fill style={{ objectFit: 'cover', opacity: 0.9 }} sizes="100vw" />
        </div>

        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, color: A, letterSpacing: '0.12em' }}>{project.company} · {project.year}</div>
        <h3 style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, fontSize: 22, color: TXT, margin: '4px 0 6px' }}>{project.title}</h3>
        <p style={{ fontSize: 13, color: SUB, lineHeight: 1.5 }}>{project.tagline}</p>
        <p style={{ fontSize: 13, color: TXT, lineHeight: 1.6, marginTop: 12 }}>{project.description}</p>

        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, color: A, letterSpacing: '0.12em', marginTop: 16, textTransform: 'uppercase' }}>Highlights</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {project.features.slice(0, 4).map((f, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: SUB, lineHeight: 1.45 }}>
              <span style={{ color: A, flexShrink: 0 }}>▹</span>{f}
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
          {project.tech.map((t) => <span key={t} style={chip}>{t}</span>)}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" style={{ ...ctaPrimary, flex: 1, textAlign: 'center' }}>Live ↗</a>
          )}
          <button onClick={onClose} style={{ ...ctaGhost, flex: project.liveUrl ? 0 : 1 }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── shared inline styles ──────────────────────────────────────────────────────
const glassCard: React.CSSProperties = {
  borderRadius: 14, padding: 14,
  background: 'rgb(var(--bg-surface) / 0.45)', backdropFilter: 'blur(8px)',
  border: `1px solid ${Aa(0.16)}`,
}
const chip: React.CSSProperties = {
  fontFamily: 'var(--font-mono), monospace', fontSize: 10, padding: '4px 9px', borderRadius: 999,
  background: Aa(0.07), border: `1px solid ${Aa(0.22)}`, color: 'rgb(var(--text-primary) / 0.85)',
}
const ctaPrimary: React.CSSProperties = {
  padding: '11px 20px', borderRadius: 12, background: A, color: 'rgb(var(--bg-base))',
  fontFamily: 'var(--font-mono), monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  textDecoration: 'none', border: 'none', cursor: 'pointer',
}
const ctaGhost: React.CSSProperties = {
  padding: '11px 20px', borderRadius: 12, background: 'transparent', color: A,
  fontFamily: 'var(--font-mono), monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  textDecoration: 'none', border: `1px solid ${Aa(0.4)}`, cursor: 'pointer',
}

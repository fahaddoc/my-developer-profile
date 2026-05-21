'use client'

// TunnelHUD — full chrome overlay for the WebGL tunnel.
// Station content lives HERE now (as flat HTML overlay panels), not inside
// the 3D scene. That kills the old collision between drei <Html> and the
// passing tunnel rings.

import {
  STATIONS,
  nearestStation,
  useScrollProgress,
  useSound,
  hexAlpha,
  type StationDef,
} from '@/components/r3f/TunnelScene'
import { IntroMiniPlayer } from '@/components/r3f/IntroMiniPlayer'
import { lenisInstance } from '@/components/providers/SmoothScroll'
import { useTheme } from '@/components/providers/ThemeProvider'
import { experience } from '@/data/projects'

// Lenis hijacks native scroll, so el.scrollIntoView({behavior:'smooth'})
// gets cancelled mid-animation. Use lenis.scrollTo when available so the
// nav clicks actually glide to the target station.
// Track the active scroll animation so a second click cancels the first
let scrollRafId = 0

function scrollToStation(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const target = el.offsetTop

  // Always cancel any in-flight animation first
  if (scrollRafId) { cancelAnimationFrame(scrollRafId); scrollRafId = 0 }

  if (lenisInstance) {
    // Lenis was measured before TunnelMode rendered its 500vh spacer, so
    // its limit may be stale on first nav click. Refresh dimensions.
    lenisInstance.resize()

    const startY = lenisInstance.scroll
    const dist   = target - startY
    if (Math.abs(dist) < 1) return

    const duration = 900
    const startT   = performance.now()
    const easeOut  = (t: number) => 1 - Math.pow(1 - t, 3)

    const step = (now: number) => {
      // Bail out if a newer scroll started or Lenis disappeared
      if (!lenisInstance) { scrollRafId = 0; return }
      const p = Math.min(1, (now - startT) / duration)
      const y = startY + dist * easeOut(p)
      lenisInstance.scrollTo(y, { immediate: true, lock: false, force: true })
      if (p < 1) {
        scrollRafId = requestAnimationFrame(step)
      } else {
        scrollRafId = 0
      }
    }
    scrollRafId = requestAnimationFrame(step)
  } else {
    window.scrollTo({ top: target, behavior: 'smooth' })
  }
}

export function TunnelHUD() {
  const progress = useScrollProgress()
  const station  = nearestStation(progress)
  const [sound, setSound] = useSound()
  const { theme, toggle: toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const accent = station.color

  return (
    <>
      {/* ─── top-left: SF logo + portfolio strip ──────────────────────── */}
      <div
        style={{
          position: 'fixed', top: 22, left: 32, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 18,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          color: 'rgb(var(--text-primary))', fontSize: 11, letterSpacing: '0.25em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-display), system-ui, sans-serif',
          fontSize: 18, fontWeight: 800, color: accent,
          textShadow: `0 0 10px ${hexAlpha(accent, 0.5)}`,
          letterSpacing: '-0.02em',
        }}>
          SF
        </span>
        <span style={{ fontWeight: 700 }}>SHAH FAHAD</span>
        <span style={{ color: 'rgb(var(--text-primary) / 0.4)' }}>|</span>
        <span style={{ color: 'rgb(var(--text-primary) / 0.55)' }}>PORTFOLIO</span>
      </div>

      {/* ─── top-center: SCROLL TO EXPLORE + dashes ───────────────────── */}
      <div
        style={{
          position: 'fixed', top: 22, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50, pointerEvents: 'none',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          color: 'rgb(var(--text-primary))', fontSize: 11, letterSpacing: '0.25em',
          textTransform: 'uppercase',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}
      >
        <span>SCROLL TO EXPLORE</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {STATIONS.map((s, i) => {
            const active = progress >= s.t - (1 / STATIONS.length) * 0.6
            const here   = i === Math.floor(progress * STATIONS.length)
            return (
              <span key={s.id} style={{
                width: here ? 28 : 18, height: 2,
                background: active ? accent : 'rgba(255,255,255,0.22)',
                boxShadow:  active ? `0 0 6px ${accent}aa` : 'none',
                transition: 'background 200ms, box-shadow 200ms, width 220ms',
                display: 'inline-block',
              }} />
            )
          })}
        </div>
      </div>

      {/* ─── top-right: SOUND toggle + THEME toggle ───────────────────── */}
      <button
        type="button"
        onClick={() => setSound(!sound)}
        aria-label={sound ? 'Mute sound' : 'Enable sound'}
        aria-pressed={sound}
        style={{
          position: 'fixed', top: 22, right: 32, zIndex: 50,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: sound ? accent : 'rgb(var(--text-primary) / 0.55)',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 10,
          pointerEvents: 'auto', padding: 0,
        }}
      >
        <SoundIcon active={sound} color={accent} />
        SOUND {sound ? 'ON' : 'OFF'}
      </button>

      {/* THEME toggle — sits to the left of SOUND */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        style={{
          position: 'fixed', top: 22, right: 168, zIndex: 50,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'rgb(var(--text-primary) / 0.55)',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 10,
          pointerEvents: 'auto', padding: 0,
          transition: 'color 200ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = accent }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgb(var(--text-primary) / 0.55)' }}
      >
        {isDark ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        )}
        {isDark ? 'DARK' : 'LIGHT'}
      </button>

      {/* ─── left rail: vertical station step indicator ───────────────── */}
      <nav
        aria-label="Tunnel stations"
        style={{
          position: 'fixed', left: 32, top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 40,
          display: 'flex', flexDirection: 'column', gap: 28,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
        }}
      >
        {STATIONS.map((s) => {
          const isActive = s.id === station.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollToStation(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 0, textAlign: 'left',
                color: isActive ? 'rgb(var(--text-primary))' : 'rgb(var(--text-primary) / 0.4)',
                transition: 'color 220ms',
                pointerEvents: 'auto',
              }}
            >
              <span style={{
                width: 12, height: 12, borderRadius: '50%',
                background: isActive ? accent : 'transparent',
                border: `1px solid ${isActive ? accent : 'rgb(var(--text-primary) / 0.35)'}`,
                boxShadow: isActive ? `0 0 10px ${hexAlpha(accent, 0.7)}` : 'none',
                transition: 'all 220ms',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11, fontWeight: 600,
                letterSpacing: '0.28em',
                color: isActive ? accent : 'rgb(var(--text-primary) / 0.5)',
              }}>{s.short}</span>
            </button>
          )
        })}
      </nav>

      {/* ─── floating intro mini-player (top-right, below SOUND) ──────── */}
      <IntroMiniPlayer accent={accent} />

      {/* ─── center: station content overlay ──────────────────────────── */}
      <StationOverlay station={station} progress={progress} />

      {/* ─── bottom-center: SCROLL DOWN + mouse icon ──────────────────── */}
      <div
        style={{
          position: 'fixed', bottom: 24, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50, pointerEvents: 'none',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 10, letterSpacing: '0.3em',
          color: 'rgb(var(--text-primary) / 0.7)',
          textTransform: 'uppercase',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}
      >
        <MouseScrollIcon color={accent} />
        <span>SCROLL DOWN</span>
      </div>

      {/* ─── bottom-left: FOLLOW ME + socials ─────────────────────────── */}
      <div
        style={{
          position: 'fixed', bottom: 28, left: 32, zIndex: 50,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          color: 'rgb(var(--text-primary) / 0.55)',
          fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <span>FOLLOW ME</span>
        <div style={{ display: 'flex', gap: 14, pointerEvents: 'auto' }}>
          <SocialLink href="https://github.com/fahaddoc"               label="GitHub"   color={accent}>{IconGithub}</SocialLink>
          <SocialLink href="https://www.linkedin.com/in/fahaddoc600"   label="LinkedIn" color={accent}>{IconLinkedin}</SocialLink>
          <SocialLink href="mailto:hello@shahfahad.dev"                label="Email"    color={accent}>{IconMail}</SocialLink>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StationOverlay — left-positioned content panel that updates per station
// ─────────────────────────────────────────────────────────────────────────────
function StationOverlay({ station, progress }: { station: StationDef; progress: number }) {
  const dist    = Math.abs(progress - station.t)
  const opacity = Math.pow(Math.max(0, 1 - dist / 0.10), 1.1)

  return (
    <div
      key={station.id}
      style={{
        position: 'fixed',
        left:     '11vw',
        top:      '50%',
        transform: 'translateY(-50%)',
        zIndex:   30,
        maxWidth: 540,
        width:    'min(46vw, 540px)',
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 200ms',
        color: 'rgb(var(--text-primary))',
      }}
    >
      {renderCard(station)}
    </div>
  )
}

function renderCard(s: StationDef) {
  switch (s.id) {
    case 'hero':       return <HeroCard       station={s} />
    case 'about':      return <AboutCard      station={s} />
    case 'projects':   return <ProjectsCard   station={s} />
    case 'experience': return <ExperienceCard station={s} />
    case 'contact':    return <ContactCard    station={s} />
  }
  return null
}

// ── Shared style helpers ───────────────────────────────────────────────────
const eyebrow = (color: string) => ({
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
  fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase' as const,
  color, marginBottom: 18,
  textShadow: 'var(--eyebrow-shadow)',
})

const heading = {
  fontFamily: 'var(--font-display), ui-sans-serif, system-ui, sans-serif',
  fontSize: 56, fontWeight: 800 as const, lineHeight: 1.04,
  letterSpacing: '-0.02em', color: 'rgb(var(--text-primary))',
  margin: '0 0 22px',
  textShadow: 'var(--heading-shadow)',
}

const tagline = {
  fontFamily: 'var(--font-body), ui-sans-serif, system-ui, sans-serif',
  fontSize: 16, lineHeight: 1.55, color: 'rgb(var(--text-primary) / 0.78)',
  margin: '0 0 22px', maxWidth: 480,
  textShadow: 'var(--body-shadow)',
}

const ctaBtn = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 10,
  padding: '14px 22px',
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
  fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase',
  fontWeight: 700,
  color: '#0A0A12', background: color,
  border: `1px solid ${color}`,
  borderRadius: 4, textDecoration: 'none',
  boxShadow: `0 0 24px ${hexAlpha(color, 0.4)}`,
  pointerEvents: 'auto',
})

const ctaBtnGhost = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 10,
  padding: '14px 22px',
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
  fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase',
  fontWeight: 700,
  color, background: 'transparent',
  border: `1px solid ${hexAlpha(color, 0.45)}`,
  borderRadius: 4, textDecoration: 'none',
  pointerEvents: 'auto',
})

// ─────────────────────────────────────────────────────────────────────────────
// Per-station cards
// ─────────────────────────────────────────────────────────────────────────────

function HeroCard({ station }: { station: StationDef }) {
  // Photo/video card lives in the 3D tunnel centre now (rendered by
  // TunnelScene's HeroPortrait3D), not in this side panel.
  return (
    <>
      <div style={eyebrow(station.color)}>{station.subtitle}</div>
      <h1 style={{
        ...heading,
        fontSize: 92,
        lineHeight: 0.95,
        textTransform: 'uppercase',
        marginBottom: 24,
      }}>
        <span style={{ color: 'rgb(var(--text-primary))', display: 'block' }}>SHAH</span>
        <span style={{
          color: station.color,
          textShadow: `0 0 18px ${hexAlpha(station.color, 0.45)}`,
          display: 'block',
        }}>FAHAD</span>
      </h1>
      <div style={{
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase',
        color: station.color, marginBottom: 14,
      }}>
        SENIOR SOFTWARE ENGINEER
      </div>
      <div style={{
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 12, letterSpacing: '0.18em',
        color: 'rgb(var(--text-primary) / 0.85)', marginBottom: 24,
      }}>
        REACT &nbsp;·&nbsp; NEXT.JS &nbsp;·&nbsp; FLUTTER &nbsp;·&nbsp; WEBRTC
      </div>
      <p style={{ ...tagline, marginBottom: 28 }}>
        Building real-time, high-performance and scalable digital experiences
        from <span style={{ color: station.color }}>Karachi, Pakistan.</span>
      </p>
      <a
        href="#about"
        onClick={(e) => {
          e.preventDefault()
          scrollToStation('about')
        }}
        style={ctaBtn(station.color)}
      >
        Start Journey <span style={{ fontSize: 13 }}>→</span>
      </a>
    </>
  )
}

function AboutCard({ station }: { station: StationDef }) {
  const stats = [
    { v: '6+',  l: 'YEARS'     },
    { v: '4',   l: 'COMPANIES' },
    { v: '9+',  l: 'PROJECTS'  },
    { v: '25+', l: 'CLIENTS'   },
  ]
  const tech = ['React', 'Next.js', 'TypeScript', 'Flutter', 'WebRTC', 'SignalR']
  return (
    <>
      <div style={eyebrow(station.color)}>{station.subtitle}</div>
      <h2 style={heading}>{station.heading}</h2>
      <p style={tagline}>
        6+ years building products people actually use — from MILETAP&apos;s
        real-time video platform to DigitalHire&apos;s hiring system.
      </p>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, auto)',
        gap: 18, marginBottom: 24,
      }}>
        {stats.map((s) => (
          <div key={s.l} style={{
            paddingTop: 10, borderTop: `1px solid ${hexAlpha(station.color, 0.35)}`,
          }}>
            <div style={{
              fontFamily: 'var(--font-display), system-ui, sans-serif',
              fontSize: 32, fontWeight: 800, color: 'rgb(var(--text-primary))',
              lineHeight: 1, letterSpacing: '-0.02em',
            }}>{s.v}</div>
            <div style={{
              marginTop: 6, fontFamily: 'var(--font-mono), monospace',
              fontSize: 9, letterSpacing: '0.28em', color: 'rgb(var(--text-primary) / 0.55)',
            }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tech.map((t) => (
          <span key={t} style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'rgb(var(--text-primary) / 0.7)',
            padding: '5px 11px',
            border: `1px solid ${hexAlpha(station.color, 0.3)}`,
            borderRadius: 3,
          }}>{t}</span>
        ))}
      </div>
    </>
  )
}

function ProjectsCard({ station }: { station: StationDef }) {
  return (
    <>
      <div style={eyebrow(station.color)}>{station.subtitle}</div>
      <h2 style={heading}>{station.heading}</h2>
      <p style={tagline}>{station.tagline}</p>
      <div style={{
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: hexAlpha(station.color, 0.7), marginBottom: 22,
      }}>
        → tap any thumbnail in the tunnel to open its case study
      </div>
      <a
        href="#projects"
        style={ctaBtnGhost(station.color)}
        onClick={(e) => { e.preventDefault() }}
      >
        view all projects
      </a>
    </>
  )
}

function ExperienceCard({ station }: { station: StationDef }) {
  const entries = experience.slice(0, 3)
  return (
    <>
      <div style={eyebrow(station.color)}>{station.subtitle}</div>
      <h2 style={heading}>{station.heading}</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {entries.map((e) => (
          <li key={e.id} style={{
            padding: '14px 0',
            borderTop: `1px solid ${hexAlpha(station.color, 0.25)}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 18,
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase',
                color: station.color, marginBottom: 4,
              }}>{e.company}</div>
              <div style={{
                fontFamily: 'var(--font-display), system-ui, sans-serif',
                fontSize: 17, fontWeight: 700, color: 'rgb(var(--text-primary))',
              }}>{e.role}</div>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 10, letterSpacing: '0.16em',
              color: 'rgb(var(--text-primary) / 0.6)', whiteSpace: 'nowrap',
            }}>{e.period}{e.current && ' · NOW'}</div>
          </li>
        ))}
      </ul>
    </>
  )
}

function ContactCard({ station }: { station: StationDef }) {
  return (
    <>
      <div style={eyebrow(station.color)}>{station.subtitle}</div>
      <h2 style={heading}>{station.heading}</h2>
      <div style={{
        margin: '0 0 28px',
        display: 'flex', flexDirection: 'column', gap: 6,
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 14, letterSpacing: '0.06em',
      }}>
        <span style={{ color: 'rgb(var(--text-primary))' }}>hello@shahfahad.dev</span>
        <span style={{ color: 'rgb(var(--text-primary) / 0.65)' }}>+92 304 2186009</span>
        <span style={{ color: 'rgb(var(--text-primary) / 0.65)' }}>Karachi, Pakistan</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a href="https://cal.com/shahfahad"   target="_blank" rel="noopener noreferrer" style={ctaBtn(station.color)}>
          Book a 15-min call →
        </a>
        <a href="mailto:hello@shahfahad.dev" style={ctaBtnGhost(station.color)}>
          Send a message →
        </a>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline icons
// ─────────────────────────────────────────────────────────────────────────────

function SoundIcon({ active, color }: { active: boolean; color: string }) {
  const heights = [6, 10, 14, 10, 6]
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
      {heights.map((h, i) => (
        <rect
          key={i} x={i * 4 + 1} y={(14 - h) / 2}
          width={2} height={h} rx={1}
          fill={active ? color : 'rgb(var(--text-primary) / 0.4)'}
        >
          {active && (
            <animate attributeName="height"
              values={`${h};${h * 0.4};${h}`}
              dur={`${0.7 + i * 0.15}s`} repeatCount="indefinite" />
          )}
        </rect>
      ))}
    </svg>
  )
}

function MouseScrollIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="28" viewBox="0 0 18 28" aria-hidden="true">
      <rect x={1} y={1} width={16} height={26} rx={8}
        fill="none" stroke={color} strokeOpacity={0.55} strokeWidth={1} />
      <circle cx={9} cy={9} r={1.6} fill={color}>
        <animate attributeName="cy" values="9;14;9" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function SocialLink({
  href, label, color, children,
}: {
  href: string; label: string; color: string; children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target={href.startsWith('mailto:') ? undefined : '_blank'}
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        color: 'rgb(var(--text-primary) / 0.55)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 4,
        border: '1px solid rgb(var(--text-primary) / 0.15)',
        transition: 'color 200ms, border-color 200ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color       = color
        e.currentTarget.style.borderColor = hexAlpha(color, 0.5)
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color       = 'rgb(var(--text-primary) / 0.55)'
        e.currentTarget.style.borderColor = 'rgb(var(--text-primary) / 0.15)'
      }}
    >
      {children}
    </a>
  )
}

const IconGithub = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
)

const IconLinkedin = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

const IconMail = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

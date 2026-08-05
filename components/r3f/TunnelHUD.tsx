'use client'

// TunnelHUD — full chrome overlay for the WebGL tunnel.
// Station content lives HERE now (as flat HTML overlay panels), not inside
// the 3D scene. That kills the old collision between drei <Html> and the
// passing tunnel rings.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FaGithub, FaLinkedinIn, FaEnvelope, FaPhone } from 'react-icons/fa6'
import type { IconType } from 'react-icons'
import { contributions } from '@/data/open-source'
import { FlutterLogo, GitHubLogo, MergedGlyph } from '@/components/featured/BrandLogos'
import {
  STATIONS,
  nearestStation,
  useScrollProgress,
  useSound,
  hexAlpha,
  type StationDef,
} from '@/components/r3f/TunnelScene'
import { IntroMiniPlayer } from '@/components/r3f/IntroMiniPlayer'
import { FlipPhotoCard } from '@/components/r3f/FlipPhotoCard'
import { lenisInstance } from '@/components/providers/SmoothScroll'
import { useTheme } from '@/components/providers/ThemeProvider'
import { experience, projects } from '@/data/projects'
import { testimonials } from '@/data/testimonials'

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
        aria-label={sound ? 'Stop intro video' : 'Play intro video'}
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
        <svg width="11" height="11" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
          {sound
            ? <rect x="1.6" y="1.6" width="6.8" height="6.8" rx="1.2" />
            : <path d="M2.2 1.3v7.4l6-3.7z" />}
        </svg>
        {sound ? 'INTRO ON' : 'PLAY INTRO'}
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

      {/* ─── right: hero portrait (only fades in on INTRO) ────────────── */}
      <HeroSidePhoto progress={progress} accent={accent} />

      {/* ─── right: projects grid (only fades in on PROJECTS) ─────────── */}
      <AboutStory progress={progress} />
      <ProjectsConstellation progress={progress} />
      <ExperienceJourney progress={progress} />
      <ContactOrbit progress={progress} />

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
        // The left nav rail is a fixed ~160px-wide column (longest label
        // "EXPERIENCE"). 11vw alone is only ~158px on a 1440 screen, so the
        // card collides with the nav labels there — clamp to a hard 190px floor.
        left:     'max(190px, 11vw)',
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

// ─────────────────────────────────────────────────────────────────────────────
// HeroSidePhoto — fixed right-side portrait, mirrors StationOverlay's
// left-side text. Only fades in when camera is at the INTRO station (hero, t≈0.04).
// ─────────────────────────────────────────────────────────────────────────────
function HeroSidePhoto({ progress, accent }: { progress: number; accent: string }) {
  const HERO_T = 0.04
  const dist    = Math.abs(progress - HERO_T)
  const opacity = Math.pow(Math.max(0, 1 - dist / 0.10), 1.1)

  if (opacity < 0.01) return null

  return (
    <div
      style={{
        position: 'fixed',
        right:    '4vw',
        top:      '50%',
        transform: 'translateY(-50%)',
        zIndex:   30,
        width:    'min(40vw, 460px)',
        pointerEvents: 'auto',
        opacity,
        transition: 'opacity 200ms',
      }}
    >
      <FlipPhotoCard accent={accent} width={460} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ProjectsConstellation — projects rendered as glowing nodes wired to a central
// hub on the right half of the screen. Autoplays through the projects; hovering
// any node pins it (autoplay pauses) and surfaces its detail card. Click a node
// or the CTA to open the full project drawer.
// ─────────────────────────────────────────────────────────────────────────────

// Node layout in % of the constellation box. The detail card sits on the LEFT
// of the box (≈ screen centre); the hub + node thumbnails ring the RIGHT, so
// nodes stay clear of the card (min x ≈ 52%).
const CN_HUB   = { x: 58, y: 50 }
// Depth cloud — nodes scattered around the card at varying DEPTH (d: 0..1).
// Closer (higher d) = bigger, brighter, on top; farther = smaller, dimmer.
// Kept off the card's centre (it spans ~43–73% x) — clustered left / top / bottom / right.
const CN_NODES = [
  { x: 88, y: 30, d: 0.95 }, { x: 92, y: 64, d: 0.55 }, { x: 78, y: 86, d: 0.85 },
  { x: 70, y: 12, d: 0.5 },  { x: 30, y: 22, d: 0.7 },  { x: 17, y: 52, d: 1.0 },
  { x: 27, y: 82, d: 0.55 }, { x: 46, y: 91, d: 0.8 },  { x: 50, y: 8,  d: 0.45 },
]
// Autoplay cadence. A literal quarter-second strobes too fast to read the card,
// so it sits at a readable pace — tweak this single value to taste.
const CN_AUTOPLAY_MS = 2600

function ProjectsConstellation({ progress }: { progress: number }) {
  const PROJECTS_T = STATIONS.find((s) => s.id === 'projects')?.t ?? 0.55
  const OSS_T      = STATIONS.find((s) => s.id === 'opensource')?.t ?? 0.63
  const mid        = (PROJECTS_T + OSS_T) / 2   // 0.59 — where the OSS card takes over
  const dist       = Math.abs(progress - PROJECTS_T)
  // ASYMMETRIC fade. The SKILLS side (0.35) is far, so give a generous approach
  // there. The OSS side (0.63) is close, so HARD-cut: the constellation must be
  // fully gone by `mid` (0.59), BEFORE the OSS station card appears — otherwise
  // the projects cards bleed into OSS (they did in the 0.59–0.62 handoff zone).
  const base       = Math.max(0, Math.min(1, (0.11 - dist) / 0.04))
  const rightClamp = progress <= PROJECTS_T ? 1 : Math.max(0, Math.min(1, (mid - progress) / 0.025))
  const cardOp     = Math.min(base, rightClamp)
  const ambient    = Math.min(Math.max(0, Math.min(1, (0.10 - dist) / 0.045)), rightClamp)
  const near       = cardOp > 0.4

  const pool = [...projects]
    .sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false))
    .slice(0, 9)

  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  // Autoplay — only advances while the station is in view and not hovered.
  useEffect(() => {
    if (!near || paused) return
    const id = setInterval(() => {
      setActive((a) => (a + 1) % pool.length)
    }, CN_AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [near, paused, pool.length])

  if (progress > mid || dist > 0.11) return null

  const ACCENT   = '#5EEAD4'
  const catLabel = (c: string) =>
    c === 'mobile' ? 'MOBILE' : c === 'realtime' ? 'REAL-TIME' : 'WEB'
  const openDrawer = (id: string) =>
    window.dispatchEvent(new CustomEvent('project-drawer-open', { detail: id }))

  const p = pool[active]

  return (
    <div
      onMouseLeave={() => setPaused(false)}
      style={{
        position: 'fixed',
        right:    0,
        top:      '50%',
        transform: 'translateY(-50%)',
        width:    'min(64vw, 980px)',
        height:   'min(86vh, 700px)',
        zIndex:   30,
        pointerEvents: near ? 'auto' : 'none',
      }}
    >
      <style>{`
        @keyframes cn-pulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.85} 50%{transform:translate(-50%,-50%) scale(1.16);opacity:1} }
        @keyframes cn-bar   { from{width:0%} to{width:100%} }
        @keyframes cn-fade  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cn-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
      `}</style>

      {/* connector lines hub → nodes */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: ambient, transition: 'opacity 220ms' }}>
        {CN_NODES.map((n, i) => (
          <line key={i}
            x1={`${CN_HUB.x}%`} y1={`${CN_HUB.y}%`} x2={`${n.x}%`} y2={`${n.y}%`}
            stroke={i === active ? ACCENT : 'rgba(94,234,212,0.16)'}
            strokeWidth={i === active ? 1.5 : 0.8}
            strokeDasharray={i === active ? '0' : '3 5'}
            style={{ transition: 'stroke .35s, stroke-width .35s' }} />
        ))}
      </svg>

      {/* centre energy glow behind the card — the card itself is the hub now */}
      <div style={{
        position: 'absolute', left: `${CN_HUB.x}%`, top: '50%', transform: 'translate(-50%,-50%)',
        width: 420, height: 420, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${ACCENT}24, transparent 70%)`,
        opacity: ambient, transition: 'opacity 220ms',
      }} />

      {/* node thumbnails — a DEPTH CLOUD: each node's size + opacity + stacking
          comes from its depth `d`, so they read as floating at different distances */}
      {CN_NODES.map((n, i) => {
        const it = pool[i]
        const on = i === active
        const w  = Math.round(50 + n.d * 52)        // 50–102px wide by depth
        const baseOp = 0.4 + n.d * 0.6              // farther = dimmer
        return (
          <button key={it.id}
            onMouseEnter={() => { setActive(i); setPaused(true) }}
            onFocus={() => { setActive(i); setPaused(true) }}
            onClick={() => openDrawer(it.id)}
            aria-label={`Open ${it.title} case study`}
            style={{
              position: 'absolute', left: `${n.x}%`, top: `${n.y}%`,
              transform: 'translate(-50%,-50%)',
              width: w, height: Math.round(w * 0.76), padding: 0, border: 'none', background: 'transparent',
              cursor: 'pointer', zIndex: on ? 12 : Math.round(n.d * 6) + 2,
            }}>
            {/* depth layer — opacity + active pop */}
            <div style={{
              width: '100%', height: '100%',
              opacity: (on ? 1 : baseOp) * ambient,
              transform: `scale(${on ? 1.08 : 1})`,
              transition: 'opacity .25s, transform .35s cubic-bezier(.16,1,.3,1)',
            }}>
              {/* floating layer — gentle bob, desynced per node */}
              <div style={{
                position: 'relative', width: '100%', height: '100%',
                borderRadius: 11, overflow: 'hidden', background: '#0a0e1a',
                border: on ? `1.5px solid ${ACCENT}` : '1px solid rgba(94,234,212,0.26)',
                boxShadow: on
                  ? `0 0 24px ${ACCENT}99, 0 12px 28px rgba(0,0,0,0.6)`
                  : '0 8px 20px rgba(0,0,0,0.5)',
                transition: 'border-color .3s, box-shadow .3s',
                animation: `cn-float ${(3.6 + (i % 3) * 0.9).toFixed(1)}s ease-in-out ${(-i * 0.6).toFixed(1)}s infinite`,
              }}>
                <img src={it.image} alt="" draggable={false}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: on
                  ? 'linear-gradient(180deg, rgba(5,8,16,0.04), rgba(5,8,16,0.42))'
                  : 'linear-gradient(180deg, rgba(5,8,16,0.28), rgba(5,8,16,0.64))' }} />
                <span style={{
                  position: 'absolute', top: 4, left: 6,
                  fontFamily: 'var(--font-mono), monospace', fontSize: 8.5, fontWeight: 700,
                  letterSpacing: '0.1em', color: '#fff', textShadow: `0 0 6px ${ACCENT}, 0 1px 3px #000`,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            </div>
          </button>
        )
      })}

      {/* detail card — the centre hub itself. Nodes ring around it, connector
          lines emanate from behind it. Opaque so nothing bleeds through. */}
      <div style={{
        position: 'absolute', left: `${CN_HUB.x}%`, top: '50%', transform: 'translate(-50%,-50%)',
        width: 300, zIndex: 7,
        opacity: cardOp, transition: 'opacity 200ms',
        // Glassmorphic — translucent dark tint + backdrop blur frosts the
        // nebula behind the card; the dark tint keeps text readable.
        background: 'linear-gradient(165deg, rgba(17,27,42,0.52) 0%, rgba(7,11,18,0.60) 100%)',
        backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        border: `1px solid ${ACCENT}59`, borderRadius: 22,
        boxShadow: `0 34px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(94,234,212,0.12), 0 0 60px ${ACCENT}26, inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.3)`,
        overflow: 'hidden',
      }}>
        <style>{`
          .cn-cta { transition: filter .25s, box-shadow .25s, transform .2s; }
          .cn-cta:hover { filter: brightness(1.08); box-shadow: 0 10px 26px ${ACCENT}55; transform: translateY(-1px); }
          .cn-cta:active { transform: translateY(0); }
          .cn-cta .cn-arr { display: inline-block; transition: transform .25s; }
          .cn-cta:hover .cn-arr { transform: translateX(5px); }
          @keyframes cn-mesh { to { transform: rotate(360deg); } }
        `}</style>

        {/* autoplay progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <div
            key={`${active}-${paused}`}
            style={{
              height: '100%', background: `linear-gradient(90deg, ${ACCENT}, #38bdf8)`,
              width: paused ? '100%' : '0%', boxShadow: `0 0 8px ${ACCENT}`,
              animation: paused ? 'none' : `cn-bar ${CN_AUTOPLAY_MS}ms linear forwards`,
              opacity: paused ? 0.4 : 1,
            }} />
        </div>

        <div key={p.id} style={{ opacity: 1, animation: 'cn-fade .4s ease' }}>
          {/* gradient-mesh cover — a rotating conic gradient (per-project colour
              → accent) instead of a screenshot. */}
          <div style={{ position: 'relative', height: 92, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: '-60%',
              background: `conic-gradient(from 0deg, ${p.color}, ${ACCENT}, #a78bfa, ${p.color})`,
              filter: 'blur(16px)', animation: 'cn-mesh 7s linear infinite',
            }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,16,26,0) 45%, rgba(11,17,28,0.62) 100%)' }} />
            <span style={{
              position: 'absolute', top: 12, left: 13, padding: '4px 9px', borderRadius: 6,
              background: 'rgba(7,11,18,0.55)', backdropFilter: 'blur(4px)',
              border: `1px solid ${ACCENT}40`,
              fontFamily: 'var(--font-mono), monospace', fontSize: 8, fontWeight: 700,
              letterSpacing: '0.16em', color: '#fff',
            }}>{catLabel(p.category)} · {p.year}</span>
            <span style={{
              position: 'absolute', top: 12, right: 14,
              fontFamily: 'var(--font-mono), monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.6)',
            }}>
              {String(active + 1).padStart(2, '0')}
              <span style={{ opacity: 0.5 }}> / {String(pool.length).padStart(2, '0')}</span>
            </span>
          </div>

          {/* body */}
          <div style={{ padding: '14px 15px 15px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6,
              fontFamily: 'var(--font-mono), monospace', fontSize: 8.5,
              letterSpacing: '0.16em', color: ACCENT,
            }}>
              <span style={{ width: 14, height: 1.5, background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }} />
              {p.company.toUpperCase()}
            </div>
            <div style={{
              fontFamily: 'var(--font-display), sans-serif', fontWeight: 800,
              fontSize: 19, lineHeight: 1.08, letterSpacing: '-0.015em', color: '#fff',
            }}>{p.title.split(' — ')[0]}</div>
            <p style={{
              marginTop: 8,
              fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.62)',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{p.tagline}</p>

            <div style={{ marginTop: 11, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {(p.tech ?? []).slice(0, 3).map((t) => (
                <span key={t} style={{
                  fontFamily: 'var(--font-mono), monospace', fontSize: 8.5,
                  color: 'rgba(255,255,255,0.82)', padding: '3px 8px', borderRadius: 999,
                  border: '1px solid rgba(94,234,212,0.28)', background: 'rgba(94,234,212,0.05)',
                }}>{t}</span>
              ))}
            </div>

            <button
              className="cn-cta"
              onClick={() => openDrawer(p.id)}
              style={{
                marginTop: 13, width: '100%', padding: '10px 0', borderRadius: 10,
                background: `linear-gradient(135deg, ${ACCENT} 0%, #38bdf8 100%)`,
                color: '#05070d', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono), monospace', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.15em',
              }}>VIEW CASE STUDY <span className="cn-arr">→</span></button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExperienceJourney — right-side "Orbital Trajectory" for the EXPERIENCE station.
// A curved flight path with a glowing waypoint-planet per role (newest on top),
// labels beside each. Proximity-faded + fully gone before the neighbouring
// stations (projects 0.55 / contact 0.90).
// ─────────────────────────────────────────────────────────────────────────────
const EJ_NODES = [{ x: 78, y: 12 }, { x: 40, y: 38 }, { x: 70, y: 64 }, { x: 32, y: 88 }]
const EJ_PATH  = 'M 78 12 C 55 22, 50 28, 40 38 S 78 54, 70 64 S 40 78, 32 88'

function ExperienceJourney({ progress }: { progress: number }) {
  const EXP_T   = STATIONS.find((s) => s.id === 'experience')?.t ?? 0.75
  const dist    = Math.abs(progress - EXP_T)
  // Very tight — experience (0.75) and contact (0.90) are only 0.15 apart and
  // both render on the right, so hand off cleanly around their midpoint (0.825)
  // with no overlap.
  const opacity = Math.max(0, Math.min(1, (0.075 - dist) / 0.035))
  const near    = opacity > 0.4
  if (dist > 0.08) return null

  const ACCENT = '#5EEAD4'
  const jour   = experience.slice(0, 4)

  return (
    <div
      style={{
        position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
        width: 'min(56vw, 780px)', height: 'min(74vh, 560px)', zIndex: 30,
        opacity, transition: 'opacity 240ms', pointerEvents: near ? 'auto' : 'none',
      }}
    >
      <style>{`
        @keyframes ej-dash  { to { stroke-dashoffset: -40; } }
        @keyframes ej-float { 0%,100%{ transform: translate(-50%,-50%) translateY(0); }
                              50%   { transform: translate(-50%,-50%) translateY(-7px); } }
      `}</style>

      {/* trajectory path */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d={EJ_PATH} fill="none" stroke={`${ACCENT}40`} strokeWidth="0.5" strokeDasharray="2 3" style={{ animation: 'ej-dash 3s linear infinite' }} />
        <path d={EJ_PATH} fill="none" stroke={ACCENT} strokeWidth="0.3" opacity="0.5" />
      </svg>

      {/* waypoint planets + labels */}
      {jour.map((e, i) => {
        const p = EJ_NODES[i]
        return (
          <div key={e.id} style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
            animation: `ej-float ${(3.6 + i * 0.5).toFixed(1)}s ease-in-out ${(-i * 0.4).toFixed(1)}s infinite`,
          }}>
            <span style={{
              display: 'block', width: e.current ? 22 : 16, height: e.current ? 22 : 16, borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, #aef6ec, ${ACCENT} 55%, #0b6b5e)`,
              boxShadow: `0 0 ${e.current ? 26 : 16}px ${ACCENT}`,
              border: e.current ? '2px solid #fff' : 'none',
            }} />
            <div style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              [p.x > 50 ? 'right' : 'left']: 26, width: 184,
              textAlign: p.x > 50 ? 'right' : 'left',
            } as React.CSSProperties}>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, letterSpacing: '0.1em', color: ACCENT }}>
                {e.period}{e.current ? ' · NOW' : ''}
              </div>
              <div style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.15, marginTop: 2, textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>
                {e.role}
              </div>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>
                {e.company}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactOrbit — right-side "Orbiting Channels" for the CONTACT station.
// An Earth hub with contact channels (email / linkedin / github / phone) as
// floating orbiting nodes wired to it; click any node to open the contact
// drawer. Proximity-faded so it doesn't bleed into the experience section.
// ─────────────────────────────────────────────────────────────────────────────
const CO_HUB   = { x: 50, y: 50 }
const CO_NODES: { icon: IconType; label: string; x: number; y: number }[] = [
  { icon: FaEnvelope,   label: 'Email',    x: 24, y: 22 },
  { icon: FaLinkedinIn, label: 'LinkedIn', x: 78, y: 30 },
  { icon: FaGithub,     label: 'GitHub',   x: 22, y: 78 },
  { icon: FaPhone,      label: 'Phone',    x: 78, y: 72 },
]

function ContactOrbit({ progress }: { progress: number }) {
  const CONTACT_T = STATIONS.find((s) => s.id === 'contact')?.t ?? 0.90
  const dist      = Math.abs(progress - CONTACT_T)
  // Mirror ExperienceJourney's tight band so the two hand off cleanly (~0.825)
  // without overlapping on the right.
  const opacity   = Math.max(0, Math.min(1, (0.075 - dist) / 0.035))
  const near      = opacity > 0.4
  if (dist > 0.08) return null

  const ACCENT = '#5EEAD4'
  const open   = () => window.dispatchEvent(new Event('contact-drawer-open'))

  return (
    <div
      style={{
        position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
        width: 'min(54vw, 720px)', height: 'min(72vh, 540px)', zIndex: 30,
        opacity, transition: 'opacity 240ms', pointerEvents: near ? 'auto' : 'none',
      }}
    >
      <style>{`
        @keyframes co-pulse { 0%,100%{ transform: translate(-50%,-50%) scale(1); opacity:.9 } 50%{ transform: translate(-50%,-50%) scale(1.16); opacity:1 } }
        @keyframes co-float { 0%,100%{ transform: translate(-50%,-50%) translateY(0) } 50%{ transform: translate(-50%,-50%) translateY(-8px) } }
      `}</style>

      {/* connector lines hub → channels */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {CO_NODES.map((n, i) => (
          <line key={i} x1={`${CO_HUB.x}%`} y1={`${CO_HUB.y}%`} x2={`${n.x}%`} y2={`${n.y}%`}
            stroke={`${ACCENT}30`} strokeWidth="1" strokeDasharray="3 4" />
        ))}
      </svg>

      {/* Earth hub */}
      <div style={{
        position: 'absolute', left: `${CO_HUB.x}%`, top: `${CO_HUB.y}%`, width: 92, height: 92, borderRadius: '50%',
        transform: 'translate(-50%,-50%)',
        background: 'radial-gradient(circle at 36% 30%, #6fd3ff, #1b6fb0 50%, #06243f 100%)',
        boxShadow: '0 0 52px #2b9fe0aa, inset -8px -8px 22px rgba(0,0,0,0.5)',
      }} />
      <div style={{
        position: 'absolute', left: `${CO_HUB.x}%`, top: `${CO_HUB.y}%`, width: 124, height: 124, borderRadius: '50%',
        transform: 'translate(-50%,-50%)', border: `1px solid ${ACCENT}55`, animation: 'co-pulse 3s ease-in-out infinite',
      }} />

      {/* channel nodes */}
      {CO_NODES.map((n, i) => {
        const Icon = n.icon
        return (
          <button key={n.label} onClick={open} aria-label={`Open contact — ${n.label}`}
            style={{
              position: 'absolute', left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%,-50%)',
              border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
              animation: `co-float ${(3.5 + i * 0.6).toFixed(1)}s ease-in-out ${(-i * 0.5).toFixed(1)}s infinite`,
            }}>
            <span style={{
              display: 'flex', width: 52, height: 52, borderRadius: '50%', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(13,22,34,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              border: `1.5px solid ${ACCENT}66`, boxShadow: `0 0 18px ${ACCENT}44`,
            }}>
              <Icon size={19} color={ACCENT} />
            </span>
            <span style={{
              position: 'absolute', top: 'calc(100% + 5px)', left: '50%', transform: 'translateX(-50%)',
              whiteSpace: 'nowrap', fontFamily: 'var(--font-mono), monospace', fontSize: 9.5,
              letterSpacing: '0.1em', color: 'rgba(255,255,255,0.65)',
            }}>{n.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AboutStory — right-side "Terminal Log" for the ABOUT station. A mono terminal
// window that prints a short personal story. Proximity-faded with a tight band
// so it doesn't bleed into intro (0.04) / skills (0.35).
// ─────────────────────────────────────────────────────────────────────────────
const ABOUT_STORY_LINES = [
  "I'm a software engineer from Karachi, Pakistan.",
  "6+ years building real-time products people actually use —",
  "from MILETAP's video conferencing to DigitalHire's hiring system.",
  "Clean code, real performance, interfaces that feel alive.",
]

function AboutStory({ progress }: { progress: number }) {
  const ABOUT_T = STATIONS.find((s) => s.id === 'about')?.t ?? 0.20
  const dist    = Math.abs(progress - ABOUT_T)
  // Tight band — intro (0.04) and skills (0.35) are close, so fade fast.
  const opacity = Math.max(0, Math.min(1, (0.075 - dist) / 0.035))
  const near    = opacity > 0.4
  if (dist > 0.08) return null

  const ACCENT = '#5EEAD4'

  return (
    <div
      style={{
        position: 'fixed', right: '5vw', top: '50%', transform: 'translateY(-50%)',
        width: 'min(46vw, 540px)', zIndex: 30,
        opacity, transition: 'opacity 240ms', pointerEvents: near ? 'auto' : 'none',
        borderRadius: 8, overflow: 'hidden',
        background: 'rgba(6,10,16,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${ACCENT}40`, boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 36px ${ACCENT}1a`,
      }}
    >
      <style>{`@keyframes about-cursor { 0%,49%{opacity:1} 50%,100%{opacity:0} }`}</style>
      {/* title bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderBottom: '1px solid rgba(94,234,212,0.16)', background: 'rgba(94,234,212,0.04)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
        <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono), monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>shah@portfolio: ~/about</span>
      </div>
      <div style={{ padding: '18px 18px 22px', fontFamily: 'var(--font-mono), monospace', fontSize: 13, lineHeight: 1.7 }}>
        <div style={{ color: ACCENT }}>$ whoami</div>
        {ABOUT_STORY_LINES.map((ln, i) => (
          <div key={i} style={{ color: 'rgba(255,255,255,0.82)', marginTop: i === 0 ? 6 : 2 }}>
            <span style={{ color: ACCENT, opacity: 0.6 }}>&gt; </span>{ln}
          </div>
        ))}
        <div style={{ marginTop: 12, color: ACCENT }}>
          $ <span style={{ display: 'inline-block', width: 8, height: 15, background: ACCENT, marginLeft: 2, verticalAlign: 'middle', animation: 'about-cursor 1.1s step-end infinite' }} />
        </div>
      </div>
    </div>
  )
}

function renderCard(s: StationDef) {
  switch (s.id) {
    case 'hero':       return <HeroCard       station={s} />
    case 'about':      return <AboutCard      station={s} />
    case 'skills':     return <SkillsCard     station={s} />
    case 'projects':   return <ProjectsCard   station={s} />
    case 'opensource': return <OpenSourceCard station={s} />
    case 'experience': return <ExperienceCard station={s} />
    case 'contact':    return <ContactCard    station={s} />
  }
  return null
}

function SkillsCard({ station }: { station: StationDef }) {
  const stats = [
    { label: 'React + Next.js',  value: 'Frontend Core'      },
    { label: 'Flutter + WebRTC', value: 'Mobile & Real-Time' },
    { label: 'Three.js + GSAP',  value: '3D & Creative'      },
  ]
  return (
    <>
      <div style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: station.color, marginBottom: 18,
        textShadow: 'var(--eyebrow-shadow)',
      }}>
        Technologies I work with
      </div>

      <h2 style={{
        ...heading,
        fontSize: '2.2rem',
        color: 'rgb(var(--text-primary))',
        marginBottom: 18,
      }}>
        6 Years of Craft
      </h2>

      <p style={{
        fontFamily: 'var(--font-body), ui-sans-serif, system-ui, sans-serif',
        fontSize: '0.95rem', lineHeight: 1.7, color: 'rgb(var(--text-primary) / 0.7)',
        margin: '0 0 26px', maxWidth: 480,
      }}>
        From pixel-perfect React interfaces to real-time WebRTC video platforms — I build things that work at scale. Specialized across frontend, mobile, and live-communication systems.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'baseline',
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontSize: 12, letterSpacing: '0.06em',
          }}>
            <span style={{ color: 'rgb(var(--text-primary))' }}>{s.label}</span>
            <span style={{
              flex: 1, margin: '0 10px', overflow: 'hidden',
              color: 'rgb(var(--text-primary) / 0.25)',
              letterSpacing: '0.2em',
            }}>
              ················································
            </span>
            <span style={{ color: station.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase',
        color: 'rgb(var(--text-primary) / 0.55)',
      }}>
        → Click any skill to spin the orbit
      </div>
    </>
  )
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
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
        <a
          href="/Shah_Fahad_Resume.pdf"
          download="Shah_Fahad_Resume.pdf"
          aria-label="Download Shah Fahad's resume (PDF)"
          style={ctaBtnGhost(station.color)}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2v8m0 0L4.5 6.5M8 10l3.5-3.5M2.5 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Resume
        </a>
      </div>
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
        color: hexAlpha(station.color, 0.7),
      }}>
        → tap any thumbnail in the space to open its case study
      </div>
    </>
  )
}

function OpenSourceCard({ station }: { station: StationDef }) {
  // Flutter blue lives ONLY inside this card (the planet/label stay sage).
  const FLUTTER = '#54C5F8'
  const MERGED  = '#3fb950'
  const c = contributions[0]
  const meta = `${c.repo} · #${c.prNumber} · ${c.displayDate} · +${c.additions}/−${c.deletions}`

  return (
    <>
      <div style={eyebrow(station.color)}>{station.subtitle}</div>
      <h2 style={{ ...heading, marginBottom: 18 }}>{station.heading}</h2>

      {/* logos + merged pill row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, pointerEvents: 'none' }}>
        <FlutterLogo size={26} style={{ color: FLUTTER }} title="Flutter" />
        <GitHubLogo size={24} style={{ color: 'rgb(var(--text-primary) / 0.85)' }} title="GitHub" />
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 11px', borderRadius: 999,
          border: `1px solid ${hexAlpha(MERGED, 0.5)}`,
          background: hexAlpha(MERGED, 0.12),
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: MERGED,
        }}>
          <MergedGlyph size={13} style={{ color: MERGED }} />
          Merged
        </span>
      </div>

      {/* PR title */}
      <p style={{
        fontFamily: 'var(--font-display), ui-sans-serif, system-ui, sans-serif',
        fontSize: 18, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em',
        color: 'rgb(var(--text-primary))', margin: '0 0 10px', maxWidth: 480,
      }}>
        {c.prTitle}
      </p>

      {/* meta line */}
      <div style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 12, letterSpacing: '0.04em',
        color: 'rgb(var(--text-primary) / 0.6)', margin: '0 0 24px',
      }}>
        {meta}
      </div>

      {/* actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <a
          href={c.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={ctaBtn(station.color)}
        >
          View Pull Request <span style={{ fontSize: 13 }}>↗</span>
        </a>
        <Link
          href={`/achievements/${c.id}`}
          style={ctaBtnGhost(station.color)}
        >
          Read case study <span style={{ fontSize: 13 }}>→</span>
        </Link>
      </div>
    </>
  )
}

function ExperienceCard({ station }: { station: StationDef }) {
  // The journey renders as the right-side Orbital Trajectory; the left panel
  // keeps the intro copy + a rotating real LinkedIn recommendation (social
  // proof right where the career is shown).
  const [ti, setTi] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTi((t) => (t + 1) % testimonials.length), 6000)
    return () => clearInterval(id)
  }, [])
  const t = testimonials[ti]

  return (
    <>
      <div style={eyebrow(station.color)}>{station.subtitle}</div>
      <h2 style={heading}>{station.heading}</h2>
      <p style={tagline}>{station.tagline}</p>

      {/* rotating recommendation */}
      <style>{`@keyframes exp-quote { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div
        key={ti}
        style={{
          marginTop: 22, maxWidth: 460, padding: '15px 18px', borderRadius: 14,
          background: 'rgb(var(--bg-surface) / 0.55)',
          border: `1px solid ${hexAlpha(station.color, 0.28)}`,
          boxShadow: `0 12px 30px rgba(0,0,0,0.35), 0 0 22px ${hexAlpha(station.color, 0.12)}`,
          animation: 'exp-quote 500ms ease both',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
          fontFamily: 'var(--font-mono), monospace', fontSize: 9, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: station.color,
        }}>
          ★ Recommendation
        </div>
        <p style={{
          margin: 0, fontSize: 13.5, lineHeight: 1.6,
          color: 'rgb(var(--text-primary) / 0.86)',
        }}>
          &ldquo;{t.short}&rdquo;
        </p>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 26, height: 1.5, background: station.color }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: 13, color: 'rgb(var(--text-primary))' }}>{t.name}</div>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, letterSpacing: '0.06em', color: 'rgb(var(--text-primary) / 0.5)', marginTop: 1 }}>{t.role}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
            {testimonials.map((_, i) => (
              <span key={i} style={{ width: i === ti ? 16 : 5, height: 5, borderRadius: 999, background: i === ti ? station.color : hexAlpha(station.color, 0.3), transition: 'all .3s' }} />
            ))}
          </div>
        </div>
      </div>
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
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('contact-drawer-open'))}
          style={{ ...ctaBtn(station.color), border: 'none', cursor: 'pointer' }}
        >
          Contact Me →
        </button>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline icons
// ─────────────────────────────────────────────────────────────────────────────

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

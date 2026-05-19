'use client'

// TunnelHUD — full chrome overlay for the WebGL tunnel.
//
// Layout:
//   ┌───────────────────────────────────────────────────────────────┐
//   │ SCROLL TO EXPLORE          [station tabs]         SOUND ON ▶  │
//   │ ▭▭▭▭▭                                                          │
//   │                                                                │
//   │  PASSIONATE                                       CLEAN CODE  │
//   │  ABOUT BUILDING                                   PERFORMANCE │
//   │  DIGITAL EXPERIENCES                              INNOVATION  │
//   │                                                                │
//   │  00 - INTRO              SCROLL DOWN             LET'S BUILD  │
//   │  WELCOME TO MY TUNNEL    [mouse icon]      SOMETHING AMAZING  │
//   └───────────────────────────────────────────────────────────────┘
//
// All chrome content is station-aware — subtitle, closer, traits, active tab
// update as scroll progress crosses each station's t.

import { useState } from 'react'
import { STATIONS, nearestStation, useScrollProgress } from '@/components/r3f/TunnelScene'

export function TunnelHUD() {
  const progress = useScrollProgress()
  const station  = nearestStation(progress)
  const [sound, setSound] = useState(false)   // UI-only toggle for now

  const accent = station.color

  return (
    <>
      {/* ─── top-left: SCROLL TO EXPLORE + progress dashes ─────────────── */}
      <div
        style={{
          position: 'fixed', top: 24, left: 32,
          zIndex: 50, pointerEvents: 'none',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          color: '#F5F5F7', fontSize: 11, letterSpacing: '0.25em',
        }}
      >
        <div style={{ marginBottom: 6 }}>SCROLL TO EXPLORE</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {STATIONS.map((s, i) => {
            const active = progress >= s.t - (1 / STATIONS.length) * 0.6
            const here   = i === Math.floor(progress * STATIONS.length)
            return (
              <span
                key={s.id}
                style={{
                  width: 18, height: 2,
                  background: active ? accent : 'rgba(255,255,255,0.22)',
                  boxShadow:  active ? `0 0 6px ${accent}aa` : 'none',
                  transition: 'background 200ms, box-shadow 200ms, transform 200ms',
                  display:    'inline-block',
                  transform:  here ? 'scaleX(1.6)' : 'scaleX(1)',
                  transformOrigin: 'left',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* ─── top-center: station nav tabs ─────────────────────────────── */}
      <nav
        style={{
          position: 'fixed', top: 18, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          display: 'flex', gap: 28,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          pointerEvents: 'auto',
        }}
        aria-label="Tunnel stations"
      >
        {STATIONS.map((s) => {
          const isActive = s.id === station.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 6,
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 0,
                color: isActive ? accent : 'rgba(245,245,247,0.55)',
                transition: 'color 220ms',
              }}
            >
              <div
                style={{
                  width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  border: isActive ? `1px solid ${accent}` : '1px solid transparent',
                  boxShadow: isActive
                    ? `0 0 14px ${accent}55, inset 0 0 10px ${accent}22`
                    : 'none',
                  fontSize: 14, fontWeight: 700,
                  letterSpacing: '0.04em',
                  transition: 'all 220ms',
                }}
              >
                {s.num}
              </div>
              <div style={{
                fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                {s.short}
              </div>
            </button>
          )
        })}
      </nav>

      {/* ─── top-right: SOUND toggle (UI only, hook up audio later) ───── */}
      <button
        type="button"
        onClick={() => setSound((v) => !v)}
        aria-label={sound ? 'Mute sound' : 'Enable sound'}
        aria-pressed={sound}
        style={{
          position: 'fixed', top: 24, right: 32,
          zIndex: 50,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: sound ? accent : 'rgba(245,245,247,0.55)',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11, letterSpacing: '0.25em',
          display: 'flex', alignItems: 'center', gap: 10,
          pointerEvents: 'auto',
          padding: 0,
        }}
      >
        <SoundIcon active={sound} color={accent} />
        SOUND {sound ? 'ON' : 'OFF'}
      </button>

      {/* ─── mid-left: traits column ──────────────────────────────────── */}
      <div
        style={{
          position: 'fixed', left: 32, top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 40, pointerEvents: 'none',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 10, letterSpacing: '0.3em',
          color: 'rgba(245,245,247,0.65)',
          textTransform: 'uppercase',
          display: 'flex', flexDirection: 'column', gap: 14,
          textShadow: '0 0 6px rgba(0,0,0,0.8)',
        }}
      >
        {station.traitsLeft.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>

      {/* ─── mid-right: traits column ─────────────────────────────────── */}
      <div
        style={{
          position: 'fixed', right: 32, top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 40, pointerEvents: 'none',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 10, letterSpacing: '0.3em',
          color: 'rgba(245,245,247,0.65)',
          textTransform: 'uppercase',
          textAlign: 'right',
          display: 'flex', flexDirection: 'column', gap: 14,
          textShadow: '0 0 6px rgba(0,0,0,0.8)',
        }}
      >
        {station.traitsRight.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>

      {/* ─── bottom-left: station number + subtitle ───────────────────── */}
      <div
        style={{
          position: 'fixed', bottom: 32, left: 32,
          zIndex: 50, pointerEvents: 'none',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          letterSpacing: '0.25em', textTransform: 'uppercase',
        }}
      >
        <div style={{
          color: accent, fontSize: 12, fontWeight: 600,
          marginBottom: 4,
          textShadow: `0 0 10px ${accent}88`,
        }}>
          {station.num} — {station.short}
        </div>
        <div style={{
          color: 'rgba(245,245,247,0.75)', fontSize: 10, letterSpacing: '0.28em',
        }}>
          {station.subtitle}
        </div>
      </div>

      {/* ─── bottom-center: SCROLL DOWN + mouse icon ──────────────────── */}
      <div
        style={{
          position: 'fixed', bottom: 28, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50, pointerEvents: 'none',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 10, letterSpacing: '0.3em',
          color: 'rgba(245,245,247,0.7)',
          textTransform: 'uppercase',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}
      >
        <span>SCROLL DOWN</span>
        <MouseScrollIcon color={accent} />
      </div>

      {/* ─── bottom-right: closer text ────────────────────────────────── */}
      <div
        style={{
          position: 'fixed', bottom: 32, right: 32,
          zIndex: 50, pointerEvents: 'none',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          letterSpacing: '0.25em', textTransform: 'uppercase',
          textAlign: 'right',
        }}
      >
        <div style={{
          color: accent, fontSize: 12, fontWeight: 600,
          marginBottom: 4,
          textShadow: `0 0 10px ${accent}88`,
        }}>
          {station.closer[0]}
        </div>
        <div style={{
          color: 'rgba(245,245,247,0.75)', fontSize: 10, letterSpacing: '0.28em',
        }}>
          {station.closer[1]}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline icons
// ─────────────────────────────────────────────────────────────────────────────

function SoundIcon({ active, color }: { active: boolean; color: string }) {
  // Five vertical bars at varying heights, "playing" when active
  const heights = [6, 10, 14, 10, 6]
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 4 + 1}
          y={(14 - h) / 2}
          width={2}
          height={h}
          rx={1}
          fill={active ? color : 'rgba(245,245,247,0.4)'}
        >
          {active && (
            <animate
              attributeName="height"
              values={`${h};${h * 0.4};${h}`}
              dur={`${0.7 + i * 0.15}s`}
              repeatCount="indefinite"
            />
          )}
        </rect>
      ))}
    </svg>
  )
}

function MouseScrollIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="28" viewBox="0 0 18 28" aria-hidden="true">
      <rect
        x={1} y={1}
        width={16} height={26}
        rx={8}
        fill="none"
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={1}
      />
      <circle cx={9} cy={9} r={1.6} fill={color}>
        <animate
          attributeName="cy"
          values="9;14;9"
          dur="1.6s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="1;0.4;1"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  )
}

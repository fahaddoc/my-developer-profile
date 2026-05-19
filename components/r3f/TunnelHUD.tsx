'use client'

// TunnelHUD — overlay UI for the WebGL tunnel.
// Renders the "now arriving" badge, a progress bar with station ticks, and a
// subtle scroll hint. Subscribes to scrollRef via useScrollProgress so it
// re-renders only when meaningful change happens.

import { STATIONS, nearestStation, useScrollProgress } from '@/components/r3f/TunnelScene'

export function TunnelHUD() {
  const progress = useScrollProgress()
  const station  = nearestStation(progress)
  const idx      = STATIONS.indexOf(station)
  const total    = STATIONS.length

  return (
    <>
      {/* Current station badge — top-left */}
      <div
        style={{
          position: 'fixed',
          top:      24,
          left:     24,
          color:    station.color,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 13,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          textShadow: `0 0 12px ${station.color}88`,
          pointerEvents: 'none',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <span style={{ opacity: 0.5, fontSize: 10 }}>now arriving</span>
        <span style={{ fontWeight: 700 }}>{station.label}</span>
      </div>

      {/* Progress bar — bottom-left */}
      <div
        style={{
          position: 'fixed',
          bottom:   28,
          left:     24,
          width:    260,
          pointerEvents: 'none',
          zIndex:   50,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase',
          color: 'rgba(255,181,71,0.55)', marginBottom: 6,
        }}>
          <span>station {idx + 1} / {total}</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div style={{
          height: 2, background: 'rgba(255,181,71,0.15)', position: 'relative', overflow: 'visible',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, rgba(255,181,71,0.4), ${station.color})`,
            boxShadow: `0 0 12px ${station.color}b0`,
            transition: 'width 80ms linear, background 240ms linear',
          }} />
          {STATIONS.map((s) => (
            <span
              key={s.id}
              style={{
                position: 'absolute',
                top: -3, bottom: -3,
                left: `${s.t * 100}%`,
                width: 1.5,
                background: 'rgba(255,250,230,0.55)',
                transform: 'translateX(-50%)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Scroll hint — top centre */}
      <div
        style={{
          position: 'fixed',
          top:      24,
          left:     '50%',
          transform: 'translateX(-50%)',
          color:    'rgba(255,181,71,0.45)',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
          zIndex: 50,
        }}
      >
        ▼ scroll to fly through
      </div>
    </>
  )
}

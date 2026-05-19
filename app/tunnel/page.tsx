// app/tunnel/page.tsx — Step 2 preview
//
// Adds station HUD that updates as camera approaches each station.

'use client'

import { TunnelScene, STATIONS, nearestStation, useScrollProgress } from '@/components/r3f/TunnelScene'

function StationHUD() {
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
          color:    '#FFB547',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 13,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          textShadow: '0 0 12px rgba(255,181,71,0.55)',
          pointerEvents: 'none',
          zIndex: 5,
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
          zIndex:   5,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
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
          height: 2, background: 'rgba(255,181,71,0.15)', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, rgba(255,181,71,0.4), #FFB547)',
            boxShadow: '0 0 12px rgba(255,181,71,0.7)',
            transition: 'width 80ms linear',
          }} />
          {/* Station tick marks */}
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

      {/* Footer label — bottom-right */}
      <div
        style={{
          position: 'fixed',
          bottom:   24,
          right:    24,
          color:    'rgba(255,181,71,0.45)',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 10,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        step 02 · stations
      </div>
    </>
  )
}

export default function TunnelPreviewPage() {
  return (
    <>
      <TunnelScene />

      <div style={{ height: '500vh', position: 'relative', zIndex: 1 }}>
        <StationHUD />

        {/* Scroll hint — top centre, fades after a moment */}
        <div
          style={{
            position: 'fixed',
            top:      24,
            left:     '50%',
            transform: 'translateX(-50%)',
            color:    'rgba(255,181,71,0.45)',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          ▼ scroll to fly through tunnel
        </div>
      </div>
    </>
  )
}

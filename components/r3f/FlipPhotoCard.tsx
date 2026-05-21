'use client'

// FlipPhotoCard — holographic projection of the Shah Fahad sticker silhouette.
// Layered effects (back to front):
//   1. Light cone from below + projector ring (base/floor)
//   2. Outer rotating HUD frame + corner brackets
//   3. Portrait image with cyan recolor filter
//   4. Two RGB-shifted ghost copies for chromatic aberration
//   5. Scanlines overlay drifting downward
//   6. Floating particles rising through the column
//   7. Subtle random glitch (skew + clip) every few seconds
//   8. Hint chip + sound state toggle (preserved from original)
//
// Click toggles `soundStore` which the IntroMiniPlayer reads to start/stop
// the intro video in the HUD top-right.

import { useMemo } from 'react'
import { hexAlpha, useSound } from '@/components/r3f/TunnelScene'

interface FlipPhotoCardProps {
  accent: string
  /** Card width in px (defaults to 220) */
  width?: number
}

const PARTICLE_COUNT = 16

export function FlipPhotoCard({ accent, width = 220 }: FlipPhotoCardProps) {
  const [sound, setSound] = useSound()

  // Stable random offsets/delays per particle so they don't shuffle on rerender.
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        leftPct: (i * 37) % 100,
        delay:   (i * 0.43) % 5,
        dur:     5 + ((i * 0.71) % 4),
        size:    1.4 + ((i * 0.29) % 1.8),
      })),
    [],
  )

  return (
    <div
      style={{
        position:      'relative',
        width,
        aspectRatio:   '4 / 5',
        pointerEvents: 'auto',
        cursor:        'pointer',
      }}
      onClick={() => setSound(!sound)}
      role="button"
      aria-pressed={sound}
      aria-label={sound ? 'Intro playing. Click to stop.' : 'Click to play intro video.'}
    >
      {/* ─── 1. Light cone from below + projector ring ──────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left:     '50%',
          bottom:   0,
          width:    '120%',
          height:   '90%',
          transform: 'translateX(-50%)',
          background: `radial-gradient(ellipse at 50% 100%, ${hexAlpha(accent, 0.42)} 0%, ${hexAlpha(accent, 0.12)} 35%, transparent 70%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
          animation: 'fpc-cone 4.2s ease-in-out infinite',
        }}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 200 60"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -4,
          width: '90%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          filter: `drop-shadow(0 0 6px ${hexAlpha(accent, 0.7)})`,
          opacity: 0.85,
        }}
      >
        <ellipse cx="100" cy="30" rx="92" ry="14" fill="none" stroke={accent} strokeWidth="1"  strokeOpacity="0.55" />
        <ellipse cx="100" cy="30" rx="72" ry="11" fill="none" stroke={accent} strokeWidth="0.7" strokeOpacity="0.35" />
        <ellipse cx="100" cy="30" rx="48" ry="7.5" fill="none" stroke={accent} strokeWidth="0.6" strokeOpacity="0.22" />
        {/* tick marks around outer ring */}
        {Array.from({ length: 12 }).map((_, i) => {
          const ang = (i / 12) * Math.PI * 2
          const x1 = 100 + Math.cos(ang) * 92
          const y1 = 30  + Math.sin(ang) * 14
          const x2 = 100 + Math.cos(ang) * 96
          const y2 = 30  + Math.sin(ang) * 15
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth="0.6" strokeOpacity="0.6" />
        })}
      </svg>

      {/* ─── 2. Outer rotating HUD frame ────────────────────────────────── */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          inset:    '-4%',
          width:    '108%',
          height:   '108%',
          pointerEvents: 'none',
          opacity: 0.5,
          animation: 'fpc-spin 22s linear infinite',
        }}
      >
        <circle cx="50" cy="50" r="49" fill="none" stroke={accent} strokeWidth="0.25" strokeDasharray="0.4 2.4" />
        <circle cx="50" cy="50" r="46" fill="none" stroke={accent} strokeWidth="0.18" strokeDasharray="2 6" />
      </svg>

      {/* corner brackets — static */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => {
        const isTop   = corner.startsWith('t')
        const isLeft  = corner.endsWith('l')
        return (
          <div
            key={corner}
            aria-hidden="true"
            style={{
              position: 'absolute',
              [isTop  ? 'top'  : 'bottom']: 6,
              [isLeft ? 'left' : 'right']:  6,
              width: 14, height: 14,
              borderTop:    isTop  ? `1px solid ${hexAlpha(accent, 0.85)}` : undefined,
              borderBottom: !isTop ? `1px solid ${hexAlpha(accent, 0.85)}` : undefined,
              borderLeft:   isLeft ? `1px solid ${hexAlpha(accent, 0.85)}` : undefined,
              borderRight: !isLeft ? `1px solid ${hexAlpha(accent, 0.85)}` : undefined,
              pointerEvents: 'none',
              boxShadow: `0 0 6px ${hexAlpha(accent, 0.4)}`,
            }}
          />
        )
      })}

      {/* ─── 3-5. Portrait + RGB ghost + scanlines (composited in one
              container so they share clip + transform). ─────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position:  'absolute',
          inset:     0,
          pointerEvents: 'none',
          animation: 'fpc-glitch 7.5s steps(1, end) infinite',
        }}
      >
        {/* Red ghost — shifted left, screen blend */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/shah-fahad-sticker.png"
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'contain', objectPosition: 'bottom',
            filter: 'hue-rotate(330deg) saturate(2.5) brightness(0.9) drop-shadow(0 0 8px rgba(255,0,80,0.5))',
            mixBlendMode: 'screen',
            transform: 'translateX(-1.4px)',
            opacity: 0.55,
          }}
        />
        {/* Blue ghost — shifted right, screen blend */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/shah-fahad-sticker.png"
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'contain', objectPosition: 'bottom',
            filter: 'hue-rotate(200deg) saturate(2) brightness(0.9) drop-shadow(0 0 10px rgba(0,180,255,0.6))',
            mixBlendMode: 'screen',
            transform: 'translateX(1.4px)',
            opacity: 0.55,
          }}
        />
        {/* Main portrait — recolored to cyan tone */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/shah-fahad-sticker.png"
          alt="Shah Fahad portrait"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'contain', objectPosition: 'bottom',
            filter: `
              hue-rotate(160deg)
              saturate(1.4)
              brightness(1.15)
              contrast(1.05)
              drop-shadow(0 0 10px ${hexAlpha(accent, 0.8)})
              drop-shadow(0 0 22px ${hexAlpha(accent, 0.45)})
              drop-shadow(0 0 42px ${hexAlpha(accent, 0.2)})
            `,
            opacity: 0.92,
          }}
        />
        {/* Scanlines — drift downward, masked to portrait body via
            mix-blend-mode so they don't bleed onto transparent background. */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              ${hexAlpha(accent, 0.18)} 0px,
              ${hexAlpha(accent, 0.18)} 1px,
              transparent 1px,
              transparent 3px
            )`,
            mixBlendMode: 'overlay',
            opacity: 0.65,
            animation: 'fpc-scan 6s linear infinite',
          }}
        />
        {/* Soft highlight sweep — single bright band slowly traverses */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to bottom, transparent 40%, ${hexAlpha(accent, 0.22)} 50%, transparent 60%)`,
            mixBlendMode: 'screen',
            animation: 'fpc-sweep 5.5s linear infinite',
          }}
        />
      </div>

      {/* ─── 6. Floating particles rising past the figure ───────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset:    0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {particles.map((p, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${p.leftPct}%`,
              bottom: -8,
              width: p.size, height: p.size,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 4px ${accent}`,
              opacity: 0,
              animation: `fpc-rise ${p.dur}s ${p.delay}s linear infinite`,
            }}
          />
        ))}
      </div>

      {/* ─── 7. Hint chip — preserved from original ─────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 8, right: 8,
          padding: '4px 10px', borderRadius: 999,
          background: 'rgba(8,14,18,0.78)',
          border: `1px solid ${hexAlpha(accent, sound ? 0.75 : 0.45)}`,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: accent,
          display: 'flex', alignItems: 'center', gap: 6,
          pointerEvents: 'none',
          transition: 'border-color 250ms',
          backdropFilter: 'blur(4px)',
          boxShadow: `0 0 10px ${hexAlpha(accent, 0.25)}`,
        }}
      >
        {sound ? (
          <>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: accent, boxShadow: `0 0 6px ${accent}`,
            }} />
            playing intro
          </>
        ) : (
          <>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5v7l6-3.5z" /></svg>
            click for intro
          </>
        )}
      </div>

      {/* Keyframes — scoped to this card */}
      <style jsx>{`
        @keyframes fpc-scan {
          0%   { background-position: 0 0; }
          100% { background-position: 0 60px; }
        }
        @keyframes fpc-sweep {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes fpc-rise {
          0%   { transform: translateY(0)    scale(1);   opacity: 0; }
          15%  { opacity: 0.8; }
          85%  { opacity: 0.4; }
          100% { transform: translateY(-360px) scale(0.6); opacity: 0; }
        }
        @keyframes fpc-cone {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1;    }
        }
        @keyframes fpc-spin {
          to { transform: rotate(360deg); }
        }
        /* Subtle glitch — most of the cycle is identity; tiny windows skew. */
        @keyframes fpc-glitch {
          0%, 88%, 100% { transform: translate(0, 0) skewX(0deg); filter: none; }
          89%           { transform: translate(-2px, 0) skewX(-1.2deg); }
          90%           { transform: translate(2px, 0)  skewX( 1.2deg); }
          91%           { transform: translate(0, 1px)  skewX(0deg); }
          92%, 96%      { transform: translate(0, 0)    skewX(0deg); }
          97%           { transform: translate(1px, -1px) skewX(0.6deg); }
          98%           { transform: translate(-1px, 0)  skewX(-0.6deg); }
        }
      `}</style>
    </div>
  )
}

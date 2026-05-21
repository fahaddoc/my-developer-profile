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

import { hexAlpha, useSound } from '@/components/r3f/TunnelScene'

interface FlipPhotoCardProps {
  accent: string
  /** Card width in px (defaults to 220) */
  width?: number
}

export function FlipPhotoCard({ accent, width = 220 }: FlipPhotoCardProps) {
  const [sound, setSound] = useSound()

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

      {/* ─── 3. Portrait with cyan hologram filter (no RGB ghosts) ──────── */}
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
          `,
          opacity: 0.92,
          pointerEvents: 'none',
        }}
      />

      {/* Scanlines — static, no animation */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            ${hexAlpha(accent, 0.16)} 0px,
            ${hexAlpha(accent, 0.16)} 1px,
            transparent 1px,
            transparent 3px
          )`,
          mixBlendMode: 'overlay',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />

      {/* ─── Hint chip — preserved from original ────────────────────────── */}
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

      <style jsx>{`
        @keyframes fpc-cone {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1;    }
        }
      `}</style>
    </div>
  )
}

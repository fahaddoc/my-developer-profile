'use client'

// FlipPhotoCard — holographic projection of Shah Fahad with multi-dimensional
// hexagonal masking. Layered effects (back to front):
//   1. Light cone from below + projector ring (base/floor)
//   2. Outer corner brackets (HUD chrome)
//   3. Base portrait (very faint, ghost layer for continuity)
//   4. Three hex-clipped "tunnel windows", each with a different treatment:
//      • Hex A — natural cyan-tinted portrait (top-left)
//      • Hex B — wireframe / edge-detect look (bottom-right)
//      • Hex C — RGB-split glitch (centre, smallest, on top)
//   5. Scanlines overlay
//   6. Hint chip + sound state toggle
//
// Click toggles `soundStore` which the IntroMiniPlayer reads to start/stop
// the intro video in the HUD top-right.

import { hexAlpha, useSound } from '@/components/r3f/TunnelScene'

interface FlipPhotoCardProps {
  accent: string
  /** Card width in px (defaults to 220) */
  width?: number
}

// Hex polygon clip-paths — 6 vertices in CSS percentage coordinates relative
// to the image element. Three different positions/sizes so they reveal
// different parts of the figure.
const HEX_A = 'polygon(34% 4%, 64% 18%, 64% 46%, 34% 60%, 4% 46%, 4% 18%)'   // top-left, large
const HEX_B = 'polygon(66% 40%, 96% 54%, 96% 82%, 66% 96%, 36% 82%, 36% 54%)' // bottom-right, large
const HEX_C = 'polygon(50% 28%, 72% 40%, 72% 64%, 50% 76%, 28% 64%, 28% 40%)' // centre, smaller

const PORTRAIT_SRC = '/images/shah-fahad-sticker.png'

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

      {/* ─── Base ghost portrait — very low opacity continuity layer ───── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PORTRAIT_SRC}
        alt="Shah Fahad portrait"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain', objectPosition: 'bottom',
          filter: `hue-rotate(170deg) saturate(1.2) brightness(1.05) contrast(1.05) drop-shadow(0 0 12px ${hexAlpha(accent, 0.45)})`,
          opacity: 0.28,
          pointerEvents: 'none',
        }}
      />

      {/* ─── Hex A — natural cyan-tinted portrait (top-left) ─────────────── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PORTRAIT_SRC}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain', objectPosition: 'bottom',
          clipPath: HEX_A,
          WebkitClipPath: HEX_A,
          filter: `hue-rotate(170deg) saturate(1.6) brightness(1.18) contrast(1.08) drop-shadow(0 0 8px ${hexAlpha(accent, 0.7)})`,
          transform: 'translate(-2px, -1px)',
          opacity: 0.95,
          pointerEvents: 'none',
        }}
      />

      {/* ─── Hex B — wireframe / edge-detect look (bottom-right) ─────────── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PORTRAIT_SRC}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain', objectPosition: 'bottom',
          clipPath: HEX_B,
          WebkitClipPath: HEX_B,
          filter: `grayscale(1) invert(1) contrast(2.1) brightness(0.85) hue-rotate(170deg) saturate(2.5)`,
          mixBlendMode: 'screen',
          transform: 'translate(2px, 1px)',
          opacity: 0.85,
          pointerEvents: 'none',
        }}
      />

      {/* ─── Hex C — RGB-split glitch (centre, on top) ───────────────────── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PORTRAIT_SRC}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain', objectPosition: 'bottom',
          clipPath: HEX_C,
          WebkitClipPath: HEX_C,
          filter: `hue-rotate(180deg) saturate(2) brightness(1.1) contrast(1.2) drop-shadow(2px 0 0 rgba(255,40,90,0.55)) drop-shadow(-2px 0 0 rgba(0,200,255,0.55))`,
          transform: 'translate(0, 2px)',
          opacity: 0.95,
          pointerEvents: 'none',
        }}
      />

      {/* Thin accent outline along each hex — gives the "window into another
          tunnel" framing. SVG overlay covering the full card. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
          opacity: 0.85,
        }}
      >
        <polygon points="34,4 64,18 64,46 34,60 4,46 4,18"
          fill="none" stroke={accent} strokeOpacity="0.6" strokeWidth="0.4" />
        <polygon points="66,40 96,54 96,82 66,96 36,82 36,54"
          fill="none" stroke={accent} strokeOpacity="0.45" strokeWidth="0.4" />
        <polygon points="50,28 72,40 72,64 50,76 28,64 28,40"
          fill="none" stroke="#C6F8EE" strokeOpacity="0.7" strokeWidth="0.35" />
      </svg>

      {/* Scanlines — static, no animation */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            ${hexAlpha(accent, 0.14)} 0px,
            ${hexAlpha(accent, 0.14)} 1px,
            transparent 1px,
            transparent 3px
          )`,
          mixBlendMode: 'overlay',
          opacity: 0.45,
          pointerEvents: 'none',
        }}
      />

      {/* ─── Hint chip ─────────────────────────────────────────────────── */}
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

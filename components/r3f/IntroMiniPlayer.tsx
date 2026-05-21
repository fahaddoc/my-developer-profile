'use client'

// IntroMiniPlayer — fixed picture-in-picture for the intro video, presented
// as a holographic projection that matches the FlipPhotoCard treatment.
// Docks to the top-right of the viewport just below the SOUND toggle.
// Plays as long as the shared sound state is true, regardless of scroll
// position. Clicking the close × stops playback (sets sound OFF).

import { useEffect, useRef } from 'react'
import { hexAlpha, useSound } from '@/components/r3f/TunnelScene'

interface IntroMiniPlayerProps {
  accent: string
}

export function IntroMiniPlayer({ accent }: IntroMiniPlayerProps) {
  const [sound, setSound] = useSound()
  const videoRef = useRef<HTMLVideoElement>(null)

  // Drive the video playback off the shared sound state
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (sound) {
      v.muted = false
      v.play().catch(() => {
        v.muted = true
        v.play().catch(() => { /* still blocked, poster stays */ })
      })
    } else {
      v.pause()
      v.currentTime = 0
    }
  }, [sound])

  return (
    <div
      role="region"
      aria-label="Intro video"
      style={{
        position:   'fixed',
        top:        58,
        right:      32,
        zIndex:     58,
        width:      220,
        aspectRatio: '4 / 5',
        borderRadius: 8,
        background: 'rgb(var(--bg-surface) / 0.85)',
        border:     `1px solid ${hexAlpha(accent, sound ? 0.7 : 0.25)}`,
        boxShadow:  sound
          ? `0 0 30px ${hexAlpha(accent, 0.5)}, 0 0 60px ${hexAlpha(accent, 0.2)}, 0 12px 32px rgba(0,0,0,0.6)`
          : `0 8px 20px rgba(0,0,0,0.45)`,
        opacity:       sound ? 1 : 0,
        transform:     sound ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)',
        pointerEvents: sound ? 'auto' : 'none',
        transition: 'opacity 280ms ease-out, transform 280ms cubic-bezier(0.22,1,0.36,1), border-color 240ms, box-shadow 240ms',
      }}
    >
      {/* Inner clipper — holds video + overlays. Outer keeps brackets/HUD
          ring sharp without being clipped. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {/* Video — cyan tone via static filter (no animated glitch wrapper) */}
        <video
          ref={videoRef}
          poster="/videos/shah-intro-poster.png"
          playsInline
          preload="metadata"
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', display: 'block',
            filter: `hue-rotate(160deg) saturate(1.5) brightness(1.05) contrast(1.08)`,
          }}
        >
          <source src="/videos/shah-intro.webm" type="video/webm" />
          <source src="/videos/shah-intro.mov"  type='video/mp4; codecs="hvc1"' />
          <source src="/videos/shah-intro.mp4"  type="video/mp4" />
        </video>

        {/* Static cyan wash + scanlines — no animation = no per-frame compositor work */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(180deg, ${hexAlpha(accent, 0.10)} 0%, ${hexAlpha(accent, 0.04)} 50%, ${hexAlpha(accent, 0.18)} 100%)`,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        />
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
            opacity: 0.45,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Corner brackets — sit outside the clipper so they punch out of card */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => {
        const isTop  = corner.startsWith('t')
        const isLeft = corner.endsWith('l')
        return (
          <div
            key={corner}
            aria-hidden="true"
            style={{
              position: 'absolute',
              [isTop  ? 'top'  : 'bottom']: -1,
              [isLeft ? 'left' : 'right']:  -1,
              width: 12, height: 12,
              borderTop:    isTop  ? `1.5px solid ${accent}` : undefined,
              borderBottom: !isTop ? `1.5px solid ${accent}` : undefined,
              borderLeft:   isLeft ? `1.5px solid ${accent}` : undefined,
              borderRight: !isLeft ? `1.5px solid ${accent}` : undefined,
              pointerEvents: 'none',
              boxShadow: `0 0 6px ${hexAlpha(accent, 0.6)}`,
            }}
          />
        )
      })}

      {/* Live LED + label */}
      <div
        style={{
          position: 'absolute', top: 8, left: 8,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '3px 8px', borderRadius: 999,
          background: 'rgb(var(--bg-surface) / 0.7)',
          backdropFilter: 'blur(4px)',
          border: `1px solid ${hexAlpha(accent, 0.45)}`,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: accent,
          boxShadow: `0 0 8px ${hexAlpha(accent, 0.3)}`,
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: accent, boxShadow: `0 0 6px ${accent}`,
          animation: 'introMiniPulse 1.4s ease-in-out infinite',
        }} />
        intro · holo
      </div>

      {/* Close × */}
      <button
        type="button"
        onClick={() => setSound(false)}
        aria-label="Stop intro video"
        style={{
          position: 'absolute', top: 6, right: 6,
          width: 22, height: 22, borderRadius: '50%',
          background: 'rgb(var(--bg-surface) / 0.7)',
          backdropFilter: 'blur(4px)',
          border: `1px solid ${hexAlpha(accent, 0.55)}`,
          color: accent,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 11, lineHeight: 1,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 8px ${hexAlpha(accent, 0.35)}`,
        }}
      >
        ×
      </button>

      <style jsx>{`
        @keyframes introMiniPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}

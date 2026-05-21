'use client'

// FlipPhotoCard — clean transparent-cutout portrait. No hex masks, no glitch,
// no wireframe — just the figure on a transparent background with a soft
// projector ring at the feet + corner brackets framing the panel.
//
// Click toggles `soundStore` which the IntroMiniPlayer reads to start/stop
// the intro video in the HUD top-right.

import { hexAlpha, useSound } from '@/components/r3f/TunnelScene'
import { ParticlePortrait } from '@/components/r3f/ParticlePortrait'

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
        aspectRatio:   '3 / 4',
        pointerEvents: 'auto',
        cursor:        'pointer',
      }}
      onClick={() => setSound(!sound)}
      role="button"
      aria-pressed={sound}
      aria-label={sound ? 'Intro playing. Click to stop.' : 'Click to play intro video.'}
    >
      {/* Soft glow halo behind the figure */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left:     '50%',
          top:      '50%',
          width:    '110%',
          height:   '110%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(ellipse at center, ${hexAlpha(accent, 0.25)} 0%, ${hexAlpha(accent, 0.08)} 35%, transparent 70%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Projector ring at feet */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 60"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -4,
          width: '85%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          filter: `drop-shadow(0 0 6px ${hexAlpha(accent, 0.7)})`,
          opacity: 0.7,
        }}
      >
        <ellipse cx="100" cy="30" rx="92" ry="14" fill="none" stroke={accent} strokeWidth="0.9" strokeOpacity="0.55" />
        <ellipse cx="100" cy="30" rx="68" ry="10" fill="none" stroke={accent} strokeWidth="0.6" strokeOpacity="0.30" />
      </svg>

      {/* Corner brackets — minimal HUD frame */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => {
        const isTop  = corner.startsWith('t')
        const isLeft = corner.endsWith('l')
        return (
          <div
            key={corner}
            aria-hidden="true"
            style={{
              position: 'absolute',
              [isTop  ? 'top'  : 'bottom']: 4,
              [isLeft ? 'left' : 'right']:  4,
              width: 16, height: 16,
              borderTop:    isTop  ? `1px solid ${hexAlpha(accent, 0.75)}` : undefined,
              borderBottom: !isTop ? `1px solid ${hexAlpha(accent, 0.75)}` : undefined,
              borderLeft:   isLeft ? `1px solid ${hexAlpha(accent, 0.75)}` : undefined,
              borderRight: !isLeft ? `1px solid ${hexAlpha(accent, 0.75)}` : undefined,
              pointerEvents: 'none',
              boxShadow: `0 0 6px ${hexAlpha(accent, 0.35)}`,
            }}
          />
        )
      })}

      {/* The cutout — rendered as a particle field. Hover triggers a dust-
          dispersion effect (sampled pixels drift outward with cyan tint),
          mouseLeave springs them back home. */}
      <div
        style={{
          position: 'absolute', inset: 0,
          filter: `drop-shadow(0 0 14px ${hexAlpha(accent, 0.45)}) drop-shadow(0 0 32px ${hexAlpha(accent, 0.18)})`,
        }}
      >
        <ParticlePortrait
          src="/images/shah-fahad-sticker.png"
          width={460}
          height={613}
          step={3}
          accentTint={accent}
        />
      </div>

      {/* Hint chip */}
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
    </div>
  )
}

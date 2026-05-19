'use client'

// FlipPhotoCard — Shah Fahad sticker silhouette. Hover OR click sets sound ON
// in the shared store, which causes the IntroMiniPlayer (top-right of the
// HUD) to start playing the intro video. Hover-out does NOT stop the
// playback — user must click the SOUND button OFF to stop. This matches
// the requested behaviour: once triggered, intro keeps playing while the
// user scrolls until they explicitly silence it.

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
        position:       'relative',
        width,
        aspectRatio:    '4 / 5',
        pointerEvents:  'auto',
        cursor:         'pointer',
      }}
      onMouseEnter={() => setSound(true)}
      onClick={() => setSound(!sound)}
      role="button"
      aria-pressed={sound}
      aria-label={sound ? 'Intro playing. Click to stop.' : 'Hover to play intro video.'}
    >
      {/* Ambient amber halo behind the silhouette */}
      <div
        aria-hidden="true"
        style={{
          position:   'absolute',
          inset:      0,
          background: `radial-gradient(circle at center, ${hexAlpha(accent, 0.38)} 0%, ${hexAlpha(accent, 0.08)} 50%, transparent 70%)`,
          transform:  'scale(1.3)',
          filter:     'blur(45px)',
          pointerEvents: 'none',
        }}
      />

      {/* Sticker silhouette */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/shah-fahad-sticker.png"
        alt="Shah Fahad portrait"
        style={{
          position:  'absolute',
          inset:     0,
          width:     '100%',
          height:    '100%',
          objectFit: 'contain',
          objectPosition: 'bottom',
          filter:    `drop-shadow(0 10px 14px rgba(0,0,0,0.45)) drop-shadow(0 0 22px ${hexAlpha(accent, 0.5)}) drop-shadow(0 0 42px ${hexAlpha(accent, 0.2)})`,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />

      {/* Hint chip — switches label when intro is playing */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 8, right: 8,
          padding: '4px 10px', borderRadius: 999,
          background: 'rgba(15,12,4,0.7)',
          border: `1px solid ${hexAlpha(accent, sound ? 0.6 : 0.4)}`,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: accent,
          display: 'flex', alignItems: 'center', gap: 6,
          pointerEvents: 'none',
          transition: 'border-color 250ms',
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
            hover for intro
          </>
        )}
      </div>
    </div>
  )
}

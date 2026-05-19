'use client'

// IntroMiniPlayer — fixed picture-in-picture for the intro video.
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
        // Browser blocked unmuted autoplay — fall back to muted playback
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
        zIndex:     55,
        width:      220,
        aspectRatio: '4 / 5',
        borderRadius: 8,
        overflow:   'hidden',
        background: 'rgba(8,6,2,0.85)',
        border:     `1px solid ${hexAlpha(accent, sound ? 0.6 : 0.2)}`,
        boxShadow:  sound
          ? `0 0 26px ${hexAlpha(accent, 0.45)}, 0 12px 32px rgba(0,0,0,0.6)`
          : `0 8px 20px rgba(0,0,0,0.45)`,
        opacity:       sound ? 1 : 0,
        transform:     sound ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)',
        pointerEvents: sound ? 'auto' : 'none',
        transition: 'opacity 280ms ease-out, transform 280ms cubic-bezier(0.22,1,0.36,1), border-color 240ms, box-shadow 240ms',
      }}
    >
      <video
        ref={videoRef}
        poster="/videos/shah-intro-poster.png"
        playsInline
        preload="metadata"
        style={{
          width:    '100%',
          height:   '100%',
          objectFit: 'cover',
          display:   'block',
        }}
      >
        <source src="/videos/shah-intro.webm" type="video/webm" />
        <source src="/videos/shah-intro.mov"  type='video/mp4; codecs="hvc1"' />
        <source src="/videos/shah-intro.mp4"  type="video/mp4" />
      </video>

      {/* Live LED + label */}
      <div
        style={{
          position: 'absolute', top: 8, left: 8,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '3px 8px', borderRadius: 999,
          background: 'rgba(0,0,0,0.55)',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: accent,
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: accent, boxShadow: `0 0 6px ${accent}`,
          animation: 'introMiniPulse 1.4s ease-in-out infinite',
        }} />
        intro · live
      </div>

      {/* Close × */}
      <button
        type="button"
        onClick={() => setSound(false)}
        aria-label="Stop intro video"
        style={{
          position: 'absolute', top: 6, right: 6,
          width: 22, height: 22, borderRadius: '50%',
          background: 'rgba(0,0,0,0.6)',
          border: `1px solid ${hexAlpha(accent, 0.45)}`,
          color: accent,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 11, lineHeight: 1,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
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

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
        borderRadius: 12,
        overflow:   'hidden',
        background: '#0e131b',
        border:     `1px solid ${hexAlpha(accent, sound ? 0.55 : 0.18)}`,
        boxShadow:  sound
          ? `0 0 28px ${hexAlpha(accent, 0.4)}, 0 18px 44px rgba(0,0,0,0.62)`
          : `0 10px 28px rgba(0,0,0,0.5)`,
        opacity:       sound ? 1 : 0,
        transform:     sound ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)',
        pointerEvents: sound ? 'auto' : 'none',
        transition: 'opacity 280ms ease-out, transform 280ms cubic-bezier(0.22,1,0.36,1), border-color 240ms, box-shadow 240ms',
      }}
    >
      {/* macOS-style title bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 12px',
          background: '#161c26',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Red light doubles as the close control */}
        <button
          type="button"
          onClick={() => setSound(false)}
          aria-label="Stop intro video"
          style={{
            width: 11, height: 11, borderRadius: '50%', padding: 0, cursor: 'pointer',
            background: '#ff5f56', border: '0.5px solid rgba(0,0,0,0.25)',
          }}
        />
        <span aria-hidden="true" style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e', border: '0.5px solid rgba(0,0,0,0.25)' }} />
        <span aria-hidden="true" style={{ width: 11, height: 11, borderRadius: '50%', background: '#27c93f', border: '0.5px solid rgba(0,0,0,0.25)' }} />
        <span style={{
          marginLeft: 6, display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-mono), monospace', fontSize: 9.5,
          color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', whiteSpace: 'nowrap',
        }}>
          {/* tiny playing dot */}
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, boxShadow: `0 0 5px ${accent}`, animation: 'introMiniPulse 1.4s ease-in-out infinite' }} />
          shah-intro.mp4
        </span>
      </div>

      {/* Video */}
      <div style={{ position: 'relative', aspectRatio: '4 / 5' }}>
        <video
          ref={videoRef}
          poster="/videos/shah-intro-poster.png"
          playsInline
          preload="none"
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', display: 'block',
            filter: 'saturate(1.12) brightness(1.03) contrast(1.04)',
          }}
        >
          <source src="/videos/shah-intro.webm" type="video/webm" />
          <source src="/videos/shah-intro.mov"  type='video/mp4; codecs="hvc1"' />
          <source src="/videos/shah-intro.mp4"  type="video/mp4" />
        </video>
      </div>

      <style jsx>{`
        @keyframes introMiniPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}

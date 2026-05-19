'use client'

// FlipPhotoCard — sticker front, intro video back, flips on hover/tap.
// Shared by the tunnel HUD chrome (original spot) and the TunnelScene
// 3D overlay (new INTRO-station spot) so the same UX lives in both
// contexts without duplication.

import { useEffect, useRef, useState } from 'react'
import { hexAlpha } from '@/components/r3f/TunnelScene'

interface FlipPhotoCardProps {
  accent: string
  /** Card width in px (defaults to 220) */
  width?: number
}

export function FlipPhotoCard({ accent, width = 220 }: FlipPhotoCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [muted, setMuted]     = useState(true)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce hover-out so edge cases don't oscillate the flip
  const setFlippedSoon = (next: boolean) => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    if (next) setFlipped(true)
    else closeTimerRef.current = setTimeout(() => setFlipped(false), 140)
  }
  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) }, [])

  // Drive video on flip
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (flipped) v.play().catch(() => { /* autoplay blocked, poster stays */ })
    else { v.pause(); v.currentTime = 0 }
  }, [flipped])

  return (
    <div
      style={{
        position:       'relative',
        width,
        aspectRatio:    '4 / 5',
        perspective:    900,
        pointerEvents:  'auto',
        cursor:         'pointer',
      }}
      onMouseEnter={() => setFlippedSoon(true)}
      onMouseLeave={() => setFlippedSoon(false)}
      onClick={() => setFlipped((f) => !f)}
      role="button"
      aria-pressed={flipped}
      aria-label={flipped ? 'Showing intro video. Click to return to photo.' : 'Photo of Shah Fahad. Hover to play intro video.'}
    >
      {/* Ambient amber halo */}
      <div
        aria-hidden="true"
        style={{
          position:   'absolute',
          inset:      0,
          background: `radial-gradient(circle at center, ${hexAlpha(accent, 0.38)} 0%, ${hexAlpha(accent, 0.08)} 50%, transparent 70%)`,
          transform:  'scale(1.3)',
          filter:     'blur(45px)',
        }}
      />

      {/* Flip stage */}
      <div
        style={{
          position:       'absolute',
          inset:          0,
          transformStyle: 'preserve-3d',
          transform:      flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition:     'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Front: sticker */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/shah-fahad-sticker.png"
            alt="Shah Fahad portrait"
            style={{
              width: '100%', height: '100%',
              objectFit: 'contain', objectPosition: 'bottom',
              filter: `drop-shadow(0 10px 14px rgba(0,0,0,0.45)) drop-shadow(0 0 22px ${hexAlpha(accent, 0.5)}) drop-shadow(0 0 42px ${hexAlpha(accent, 0.2)})`,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
          {/* "hover for intro" hint */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', bottom: 8, right: 8,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(15,12,4,0.7)',
              border: `1px solid ${hexAlpha(accent, 0.4)}`,
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: accent,
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: flipped ? 0 : 1,
              transition: 'opacity 250ms',
            }}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5v7l6-3.5z" /></svg>
            hover for intro
          </div>
        </div>

        {/* Back: intro video */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <video
            ref={videoRef}
            poster="/videos/shah-intro-poster.png"
            muted={muted}
            playsInline
            preload="metadata"
            style={{
              width: '100%', height: '100%',
              objectFit: 'contain', objectPosition: 'bottom',
              filter: `drop-shadow(0 10px 14px rgba(0,0,0,0.45)) drop-shadow(0 0 22px ${hexAlpha(accent, 0.5)}) drop-shadow(0 0 42px ${hexAlpha(accent, 0.2)})`,
            }}
          >
            <source src="/videos/shah-intro.webm" type="video/webm" />
            <source src="/videos/shah-intro.mov"  type='video/mp4; codecs="hvc1"' />
            <source src="/videos/shah-intro.mp4"  type="video/mp4" />
          </video>
        </div>
      </div>

      {/* Mute toggle (visible only while flipped) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setMuted((m) => !m) }}
        aria-label={muted ? 'Unmute intro video' : 'Mute intro video'}
        aria-pressed={!muted}
        style={{
          position: 'absolute',
          bottom: -14, right: -10,
          padding: '5px 10px', borderRadius: 999,
          background: 'rgba(15,12,4,0.85)',
          border: `1px solid ${hexAlpha(accent, 0.5)}`,
          color: accent,
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'pointer',
          opacity: flipped ? 1 : 0,
          pointerEvents: flipped ? 'auto' : 'none',
          transition: 'opacity 250ms',
        }}
      >
        {muted ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
        <span>{muted ? 'tap for sound' : 'mute'}</span>
      </button>
    </div>
  )
}

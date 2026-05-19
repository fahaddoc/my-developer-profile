'use client'

// FlipPhotoCard — sticker image by default, intro video crossfades in on
// hover/tap. Replaced the original 3D flip with a 2D crossfade because the
// CSS backface-visibility flip glitched when this card was rendered inside
// drei <Html transform> (CSS3D conflict made both faces visible at once).
// UX is the same: hover/tap to play intro, leave/tap again to return.

import { useEffect, useRef, useState } from 'react'
import { hexAlpha } from '@/components/r3f/TunnelScene'

interface FlipPhotoCardProps {
  accent: string
  /** Card width in px (defaults to 220) */
  width?: number
}

export function FlipPhotoCard({ accent, width = 220 }: FlipPhotoCardProps) {
  const [showVideo, setShowVideo] = useState(false)
  const [muted, setMuted]         = useState(true)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce hover-out so edge cases don't oscillate the swap
  const setShowVideoSoon = (next: boolean) => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    if (next) setShowVideo(true)
    else closeTimerRef.current = setTimeout(() => setShowVideo(false), 140)
  }
  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) }, [])

  // Drive video playback alongside the crossfade
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (showVideo) v.play().catch(() => { /* autoplay blocked, poster stays */ })
    else { v.pause(); v.currentTime = 0 }
  }, [showVideo])

  return (
    <div
      style={{
        position:       'relative',
        width,
        aspectRatio:    '4 / 5',
        pointerEvents:  'auto',
        cursor:         'pointer',
      }}
      onMouseEnter={() => setShowVideoSoon(true)}
      onMouseLeave={() => setShowVideoSoon(false)}
      onClick={() => setShowVideo((v) => !v)}
      role="button"
      aria-pressed={showVideo}
      aria-label={showVideo ? 'Showing intro video. Click to return to photo.' : 'Photo of Shah Fahad. Hover to play intro video.'}
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

      {/* Sticker layer — visible by default, fades out on hover */}
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
          opacity:   showVideo ? 0 : 1,
          transition: 'opacity 400ms ease-out',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />

      {/* Video layer — invisible by default, fades in on hover */}
      <video
        ref={videoRef}
        poster="/videos/shah-intro-poster.png"
        muted={muted}
        playsInline
        preload="metadata"
        style={{
          position:  'absolute',
          inset:     0,
          width:     '100%',
          height:    '100%',
          objectFit: 'contain',
          objectPosition: 'bottom',
          filter:    `drop-shadow(0 10px 14px rgba(0,0,0,0.45)) drop-shadow(0 0 22px ${hexAlpha(accent, 0.5)}) drop-shadow(0 0 42px ${hexAlpha(accent, 0.2)})`,
          opacity:   showVideo ? 1 : 0,
          transition: 'opacity 400ms ease-out',
          pointerEvents: 'none',
        }}
      >
        <source src="/videos/shah-intro.webm" type="video/webm" />
        <source src="/videos/shah-intro.mov"  type='video/mp4; codecs="hvc1"' />
        <source src="/videos/shah-intro.mp4"  type="video/mp4" />
      </video>

      {/* "hover for intro" chip — visible when sticker is showing */}
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
          opacity: showVideo ? 0 : 1,
          transition: 'opacity 250ms',
          pointerEvents: 'none',
        }}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5v7l6-3.5z" /></svg>
        hover for intro
      </div>

      {/* Mute toggle (visible only while video is showing) */}
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
          opacity: showVideo ? 1 : 0,
          pointerEvents: showVideo ? 'auto' : 'none',
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

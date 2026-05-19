'use client'

// FlipPhotoCard — sticker image by default, intro video crossfades in on
// hover/tap. Replaced the original 3D flip with a 2D crossfade because the
// CSS backface-visibility flip glitched when this card was rendered inside
// drei <Html transform> (CSS3D conflict made both faces visible at once).
// UX is the same: hover/tap to play intro, leave/tap again to return.

import { useEffect, useRef } from 'react'
import { hexAlpha, useSound } from '@/components/r3f/TunnelScene'

interface FlipPhotoCardProps {
  accent: string
  /** Card width in px (defaults to 220) */
  width?: number
}

export function FlipPhotoCard({ accent, width = 220 }: FlipPhotoCardProps) {
  // showVideo is now driven by the SHARED sound store so the HUD's SOUND
  // toggle and this card stay in lockstep. Hovering the card auto-turns
  // sound ON; turning sound OFF (via card or HUD button) stops the video
  // and returns to the sticker.
  const [showVideo, setShowVideo] = useSound()
  const videoRef     = useRef<HTMLVideoElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce hover-out so edge cases don't oscillate the swap
  const setShowVideoSoon = (next: boolean) => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    if (next) setShowVideo(true)
    else closeTimerRef.current = setTimeout(() => setShowVideo(false), 200)
  }
  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) }, [])

  // Drive video playback alongside the crossfade
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (showVideo) {
      v.muted = false
      v.play().catch(() => {
        // Browser blocked unmuted autoplay — fall back to muted playback
        v.muted = true
        v.play().catch(() => { /* still blocked, poster stays */ })
      })
    } else {
      v.pause(); v.currentTime = 0
    }
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
      onClick={() => setShowVideo(!showVideo)}
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

    </div>
  )
}

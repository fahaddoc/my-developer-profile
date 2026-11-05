'use client'

// IntroMiniPlayer — picture-in-picture for the intro video. Docks top-right
// under the chrome cluster; the hero portrait is sized to start below it, so
// it never covers the portrait the visitor just clicked. Plays while the
// shared sound state is true, at any station; the close button stops it.
// Poster: a 360px WebP (~13KB, 2x for the 184px player) instead of the 400KB
// PNG; preload="none" keeps the video itself off the wire until first play.

import { useEffect, useRef } from 'react'
import { FaXmark } from 'react-icons/fa6'
import { useSound } from '@/lib/tunnel'
import styles from './TunnelHUD.module.css'

export function IntroMiniPlayer() {
  const [sound, setSound] = useSound()
  const videoRef = useRef<HTMLVideoElement>(null)

  // Drive playback from the shared sound state.
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
      className={styles.player}
      data-open={sound}
      inert={!sound}
    >
      <div className={styles.playerHead}>
        <span className="t-label">Intro</span>
        <button
          type="button"
          onClick={() => setSound(false)}
          aria-label="Close intro video"
          className={`${styles.iconBtn} ${styles.iconBtnQuiet}`}
          style={{ width: 32, height: 32 }}
        >
          <FaXmark size={14} aria-hidden />
        </button>
      </div>

      <div className={styles.playerVideo}>
        <video
          ref={videoRef}
          poster="/videos/shah-intro-poster-360.webp"
          playsInline
          preload="none"
        >
          <source src="/videos/shah-intro.webm" type="video/webm" />
          <source src="/videos/shah-intro.mov"  type='video/mp4; codecs="hvc1"' />
          <source src="/videos/shah-intro.mp4"  type="video/mp4" />
        </video>
      </div>
    </div>
  )
}

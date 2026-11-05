'use client'

// FlipPhotoCard — the hero portrait. A clean cut-out lit like the scene (warm
// ember key rim upper left, soft cold fill; the lighting lives in
// ParticlePortrait), fading into space at the bottom. No projector ring,
// brackets or halos.
//
// The whole portrait is one toggle button for the intro video: click, Enter
// or Space flips the shared soundStore, which IntroMiniPlayer plays from.
// Its width follows the parent, so the HUD sizes it from the viewport.

import type { KeyboardEvent } from 'react'
import { FaPlay, FaStop } from 'react-icons/fa6'
import { useSound } from '@/lib/tunnel'
import { ParticlePortrait } from '@/components/r3f/ParticlePortrait'
import styles from './TunnelHUD.module.css'

interface FlipPhotoCardProps {
  /** @deprecated Ignored. The portrait reads the theme palette itself. */
  accent?: string
  /** CSS width; defaults to the parent's full width. */
  width?: number | string
}

export function FlipPhotoCard({ width = '100%' }: FlipPhotoCardProps) {
  const [sound, setSound] = useSound()
  const toggle = () => setSound(!sound)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={sound}
      aria-label="Play intro video"
      onClick={toggle}
      onKeyDown={onKeyDown}
      className={styles.portrait}
      style={{ width }}
    >
      <div className={styles.portraitFigure}>
        <ParticlePortrait
          src="/images/shah-fahad-sticker.png"
          width={480}
          height={640}
          step={3}
        />
      </div>

      <span aria-hidden="true" className={`btn btn--sm btn--ghost ${styles.portraitChip}`}>
        {sound ? <FaStop size={10} /> : <FaPlay size={10} />}
        {sound ? 'Stop intro' : 'Play intro'}
      </span>
    </div>
  )
}

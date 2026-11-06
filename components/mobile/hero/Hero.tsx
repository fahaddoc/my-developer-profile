'use client'

// The phone hero, MobileSpace's first station: the sticker portrait standing
// on the horizon (the light theme's ledge in front of it), the name, the line
// and the two calls to action. One component, rendered twice:
//
// - <HeroShell/> (app/page.tsx) puts a still copy in the server HTML, so the
//   portrait and the name paint with the first paint and are the page's LCP,
//   instead of waiting for AppShell's and MobileSpace's chunks and hydration.
//   CSS shows it only on the screens AppShell sends to MobileSpace (see
//   media.ts); desktop never lays it out and drops it after hydration. It is
//   inert and hidden from assistive tech: until the app is up, the SEO text
//   and the boot frame's status speak for the page.
// - <Hero/> in MobileSpace is the live one. Mounting over a visible stand-in,
//   it takes over in one frame without replaying anything (handoff.ts): same
//   layout, same image request (same src and sizes, so the same srcset
//   candidate, from the memory cache).

import { INTRO_ALPHA_MOV, preferAlphaSource } from '@/lib/introVideo'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { getImageProps } from 'next/image'
import { FaPlay, FaVolumeHigh, FaVolumeXmark } from 'react-icons/fa6'
import { HoloText } from '@/components/type/HoloText'
import { HeroIsleBack, HeroIsleFront, SeaIslandStyles } from '@/components/mobile/SeaIslands'
import { HeroStyles } from './HeroStyles'
import { adoptHeroShell } from './handoff'
import { HERO_STICKER_SIZES, HERO_STICKER_SRC, TUNNEL_MEDIA } from './media'

const RESUME = '/Shah_Fahad_Resume.pdf'
const INTRO_POSTER = '/videos/shah-intro-poster-360.webp'
/** A 1x1 transparent GIF: what the stand-in's <picture> gives desktop. */
const NO_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const iv = (i: number) => ({ ['--i' as string]: i }) as CSSProperties

/** The portrait's <img> props. app/page.tsx preloads from these too. */
export const HERO_STICKER = getImageProps({
  src: HERO_STICKER_SRC,
  alt: 'Shah Fahad',
  fill: true,
  priority: true,
  fetchPriority: 'high',
  sizes: HERO_STICKER_SIZES,
  className: 'ms-intro-media',
  style: { objectFit: 'contain', objectPosition: 'bottom' },
}).props

/** The server-rendered stand-in, for app/page.tsx. */
export function HeroShell() {
  return (
    <div className="ms-hero-shell" data-hero-shell="" inert aria-hidden="true">
      <section className="ms-st ms-st--hero">
        <div className="ms-inner">
          <Hero shell />
        </div>
      </section>
      <SeaIslandStyles />
    </div>
  )
}

export function Hero({ onWork, shell = false }: { onWork?: () => void; shell?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)

  // Before the live hero's first paint: take over from the stand-in.
  useLayoutEffect(() => {
    if (shell || !rootRef.current) return
    return adoptHeroShell(rootRef.current)
  }, [shell])

  return (
    <div ref={rootRef} className="ms-hero">
      <HeroStyles />
      <div className="ms-hero-scene">
        <div className="ms-sunrise" aria-hidden="true" />
        <HeroIsleBack />
        <IntroCard shell={shell} />
      </div>
      <div className="ms-planet" aria-hidden="true">
        <div className="ms-planet-orb" />
        <HeroIsleFront />
      </div>

      <div className="ms-hero-copy">
        {/* HoloText runs its own lock-on entrance; no mask wrapper around it.
            Only the live one carries the id (the station's label). */}
        <HoloText
          as="h1"
          id={shell ? undefined : 'intro-title'}
          instant
          text="Shah Fahad"
          className="t-display ms-hero-name"
        />
        <p className="t-lead ms-hero-lead" data-reveal style={iv(2)}>
          Senior software engineer building real-time web and mobile products. React, Next.js, Flutter and WebRTC,
          from Karachi, Pakistan.
        </p>
        <div className="ms-ctas" data-reveal style={iv(3)}>
          <button type="button" className="btn btn--primary" onClick={onWork}>
            See the work <span className="btn-arrow" aria-hidden="true">→</span>
          </button>
          <a className="btn btn--ghost" href={RESUME} target="_blank" rel="noopener noreferrer">
            Resume
          </a>
        </div>
      </div>
    </div>
  )
}

// The sticker photo standing on the horizon. Tap (or Enter / Space) flips it
// to the intro video; the pill becomes a mute toggle while it plays. The video
// fetches nothing (no poster, no preload) until the card is flipped, so it
// never competes with the sticker for LCP.
function IntroCard({ shell }: { shell: boolean }) {
  const [flipped, setFlipped] = useState(false)
  const [muted, setMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Mute is kept in sync on its own, so toggling it never restarts playback.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (flipped) {
      preferAlphaSource(v)
      v.play().catch(() => {
        // Sound was refused (autoplay policy): play muted and say so.
        v.muted = true
        setMuted(true)
        v.play().catch(() => {})
      })
    } else if (!v.paused || v.currentTime > 0) {
      v.pause()
      v.currentTime = 0
    }
  }, [flipped])

  // eslint-disable-next-line @next/next/no-img-element -- next/image's own props (getImageProps)
  const sticker = <img {...HERO_STICKER} alt="Shah Fahad" />

  return (
    // Flip state lives in a data attribute so the element's class never
    // changes while it plays.
    <div className="ms-intro" data-flipped={flipped} data-reveal="rise">
      <button
        type="button"
        className="ms-intro-card"
        aria-pressed={flipped}
        aria-label="Play the intro video"
        onClick={() => setFlipped((f) => !f)}
      >
        <span className="ms-intro-inner">
          <span className="ms-intro-face ms-intro-front">
            {shell ? (
              // The stand-in is in every page's HTML; CSS hides it on desktop,
              // and this keeps desktop from downloading its portrait.
              <picture>
                <source media={TUNNEL_MEDIA} srcSet={NO_IMAGE} />
                {sticker}
              </picture>
            ) : (
              sticker
            )}
          </span>
          <span className="ms-intro-face ms-intro-back">
            <video
              ref={videoRef}
              className="ms-intro-video ms-intro-media"
              poster={flipped ? INTRO_POSTER : undefined}
              playsInline
              preload={flipped ? 'auto' : 'none'}
              onEnded={() => setFlipped(false)}
              aria-hidden="true"
              tabIndex={-1}
            >
              <source src="/videos/shah-intro.webm" type="video/webm" />
              <source src={INTRO_ALPHA_MOV} type='video/mp4; codecs="hvc1"' />
              <source src="/videos/shah-intro.mp4" type="video/mp4" />
            </video>
          </span>
        </span>
        {!flipped && (
          <span className="ms-intro-ctl" aria-hidden="true">
            <FaPlay /> Play intro
          </span>
        )}
      </button>
      {flipped && (
        <button
          type="button"
          className="ms-intro-ctl ms-intro-ctl--sound"
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? <FaVolumeXmark aria-hidden /> : <FaVolumeHigh aria-hidden />}
          {muted ? 'Unmute' : 'Mute'}
        </button>
      )}
    </div>
  )
}

'use client'

// FlipPhotoCard — the hero portrait. The real photo, lit like the scene (warm
// ember rim upper left, soft cold fill right; see ParticlePortrait), fading
// into space at the bottom. No projector ring, brackets, halos or chip.
//
// The whole portrait is one toggle button for the intro video: click, Enter
// or Space flips the shared soundStore (as does the top bar's "Play intro").
// The video then plays in place of the photo, in the same dock ("you come
// alive in place", PortraitIntro): the photo fades and eases back, the
// speaker rises in on the same baseline; on stop or end it reverses. Here the
// cue is a small label on the chest that fades in on hover or keyboard focus.
//
// Particles only on intent, never on a passing cursor: a 300 ms hover dwell
// (cancelled on leave) or keyboard focus, and never while the intro plays (a
// click is a play/stop press, not particle intent). Gated to a fine hover
// pointer without reduced motion (useParticleGate). Its width follows the
// parent, so the HUD sizes it from the viewport.

import { useEffect, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react'
import { FaPlay, FaStop } from 'react-icons/fa6'
import { useSound } from '@/lib/tunnel'
import { ParticlePortrait, useParticleGate } from '@/components/r3f/ParticlePortrait'
import { PortraitIntro } from '@/components/r3f/PortraitIntro'
import hud from './TunnelHUD.module.css'
import s from './FlipPhotoCard.module.css'
import pi from './PortraitIntro.module.css'

const DWELL_MS = 300
/** Interactive descendants never arm the particles. */
const CONTROLS = 'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [tabindex]'

interface FlipPhotoCardProps {
  /** @deprecated Ignored. The portrait reads the theme palette itself. */
  accent?: string
  /** CSS width; defaults to the parent's full width. */
  width?: number | string
}

export function FlipPhotoCard({ width = '100%' }: FlipPhotoCardProps) {
  const [sound, setSound] = useSound()
  const gate = useParticleGate()
  const [hovered, setHovered] = useState(false) // dwell passed
  const [focused, setFocused] = useState(false) // keyboard focus
  const [warm, setWarm]       = useState(false) // pointer arrived: prebuild
  const [live, setLive]       = useState(false) // intro frames on screen
  const dwellRef = useRef(0)

  const cancelDwell = () => {
    if (dwellRef.current) window.clearTimeout(dwellRef.current)
    dwellRef.current = 0
  }
  useEffect(() => () => window.clearTimeout(dwellRef.current), [])

  // Play/stop is never particle intent: a resting cursor or a kept focus must
  // not burst the photo the moment the intro ends. Fresh movement re-arms it.
  useEffect(() => {
    window.clearTimeout(dwellRef.current)
    dwellRef.current = 0
    setHovered(false)
    setFocused(false)
  }, [sound])

  const toggle = () => setSound(!sound)
  const playing = sound || live

  const overControl = (e: PointerEvent<HTMLDivElement>) => {
    const t = e.target
    if (!(t instanceof Element)) return false
    const c = t.closest(CONTROLS)
    return c !== null && c !== e.currentTarget && e.currentTarget.contains(c)
  }

  // Start the dwell only on real pointer movement, so content scrolling under
  // a resting cursor never counts as intent.
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!gate || e.pointerType === 'touch') return
    if (!warm) setWarm(true)
    if (overControl(e)) { cancelDwell(); setHovered(false); return }
    if (playing || hovered || dwellRef.current) return
    if (e.movementX === 0 && e.movementY === 0) return
    dwellRef.current = window.setTimeout(() => {
      dwellRef.current = 0
      setHovered(true)
    }, DWELL_MS)
  }

  const onPointerLeave = () => {
    cancelDwell()
    setHovered(false)
  }

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    let keyboard = false
    try { keyboard = e.currentTarget.matches(':focus-visible') } catch { /* old engines */ }
    if (keyboard && gate) { setWarm(true); if (!playing) setFocused(true) }
  }

  const onBlur = () => setFocused(false)

  const onClick = () => {
    toggle()
    cancelDwell()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (!e.repeat) toggle()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={sound}
      aria-label={sound ? 'Stop intro video' : 'Play intro video'}
      data-live={live}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`${hud.portrait} ${s.root} ${pi.root}`}
      style={{ width }}
    >
      <div className={`${hud.portraitFigure} ${pi.figure}`}>
        <ParticlePortrait active={gate && !playing && (hovered || focused)} warm={warm} />
      </div>

      <PortraitIntro on={sound} onLive={setLive} onEnd={() => setSound(false)} />

      <span aria-hidden="true" className={`t-label ${s.cue} ${pi.cue}`}>
        {sound ? <FaStop /> : <FaPlay />}
        {sound ? 'Stop intro' : 'Play intro'}
      </span>
    </div>
  )
}

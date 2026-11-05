'use client'

// FlipPhotoCard — the hero portrait. The real photo, lit like the scene (warm
// ember rim upper left, soft cold fill right; see ParticlePortrait), fading
// into space at the bottom. No projector ring, brackets, halos or chip.
//
// The whole portrait is one toggle button for the intro video: click, Enter
// or Space flips the shared soundStore, which IntroMiniPlayer plays from. The
// top bar keeps the only visible "Play intro" button; here the cue is a small
// label on the chest that fades in on hover or keyboard focus.
//
// Particles only on intent, never on a passing cursor: a 300 ms hover dwell
// (cancelled on leave), keyboard focus, or a click. Gated to a fine hover
// pointer without reduced motion (useParticleGate). Its width follows the
// parent, so the HUD sizes it from the viewport.

import { useEffect, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react'
import { FaPlay, FaStop } from 'react-icons/fa6'
import { useSound } from '@/lib/tunnel'
import { ParticlePortrait, useParticleGate } from '@/components/r3f/ParticlePortrait'
import hud from './TunnelHUD.module.css'
import s from './FlipPhotoCard.module.css'

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
  const [hovered, setHovered] = useState(false) // dwell passed, or clicked
  const [focused, setFocused] = useState(false) // keyboard focus
  const [warm, setWarm]       = useState(false) // pointer arrived: prebuild
  const dwellRef = useRef(0)

  const cancelDwell = () => {
    if (dwellRef.current) window.clearTimeout(dwellRef.current)
    dwellRef.current = 0
  }
  useEffect(() => () => window.clearTimeout(dwellRef.current), [])

  const toggle = () => setSound(!sound)

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
    if (hovered || dwellRef.current) return
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
    if (keyboard && gate) { setWarm(true); setFocused(true) }
  }

  const onBlur = () => setFocused(false)

  const onClick = () => {
    toggle()
    // A click is intent: skip whatever is left of the dwell.
    if (gate) { cancelDwell(); setWarm(true); setHovered(true) }
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
      aria-label="Play intro video"
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`${hud.portrait} ${s.root}`}
      style={{ width }}
    >
      <div className={hud.portraitFigure}>
        <ParticlePortrait active={gate && (hovered || focused)} warm={warm} />
      </div>

      <span aria-hidden="true" className={`t-label ${s.cue}`}>
        {sound ? <FaStop /> : <FaPlay />}
        {sound ? 'Stop intro' : 'Play intro'}
      </span>
    </div>
  )
}

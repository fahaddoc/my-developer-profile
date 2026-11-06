'use client'

// PortraitIntro — the intro video, played in place of the hero portrait
// ("you come alive in place"). FlipPhotoCard mounts it inside the portrait
// button and drives it from the shared sound store.
//
//   on:   preload stays "none" until the first play, then play with sound (the
//         click on the portrait or the top bar is the user gesture; if the
//         browser still refuses, it plays muted). The layer reveals only once
//         frames are on screen ('playing'), so the portrait never fades into
//         an empty box while the file loads.
//   live: the transparent cutout stands where the portrait stood, bottom
//         aligned to the same baseline and faded by the same bottom mask (plus
//         a short left fade, where the frame cuts the arm), head roughly where
//         the portrait's head is. Ember key rim from the upper left and a cold
//         edge from the right, like the photo's static composite.
//   level: Web Audio (one MediaElementAudioSourceNode -> AnalyserNode ->
//         destination, made once, only after the context is running so the
//         sound can never be swallowed by a suspended context). Each frame a
//         smoothed 0..1 level goes to introLevel / window.__sfIntroLevel and to
//         --lvl here: the rim brightens and an ember sound wave pulses along a
//         gentle arc below the speaker. No Web Audio: no glow, still plays.
//   off / ended: pause in place, fade back to the portrait, rewind after.
//
// Reduced motion: plain crossfade (CSS) and a still wave line whose
// brightness alone follows the voice.

import { useEffect, useRef } from 'react'
import { introLevel } from '@/lib/tunnel'
import s from './PortraitIntro.module.css'

const WAVE_W   = 400       // wave viewBox width
const WAVE_H   = 48        // wave viewBox height
const WAVE_N   = 72        // wave segments
const WAVE_Y   = 20        // arc apex, viewBox units
const WAVE_SAG = 14        // how far the arc ends drop below the apex
const WAVE_AMP = 14        // displacement at full level, viewBox units
const RMS_FLOOR = 0.01     // calibrated on the intro track: median ~0.02,
const RMS_SPAN  = 0.2      //   p90 ~0.15, p99 ~0.32 (1024-sample windows)
const REWIND_MS = 700      // after the fade-out, so the last frame holds
const ZERO_MS   = 600      // the level is exactly 0 by then, rAF or not

interface Meter {
  ctx: AudioContext
  an: AnalyserNode
  time: Uint8Array<ArrayBuffer>
}

interface PortraitIntroProps {
  /** The visitor wants the intro playing (the shared sound store). */
  on: boolean
  /** Frames are on screen (true), or the portrait is coming back (false). */
  onLive: (live: boolean) => void
  /** Finished, failed or unmounted mid-play: hand the sound state back. */
  onEnd: () => void
}

/** The resting arc: highest in the middle, like the top of a planet. */
const arcY = (u: number) => WAVE_Y + WAVE_SAG * (2 * u - 1) * (2 * u - 1)

function wavePath(level: number, t: number): string {
  const amp = level * WAVE_AMP
  let d = ''
  for (let i = 0; i <= WAVE_N; i++) {
    const u = i / WAVE_N
    const taper = Math.pow(Math.sin(Math.PI * u), 1.5)
    const w = amp === 0 ? 0 : amp * taper * (
      0.58 * Math.sin(2 * Math.PI * 1.6 * u - t * 2.6) +
      0.3  * Math.sin(2 * Math.PI * 3.7 * u + t * 3.9) +
      0.12 * Math.sin(2 * Math.PI * 7.3 * u - t * 6.4)
    )
    d += `${i ? 'L' : 'M'}${(u * WAVE_W).toFixed(1)} ${(arcY(u) + w).toFixed(2)}`
  }
  return d
}
const REST_PATH = wavePath(0, 0)

export function PortraitIntro({ on, onLive, onEnd }: PortraitIntroProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pathRef  = useRef<SVGPathElement>(null)
  const meterRef = useRef<Meter | null>(null)
  const ctxRef   = useRef<AudioContext | null>(null)
  const noAudio  = useRef(false)
  const onRef    = useRef(on)
  const cbRef    = useRef({ onLive, onEnd })
  const rafRef   = useRef(0)
  const lvlRef   = useRef(0)   // smoothed level
  const cssRef   = useRef(-1)  // last --lvl written
  const phaseRef = useRef(0)   // wave phase, advances faster when loud
  const lastRef  = useRef(0)
  const stopping = useRef(false)
  const rewindRef = useRef(0)
  const zeroRef  = useRef(0)
  const calmRef  = useRef(false)
  cbRef.current = { onLive, onEnd }

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => { calmRef.current = mq.matches }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // ── level meter (rAF while playing, then a short decay to exactly 0) ──────
  const writeLevel = (lvl: number) => {
    introLevel.set(lvl)
    if (Math.abs(lvl - cssRef.current) < 0.004 && lvl !== 0) return
    cssRef.current = lvl
    layerRef.current?.style.setProperty('--lvl', lvl.toFixed(3))
  }

  const tick = (now: number) => {
    const dt = Math.min(0.1, lastRef.current ? (now - lastRef.current) / 1000 : 1 / 60)
    lastRef.current = now
    let target = 0
    const m = meterRef.current
    if (m && !stopping.current) {
      m.an.getByteTimeDomainData(m.time)
      let sum = 0
      for (let i = 0; i < m.time.length; i += 2) {
        const v = (m.time[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / (m.time.length / 2))
      target = Math.pow(Math.min(1, Math.max(0, (rms - RMS_FLOOR) / RMS_SPAN)), 0.75)
    }
    // Fast attack, slower release, frame-rate independent.
    const k = 1 - Math.exp(-dt * (target > lvlRef.current ? 22 : stopping.current ? 9 : 6))
    let lvl = lvlRef.current + (target - lvlRef.current) * k
    if (stopping.current && lvl < 0.005) lvl = 0
    lvlRef.current = lvl
    writeLevel(lvl)

    const path = pathRef.current
    if (path) {
      if (calmRef.current) {
        path.setAttribute('d', REST_PATH)
      } else {
        phaseRef.current += dt * (0.6 + lvl * 2.2)
        path.setAttribute('d', wavePath(lvl, phaseRef.current))
      }
    }

    if (stopping.current && lvl === 0) { rafRef.current = 0; lastRef.current = 0; return }
    rafRef.current = requestAnimationFrame(tick)
  }

  const startMeter = () => {
    window.clearTimeout(zeroRef.current)
    stopping.current = false
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick)
  }
  const stopMeter = () => {
    stopping.current = true
    if (!rafRef.current && lvlRef.current > 0) rafRef.current = requestAnimationFrame(tick)
    // A throttled or hidden tab may not finish the decay: force the 0.
    window.clearTimeout(zeroRef.current)
    zeroRef.current = window.setTimeout(() => {
      if (!stopping.current) return
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      lastRef.current = 0
      lvlRef.current = 0
      writeLevel(0)
      pathRef.current?.setAttribute('d', REST_PATH)
    }, ZERO_MS)
  }

  // ── Web Audio: once, inside the gesture, routed only when running ─────────
  const ensureAudio = (v: HTMLVideoElement) => {
    if (noAudio.current) return
    const existing = ctxRef.current
    if (existing) {
      if (existing.state !== 'running') existing.resume().catch(() => { /* stays silent-safe */ })
      return
    }
    const AC = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) { noAudio.current = true; return }
    let ctx: AudioContext
    try { ctx = new AC() } catch { noAudio.current = true; return }
    ctxRef.current = ctx
    const attach = () => {
      if (meterRef.current || ctx.state !== 'running') return
      try {
        const src = ctx.createMediaElementSource(v)
        const an = ctx.createAnalyser()
        an.fftSize = 1024
        an.smoothingTimeConstant = 0.5
        src.connect(an)
        an.connect(ctx.destination)
        meterRef.current = { ctx, an, time: new Uint8Array(an.fftSize) }
      } catch {
        noAudio.current = true
      }
    }
    if (ctx.state === 'running') attach()
    else ctx.resume().then(attach, () => { noAudio.current = true })
  }

  // ── playback from the shared state ─────────────────────────────────────────
  useEffect(() => {
    onRef.current = on
    const v = videoRef.current
    if (!v) return
    window.clearTimeout(rewindRef.current)

    if (!on) {
      if (!v.paused) v.pause()
      stopMeter()
      cbRef.current.onLive(false)
      rewindRef.current = window.setTimeout(() => {
        if (!onRef.current && v.paused && v.currentTime > 0) {
          try { v.currentTime = 0 } catch { /* not seekable yet */ }
        }
      }, REWIND_MS)
      return
    }

    if (v.preload !== 'auto') v.preload = 'auto'
    if (v.ended) { try { v.currentTime = 0 } catch { /* restarts anyway */ } }
    v.muted = false
    ensureAudio(v)
    v.play().catch((err: unknown) => {
      if (!onRef.current) return
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'AbortError') return            // paused before it started
      if (name !== 'NotAllowedError') { cbRef.current.onEnd(); return }
      v.muted = true                                // no gesture left: muted
      v.play().catch(() => { if (onRef.current) cbRef.current.onEnd() })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on])

  // ── element events and teardown ────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const playing = () => {
      if (!onRef.current) { v.pause(); return }
      cbRef.current.onLive(true)
      startMeter()
    }
    const ended = () => cbRef.current.onEnd()
    v.addEventListener('playing', playing)
    v.addEventListener('ended', ended)
    return () => {
      v.removeEventListener('playing', playing)
      v.removeEventListener('ended', ended)
      window.clearTimeout(rewindRef.current)
      window.clearTimeout(zeroRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      const wasPlaying = !v.paused
      v.pause()
      introLevel.set(0)
      ctxRef.current?.close().catch(() => { /* already closed */ })
      ctxRef.current = null
      meterRef.current = null
      if (wasPlaying || onRef.current) cbRef.current.onEnd()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={layerRef} className={s.intro} aria-hidden="true">
      <div className={s.clip}>
        <video ref={videoRef} className={s.video} playsInline preload="none" width={720} height={720}>
          <source src="/videos/shah-intro.webm" type="video/webm" />
          <source src="/videos/shah-intro.mov"  type='video/mp4; codecs="hvc1"' />
          <source src="/videos/shah-intro.mp4"  type="video/mp4" />
        </video>
      </div>
      <svg className={s.wave} viewBox={`0 0 ${WAVE_W} ${WAVE_H}`} preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id="sf-intro-wave" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0"    stopOpacity="0" />
            <stop offset="0.22" stopOpacity="1" />
            <stop offset="0.78" stopOpacity="1" />
            <stop offset="1"    stopOpacity="0" />
          </linearGradient>
        </defs>
        <path ref={pathRef} d={REST_PATH} stroke="url(#sf-intro-wave)" />
      </svg>
    </div>
  )
}

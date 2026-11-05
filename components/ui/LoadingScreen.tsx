'use client'

// LoadingScreen — the title card, drawn as an overlay ABOVE the app.
//
// app/page.tsx mounts <AppShell/> underneath from the first frame, so the
// app's chunks download, hydrate and (on desktop) compile the WebGL scene
// while this card plays. The card never hands off to an empty frame: it holds
// its last frame until AppShell calls signalAppReady(), then crossfades out.
//
// Desktop (hover: hover) — 2.2s, then the held last frame:
//      0ms  a single ember point ignites above centre (260ms)
//     40ms  "Shah" rises out of its mask (380ms expo), "Fahad" 60ms behind,
//           so the name is up by ~300ms: the first frames are contentful
//     40ms  the light blooms out softly (one radial-gradient layer)
//    440ms  a hairline fills underneath
//   1640ms  the name and the line leave, the bloom draws back into the point
//   2200ms  only the point remains, breathing; held until the app reports
//           ready (sf:app-ready), at most 1.5s more, then a 280ms crossfade
// Touch (hover: none) — the same card, faster, with no exit: the whole card
//   fades out from 1120ms and is gone by 1.4s. That fade is on the CSS
//   timeline, so a slow hydrate on a phone cannot stretch it. Underneath sits
//   either the app or AppShell's boot frame (the same point, same place).
// Reduced motion: the card is composed from frame 0 and only crossfades.
//
// Every animated property is composited (transform / opacity). The CSS ships
// in the server HTML (a plain <style>), so the sequence starts at first paint
// and keeps running on the compositor through hydration; the JS timers are
// anchored to that CSS timeline. Theme-aware: every colour is a token.
//
// <html> attributes, also set before first paint by the inline script in
// app/layout.tsx:
//   data-booting  while the card is up (other layers can hold their entrance)
//   data-booted   this session has seen the card; it is hidden at once

import { useEffect, useRef, useState } from 'react'

/** Window event AppShell fires once its first real frame is on screen. */
export const APP_READY_EVENT   = 'sf:app-ready'
/** Window event the tunnel scene may fire after its first rendered frame. */
export const SCENE_READY_EVENT = 'sf:scene-ready'
/** Window event fired when the card starts to leave (the app is revealed). */
export const LOADER_EXIT_EVENT = 'sf:loader-exit'

type ReadyWindow = Window & { __sfAppReady?: boolean }

/** Called by AppShell when the tunnel's first frame (or MobileSpace) is up. */
export function signalAppReady() {
  if (typeof window === 'undefined') return
  const w = window as ReadyWindow
  if (w.__sfAppReady) return
  w.__sfAppReady = true
  window.dispatchEvent(new Event(APP_READY_EVENT))
}

function isAppReady(): boolean {
  return typeof window !== 'undefined' && !!(window as ReadyWindow).__sfAppReady
}

/** Start downloading the chunks the visible experience will need, so they
 *  arrive in parallel with AppShell instead of after it. Idempotent: the
 *  bundler caches each import. */
export function warmAppChunks(kind: 'tunnel' | 'mobile') {
  if (kind === 'tunnel') {
    import('@/components/r3f/TunnelScene').catch(() => {})
    import('@/components/r3f/TunnelHUD').catch(() => {})
  } else {
    import('@/components/mobile/MobileSpace').catch(() => {})
  }
}

// ─── Timeline (ms) ───────────────────────────────────────────────────────────
const DESK_TOTAL     = 2200 // desktop: only the ember point remains
const TOUCH_FADE_AT  = 1120 // touch: the whole card starts to fade
const FADE_MS        = 280  // the crossfade into the app
const TOUCH_TOTAL    = TOUCH_FADE_AT + FADE_MS // 1400: the touch cap
const REDUCED_HOLD   = 700  // desktop, reduced motion: card shown at least this long
const MAX_HOLD_MS    = 1500 // the longest the last frame waits for the app
const WARM_AT_MS     = 120  // warm the experience's chunks once the card is painted

/** Vertical position of the ember point, shared by the card and the boot
 *  frame so the handoff frame is identical. */
const EMBER_TOP = '38%'

interface Props { onComplete: () => void }

export function LoadingScreen({ onComplete }: Props) {
  const [gone, setGone] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const html = document.documentElement
    // Already seen this session: the inline script hid the card before paint
    // and app/page.tsx is about to unmount it. Do nothing.
    if (html.hasAttribute('data-booted')) return

    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    html.setAttribute('data-booting', '')

    // The tunnel's 500vh scroll track already exists under the card. Lenis
    // scrolls it from wheel events even with overflow hidden, so swallow the
    // wheel before Lenis (a bubble listener on window) can see it.
    const blockWheel = (e: WheelEvent) => { e.preventDefault(); e.stopPropagation() }
    window.addEventListener('wheel', blockWheel, { capture: true, passive: false })

    const touch   = window.matchMedia('(hover: none)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const timers: number[] = []
    let onReady: (() => void) | null = null
    let idle = 0
    let cancelled = false

    let exited = false
    const exit = () => {
      if (exited) return
      exited = true
      html.removeAttribute('data-booting')
      window.dispatchEvent(new Event(LOADER_EXIT_EVENT))
    }
    let completed = false
    const complete = () => {
      if (completed) return
      completed = true
      exit()
      html.setAttribute('data-booted', '')
      setGone(true)
      onCompleteRef.current()
    }

    // Schedule everything on the CSS timeline. `elapsed` is how far it is.
    const begin = (elapsed: number) => {
      if (cancelled) return
      const at = (ms: number, fn: () => void) => {
        timers.push(window.setTimeout(fn, Math.max(0, ms - elapsed)))
      }

      if (touch) {
        // The fade itself is CSS (see .sfl-loader under hover: none).
        at(TOUCH_FADE_AT, exit)
        at(TOUCH_TOTAL, complete)
      } else {
        const natural = reduced ? REDUCED_HOLD : DESK_TOTAL
        let naturalDone = false
        let ready = isAppReady()
        const fade = () => {
          if (exited) return
          exit()
          rootRef.current?.classList.add('sfl-loader--out')
          timers.push(window.setTimeout(complete, FADE_MS + 40))
        }
        onReady = () => { ready = true; if (naturalDone) fade() }
        window.addEventListener(APP_READY_EVENT, onReady)
        at(natural, () => { naturalDone = true; if (ready) fade() })
        // Cap: never hold the last frame longer than this. Underneath is the
        // app, or AppShell's boot frame (the same point), never a blank page.
        at(natural + MAX_HOLD_MS, fade)
      }

      // Warm the chunks of whichever experience AppShell will pick, in
      // parallel with AppShell itself. Main-thread work cannot stutter the card.
      at(WARM_AT_MS, () => {
        const forced = new URLSearchParams(window.location.search).get('view')
        const desktop = window.matchMedia('(min-width: 1024px) and (hover: hover)').matches && !reduced
        const kind = forced === 'tunnel' ? 'tunnel' : forced === 'mobile' ? 'mobile' : desktop ? 'tunnel' : 'mobile'
        const run = () => warmAppChunks(kind)
        if ('requestIdleCallback' in window) idle = window.requestIdleCallback(run, { timeout: 300 })
        else run()
      })
    }

    // The CSS timeline starts at the card's first rendered frame, which is
    // usually long before hydration. But when cached JS keeps the main thread
    // busy before any frame, the animations are still pending here
    // (currentTime 0): wait until they actually start (Animation.ready), then
    // read how far they are. Otherwise the timers would run ahead and cut the
    // card mid-sequence.
    let anims: Animation[] = []
    try { anims = rootRef.current?.getAnimations?.({ subtree: true }) ?? [] } catch { anims = [] }
    const readElapsed = () => {
      let elapsed = 0
      for (const a of anims) {
        const t = a.currentTime
        if (typeof t === 'number' && Number.isFinite(t)) elapsed = Math.max(elapsed, t)
      }
      return elapsed
    }
    if (anims.length === 0) begin(0) // reduced motion on desktop: nothing animates
    else {
      Promise.all(anims.map((a) => a.ready.catch(() => a)))
        .then(() => begin(readElapsed()))
        .catch(() => begin(0))
    }

    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
      if (idle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle)
      if (onReady) window.removeEventListener(APP_READY_EVENT, onReady)
      window.removeEventListener('wheel', blockWheel, { capture: true })
      html.removeAttribute('data-booting')
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [])

  if (gone) return null

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="sfl-loader"
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     'var(--z-loader, 9999)',
        background: 'rgb(var(--space-0))',
        overflow:   'hidden',
        contain:    'layout paint size',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />
      <EmberLight variant="intro" />

      <div className="sfl-title">
        <p className="t-display sfl-name">
          <span className="sfl-mask"><span className="sfl-word sfl-word--a">Shah</span></span>{' '}
          <span className="sfl-mask"><span className="sfl-word sfl-word--b">Fahad</span></span>
        </p>
        <span className="sfl-track"><span className="sfl-fill" /></span>
      </div>

      {/* Same film grain as the site (globals.css), scoped inside the card. */}
      <div className="grain" />
    </div>
  )
}

/**
 * BootFrame — the loader's last frame, held: the same space and the same
 * ember point in the same place, breathing gently. It covers every step on
 * the way to the first real frame (AppShell's chunk, eligibility and GPU
 * tier, the scene's chunk and first draw, MobileSpace's chunk), so nothing
 * ever shows an empty page. `leaving` fades it out (280ms, opacity only);
 * the owner unmounts it after. Static under reduced motion.
 */
export function BootFrame({ leaving = false }: { leaving?: boolean }) {
  return (
    <div
      role="status"
      aria-hidden={leaving || undefined}
      style={{
        position:      'fixed',
        inset:         0,
        background:    'rgb(var(--space-0))',
        zIndex:        5,
        overflow:      'hidden',
        opacity:       leaving ? 0 : 1,
        transition:    `opacity ${FADE_MS}ms var(--ease-out)`,
        pointerEvents: leaving ? 'none' : undefined,
      }}
    >
      <EmberLight variant="idle" />
      <span className="sr-only">Loading the portfolio…</span>
    </div>
  )
}

/** How long BootFrame's `leaving` fade takes; unmount it after this. */
export const BOOT_FADE_MS = FADE_MS

/**
 * EmberLight — the one warm light of the intro.
 *  - intro: ignites, blooms, draws back into the point, then breathes.
 *  - idle:  the drawn-back state, breathing gently (BootFrame).
 * The idle variant starts on the intro's drawn-back frame. Reduced motion: no
 * scale anywhere, the point stays.
 */
export function EmberLight({ variant }: { variant: 'intro' | 'idle' }) {
  return (
    <div className={`sfl-ember sfl-ember--${variant}`} aria-hidden>
      <style dangerouslySetInnerHTML={{ __html: EMBER_CSS }} />
      <span className="sfl-bloom" />
      <span className="sfl-core" />
    </div>
  )
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
// Keyframe stops are computed from the ms timeline above; each segment
// carries its own easing.

const EXPO_OUT  = 'cubic-bezier(0.16, 1, 0.3, 1)'
const QUINT_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'
const IN_OUT    = 'cubic-bezier(0.65, 0, 0.35, 1)'

/** ms on a timeline of `total` ms → a keyframe offset. */
const p = (ms: number, total: number) => `${+((ms / total) * 100).toFixed(3)}%`

/** A word that rises into its mask (and, on desktop, leaves upward). */
function wordKeyframes(name: string, total: number, inAt: number, inEnd: number, out?: [number, number]) {
  return `
@keyframes ${name} {
  0% { transform: translateY(110%); }
  ${p(inAt, total)} { transform: translateY(110%); animation-timing-function: ${EXPO_OUT}; }
  ${p(inEnd, total)} { transform: translateY(0); }
  ${out ? `${p(out[0], total)} { transform: translateY(0); animation-timing-function: ${IN_OUT}; }
  ${p(out[1], total)} { transform: translateY(-110%); }
  100% { transform: translateY(-110%); }` : '100% { transform: translateY(0); }'}
}`
}

const D = DESK_TOTAL
const T = TOUCH_TOTAL

const LOADER_CSS = `
html[data-booted] .sfl-loader { display: none; }
.sfl-loader { transition: opacity ${FADE_MS}ms ${QUINT_OUT}; }
.sfl-loader--out { opacity: 0; pointer-events: none; }
.sfl-title {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(${EMBER_TOP} + clamp(52px, 8vh, 84px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(22px, 3.4vh, 34px);
  padding: 0 16px;
}
.sfl-name {
  margin: 0;
  font-size: clamp(56px, 7vw, 96px);
  color: rgb(var(--ink));
  text-align: center;
}
@media (max-width: 767px) {
  .sfl-name { font-size: clamp(44px, 13.5vw, 64px); }
}
/* The mask: each word rises from below its own line box. Padding with a
   matching negative margin keeps the wide cut's ascenders unshaved. */
.sfl-mask {
  display: inline-block;
  overflow: hidden;
  vertical-align: top;
  padding: 0.08em 0.04em 0.12em;
  margin: -0.08em -0.04em -0.12em;
}
.sfl-word {
  display: inline-block;
  transform: translateY(110%);
  will-change: transform;
}
.sfl-word--a { animation: sfl-word-a ${D}ms linear both; }
.sfl-word--b { animation: sfl-word-b ${D}ms linear both; }
.sfl-track {
  position: relative;
  display: block;
  width: min(200px, 44vw);
  height: 1px;
  overflow: hidden;
  background: rgb(var(--ink) / 0.16);
  opacity: 0;
  animation: sfl-track ${D}ms linear both;
}
.sfl-fill {
  position: absolute;
  inset: 0;
  background: rgb(var(--accent));
  transform-origin: 0 50%;
  transform: scaleX(0);
  animation: sfl-fill ${D}ms linear both;
}
${wordKeyframes('sfl-word-a', D, 40, 420, [1640, 2000])}
${wordKeyframes('sfl-word-b', D, 100, 480, [1700, 2060])}
@keyframes sfl-track {
  0% { opacity: 0; }
  ${p(380, D)} { opacity: 0; animation-timing-function: ${QUINT_OUT}; }
  ${p(560, D)} { opacity: 1; }
  ${p(1640, D)} { opacity: 1; animation-timing-function: ${QUINT_OUT}; }
  ${p(1940, D)} { opacity: 0; }
  100% { opacity: 0; }
}
@keyframes sfl-fill {
  0% { transform: scaleX(0); }
  ${p(440, D)} { transform: scaleX(0); animation-timing-function: ${IN_OUT}; }
  ${p(1320, D)} { transform: scaleX(1); }
  100% { transform: scaleX(1); }
}

/* Touch: faster, no exit; the whole card fades on the CSS timeline. The
   opacity fade and the end-of-fade visibility flip are separate animations:
   visibility cannot run on the compositor, and sharing one keyframe effect
   would pull the opacity fade onto the (hydrating, busy) main thread too. */
@media (hover: none) {
  .sfl-loader {
    animation:
      sfl-out ${T}ms linear both,
      sfl-hide ${T}ms step-end both;
  }
  .sfl-word--a { animation: sfl-word-a-t ${T}ms linear both; }
  .sfl-word--b { animation: sfl-word-b-t ${T}ms linear both; }
  .sfl-track   { animation: sfl-track-t ${T}ms linear both; }
  .sfl-fill    { animation: sfl-fill-t ${T}ms linear both; }
}
${wordKeyframes('sfl-word-a-t', T, 20, 340)}
${wordKeyframes('sfl-word-b-t', T, 70, 390)}
@keyframes sfl-track-t {
  0% { opacity: 0; }
  ${p(240, T)} { opacity: 0; animation-timing-function: ${QUINT_OUT}; }
  ${p(380, T)} { opacity: 1; }
  100% { opacity: 1; }
}
@keyframes sfl-fill-t {
  0% { transform: scaleX(0); }
  ${p(280, T)} { transform: scaleX(0); animation-timing-function: ${IN_OUT}; }
  ${p(1000, T)} { transform: scaleX(1); }
  100% { transform: scaleX(1); }
}
@keyframes sfl-out {
  0% { opacity: 1; }
  ${p(TOUCH_FADE_AT, T)} { opacity: 1; animation-timing-function: ${QUINT_OUT}; }
  100% { opacity: 0; }
}
@keyframes sfl-hide {
  0%, 99.99% { visibility: visible; }
  100% { visibility: hidden; }
}

/* Reduced motion: composed from frame 0; only the card's crossfade moves. */
@media (prefers-reduced-motion: reduce) {
  .sfl-word,
  .sfl-word--a,
  .sfl-word--b,
  .sfl-fill { animation: none; transform: none; }
  .sfl-track { opacity: 1; animation: none; }
}
`

const EMBER_CSS = `
.sfl-ember {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.sfl-bloom,
.sfl-core {
  position: absolute;
  left: 50%;
  top: ${EMBER_TOP};
  border-radius: 50%;
}
.sfl-bloom {
  --sfl-size: min(104vmin, 1040px);
  width: var(--sfl-size);
  height: var(--sfl-size);
  margin: calc(var(--sfl-size) / -2) 0 0 calc(var(--sfl-size) / -2);
  background: radial-gradient(
    closest-side,
    rgb(var(--accent) / 0.30),
    rgb(var(--accent) / 0.085) 34%,
    rgb(var(--accent) / 0.022) 60%,
    rgb(var(--accent) / 0.006) 80%,
    rgb(var(--accent) / 0)
  );
  will-change: transform, opacity;
}
[data-theme='light'] .sfl-bloom {
  background: radial-gradient(
    closest-side,
    rgb(var(--accent) / 0.22),
    rgb(var(--accent) / 0.07) 36%,
    rgb(var(--accent) / 0.018) 62%,
    rgb(var(--accent) / 0.005) 80%,
    rgb(var(--accent) / 0)
  );
}
.sfl-core {
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  background: rgb(var(--accent));
  box-shadow:
    0 0 0 1px rgb(var(--accent) / 0.4),
    0 0 10px 2px rgb(var(--accent) / 0.85),
    0 0 34px 8px rgb(var(--accent) / 0.4);
  will-change: transform, opacity;
}
[data-theme='light'] .sfl-core {
  box-shadow:
    0 0 0 1px rgb(var(--accent) / 0.35),
    0 0 10px 2px rgb(var(--accent) / 0.55),
    0 0 30px 6px rgb(var(--accent) / 0.22);
}
/* Desktop intro: ignite, bloom, draw back, then breathe while the last frame
   is held (the second animation takes over at ${D}ms). */
.sfl-ember--intro .sfl-core  { animation: sfl-core ${D}ms linear both; }
.sfl-ember--intro .sfl-bloom {
  animation:
    sfl-bloom ${D}ms linear both,
    sfl-breathe 3200ms ease-in-out ${D}ms infinite none;
}
@keyframes sfl-core {
  0% { opacity: 0; transform: scale(0.2); animation-timing-function: ${EXPO_OUT}; }
  ${p(260, D)} { opacity: 1; transform: scale(1); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes sfl-bloom {
  0% { opacity: 0; transform: scale(0.2); }
  ${p(40, D)} { opacity: 0; transform: scale(0.2); animation-timing-function: ${EXPO_OUT}; }
  ${p(1000, D)} { opacity: 1; transform: scale(1); }
  ${p(1600, D)} { opacity: 0.9; transform: scale(1); animation-timing-function: ${IN_OUT}; }
  100% { opacity: 0.55; transform: scale(0.36); }
}
/* Touch intro: ignite and bloom, then hold open while the card fades. */
@media (hover: none) {
  .sfl-ember--intro .sfl-core  { animation: sfl-core-t ${T}ms linear both; }
  .sfl-ember--intro .sfl-bloom { animation: sfl-bloom-t ${T}ms linear both; }
}
@keyframes sfl-core-t {
  0% { opacity: 0; transform: scale(0.2); animation-timing-function: ${EXPO_OUT}; }
  ${p(200, T)} { opacity: 1; transform: scale(1); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes sfl-bloom-t {
  0% { opacity: 0; transform: scale(0.2); }
  ${p(20, T)} { opacity: 0; transform: scale(0.2); animation-timing-function: ${EXPO_OUT}; }
  ${p(760, T)} { opacity: 1; transform: scale(1); }
  100% { opacity: 1; transform: scale(1); }
}
/* idle (BootFrame): starts exactly where the desktop intro draws back to */
.sfl-ember--idle .sfl-bloom {
  opacity: 0.55;
  transform: scale(0.36);
  animation: sfl-breathe 3200ms ease-in-out infinite;
}
@keyframes sfl-breathe {
  0%, 100% { opacity: 0.55; transform: scale(0.36); }
  50%      { opacity: 0.75; transform: scale(0.42); }
}
@media (prefers-reduced-motion: reduce) {
  .sfl-ember--intro .sfl-core { animation: none; opacity: 1; transform: none; }
  .sfl-ember--intro .sfl-bloom { animation: none; opacity: 0.9; transform: none; }
  .sfl-ember--idle .sfl-bloom { animation: none; opacity: 0.55; transform: scale(0.36); }
}
`

'use client'

// LoadingScreen — the title card. One orchestrated moment, 2.6s:
//
//   0.15s  a single ember point ignites above centre
//   0.25s  its light blooms out softly (one radial-gradient layer)
//   0.65s  "Shah Fahad" rises out of a mask, word by word
//   0.90s  a hairline fills underneath
//   2.05s  the name and the line leave, the bloom draws back into the point
//   2.60s  onComplete — only the point remains, and AppShell's BootSpinner
//          picks it up in exactly the same place (EmberLight variant="idle")
//
// Every animated property is composited (transform / opacity). The CSS ships
// in the server HTML (a plain <style>, not styled-jsx, which the App Router
// does not server-render here), so the sequence starts at first paint and
// keeps running on the compositor through the hydration block. The
// completion timer is anchored to that CSS timeline, so a slow hydrate does
// not stretch the intro.
//
// Theme-aware: every colour is a token, and the no-flash script has set
// <html data-theme> before first paint. Reduced motion: the card appears
// composed and crossfades to the point in 560ms.

import { useEffect, useRef, useState } from 'react'

const TOTAL_MS         = 2600
const REDUCED_TOTAL_MS = 560
// Warm the AppShell chunk once the name has landed, so the handoff to the
// tunnel has no blank gap. Safe: the loader runs on the compositor.
const WARM_SHELL_AT_MS = 1500

/** Vertical position of the ember point, shared by the loader and the boot
 *  spinner so the handoff frame is identical. */
const EMBER_TOP = '38%'

interface Props { onComplete: () => void }

export function LoadingScreen({ onComplete }: Props) {
  const [gone, setGone] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const total = reduced ? REDUCED_TOTAL_MS : TOTAL_MS

    // How far the CSS timeline already is (it started at first paint).
    let elapsed = 0
    try {
      const anims = rootRef.current?.getAnimations?.({ subtree: true }) ?? []
      for (const a of anims) {
        const t = a.currentTime
        if (typeof t === 'number' && Number.isFinite(t)) elapsed = Math.max(elapsed, t)
      }
    } catch { /* getAnimations unsupported: fall back to the full duration */ }

    const done = window.setTimeout(() => {
      setGone(true)
      onCompleteRef.current()
    }, Math.max(80, total - elapsed))

    let idle = 0
    const warm = window.setTimeout(() => {
      const run = () => { import('@/components/AppShell').catch(() => {}) }
      if ('requestIdleCallback' in window) idle = window.requestIdleCallback(run, { timeout: 600 })
      else run()
    }, Math.max(0, (reduced ? 0 : WARM_SHELL_AT_MS) - elapsed))

    return () => {
      window.clearTimeout(done)
      window.clearTimeout(warm)
      if (idle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle)
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
          <span className="sfl-mask"><span className="sfl-word">Shah</span></span>{' '}
          <span className="sfl-mask"><span className="sfl-word sfl-word--late">Fahad</span></span>
        </p>
        <span className="sfl-track"><span className="sfl-fill" /></span>
      </div>

      {/* Same film grain as the site (globals.css), scoped inside the card. */}
      <div className="grain" />
    </div>
  )
}

/**
 * EmberLight — the one warm light of the intro.
 *  - intro: ignites, blooms, then draws back into the point (2.6s).
 *  - idle:  the drawn-back state, breathing gently (BootSpinner).
 * The idle variant starts on the intro's last frame. Reduced motion: no
 * scale anywhere; the intro's bloom fades out, the idle bloom is hidden, the
 * point stays.
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
// Keyframe stops are fractions of 2600ms; each segment carries its own easing.

const EXPO_OUT   = 'cubic-bezier(0.16, 1, 0.3, 1)'
const QUINT_OUT  = 'cubic-bezier(0.22, 1, 0.36, 1)'
const IN_OUT     = 'cubic-bezier(0.65, 0, 0.35, 1)'

const LOADER_CSS = `
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
  animation: sfl-word ${TOTAL_MS}ms linear both;
  will-change: transform;
}
.sfl-word--late { animation-delay: 80ms; }
.sfl-track {
  position: relative;
  display: block;
  width: min(200px, 44vw);
  height: 1px;
  overflow: hidden;
  background: rgb(var(--ink) / 0.16);
  opacity: 0;
  animation: sfl-track ${TOTAL_MS}ms linear both;
}
.sfl-fill {
  position: absolute;
  inset: 0;
  background: rgb(var(--accent));
  transform-origin: 0 50%;
  transform: scaleX(0);
  animation: sfl-fill ${TOTAL_MS}ms linear both;
}
@keyframes sfl-word {
  0%    { transform: translateY(110%); }
  25%   { transform: translateY(110%); animation-timing-function: ${EXPO_OUT}; }
  59.6% { transform: translateY(0); }
  78.8% { transform: translateY(0); animation-timing-function: ${IN_OUT}; }
  94.2% { transform: translateY(-110%); }
  100%  { transform: translateY(-110%); }
}
@keyframes sfl-track {
  0%    { opacity: 0; }
  26.9% { opacity: 0; animation-timing-function: ${QUINT_OUT}; }
  38.5% { opacity: 1; }
  76.9% { opacity: 1; animation-timing-function: ${QUINT_OUT}; }
  88.5% { opacity: 0; }
  100%  { opacity: 0; }
}
@keyframes sfl-fill {
  0%    { transform: scaleX(0); }
  34.6% { transform: scaleX(0); animation-timing-function: ${IN_OUT}; }
  76.9% { transform: scaleX(1); }
  100%  { transform: scaleX(1); }
}
@keyframes sfl-fade-out {
  0%, 40% { opacity: 1; }
  100%    { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .sfl-word,
  .sfl-fill { animation: none; transform: none; }
  .sfl-track { opacity: 1; animation: none; }
  .sfl-title { animation: sfl-fade-out ${REDUCED_TOTAL_MS}ms linear both; }
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
.sfl-ember--intro .sfl-core  { animation: sfl-core ${TOTAL_MS}ms linear both; }
.sfl-ember--intro .sfl-bloom { animation: sfl-bloom ${TOTAL_MS}ms linear both; }
@keyframes sfl-core {
  0%    { opacity: 0; transform: scale(0.2); }
  5.8%  { opacity: 0; transform: scale(0.2); animation-timing-function: ${EXPO_OUT}; }
  25%   { opacity: 1; transform: scale(1); }
  100%  { opacity: 1; transform: scale(1); }
}
@keyframes sfl-bloom {
  0%    { opacity: 0;    transform: scale(0.2); }
  9.6%  { opacity: 0;    transform: scale(0.2); animation-timing-function: ${EXPO_OUT}; }
  53.8% { opacity: 1;    transform: scale(1); }
  80.8% { opacity: 0.9;  transform: scale(1); animation-timing-function: ${IN_OUT}; }
  100%  { opacity: 0.55; transform: scale(0.36); }
}
/* idle: starts exactly where the intro ends */
.sfl-ember--idle .sfl-bloom {
  opacity: 0.55;
  transform: scale(0.36);
  animation: sfl-breathe 3200ms ease-in-out infinite;
}
@keyframes sfl-breathe {
  0%, 100% { opacity: 0.55; transform: scale(0.36); }
  50%      { opacity: 0.75; transform: scale(0.42); }
}
@keyframes sfl-bloom-fade {
  0%, 40% { opacity: 0.9; }
  100%    { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .sfl-ember--intro .sfl-core { animation: none; opacity: 1; transform: none; }
  .sfl-ember--intro .sfl-bloom {
    transform: none;
    animation: sfl-bloom-fade ${REDUCED_TOTAL_MS}ms linear both;
  }
  .sfl-ember--idle .sfl-bloom { animation: none; opacity: 0; }
}
`

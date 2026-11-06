'use client'

// ChatLauncher — a CSS-only copy of the LeFlux chat launcher and its greeting
// bubble ("Hi! Need help finding something?"), so the page can show the chat
// entry point without loading the ~150KB gz widget. LeFluxEmbed owns the
// loading; this component only renders and reports intent:
//
//   onIntent  pointerenter / focus on the launcher or the bubble's text:
//             start fetching the widget so it is ready by the click.
//   onOpen    click on either: open the chat as soon as it is ready.
//   busy      clicked, the widget is still loading (an arc runs round it).
//   handedOver  the real launcher is on screen in the same spot: ours goes,
//             and a visible greeting stays a moment longer while LeFlux's
//             own bubble fades in over it.
//
// Hidden while <html data-booting> (CSS). The greeting shows once per page
// load, GREETING_DELAY_MS after the loader has gone, unless the visitor
// closed it this session or closed LeFlux's own within its 24h window.
// Closing ours also writes LeFlux's key, so the real widget does not bring
// the greeting back after the hand-over.

import { useEffect, useState } from 'react'
import s from './ChatLauncher.module.css'

/** LeFlux's nudge text on this site (its default; the site config sets none). */
const GREETING = 'Hi! Need help finding something?'
/** The launcher label LeFlux uses here. */
const LABEL = 'Shah Fahad Assistant'
/** After the loader: about when LeFlux's own greeting used to appear. */
const GREETING_DELAY_MS = 4000
/** LeFlux shows its bubble ~1.05s after it is ready; hold ours until then. */
const GREETING_OVERLAP_MS = 1200
const BUBBLE_OUT_MS = 280

const SESSION_KEY = 'sf-chat-greeting-closed'
/** LeFlux's own dismissal record: a timestamp, honoured for 24 hours. */
const LEFLUX_DISMISS_KEY = 'leflux:nudgeDismissed'
const LEFLUX_DISMISS_TTL_MS = 24 * 60 * 60 * 1000

type Greeting = 'waiting' | 'shown' | 'leaving' | 'gone'

/** Calls `cb` once <html data-booting> is gone (at once if it never was). */
export function whenBooted(cb: () => void): () => void {
  const html = document.documentElement
  if (!html.hasAttribute('data-booting')) {
    cb()
    return () => {}
  }
  const mo = new MutationObserver(() => {
    if (html.hasAttribute('data-booting')) return
    mo.disconnect()
    cb()
  })
  mo.observe(html, { attributes: true, attributeFilter: ['data-booting'] })
  return () => mo.disconnect()
}

function greetingDismissed(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return true
    const at = Number(localStorage.getItem(LEFLUX_DISMISS_KEY))
    return at > 0 && Date.now() - at < LEFLUX_DISMISS_TTL_MS
  } catch {
    return false
  }
}

function rememberDismissal() {
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
  try { localStorage.setItem(LEFLUX_DISMISS_KEY, String(Date.now())) } catch {}
}

type Props = {
  busy: boolean
  handedOver: boolean
  onIntent: () => void
  onOpen: () => void
}

export function ChatLauncher({ busy, handedOver, onIntent, onOpen }: Props) {
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState<Greeting>('waiting')

  useEffect(() => setMounted(true), [])

  // Schedule the greeting once the loader has gone. A hand-over cancels a
  // greeting that has not shown yet: LeFlux then brings its own.
  useEffect(() => {
    if (!mounted || handedOver) return
    if (greetingDismissed()) {
      setGreeting('gone')
      return
    }
    let timer = 0
    const stop = whenBooted(() => {
      timer = window.setTimeout(() => setGreeting((g) => (g === 'waiting' ? 'shown' : g)), GREETING_DELAY_MS)
    })
    return () => {
      stop()
      window.clearTimeout(timer)
    }
  }, [mounted, handedOver])

  // Hand-over with the greeting up: keep it until LeFlux's has faded in on top.
  useEffect(() => {
    if (!handedOver || greeting !== 'shown') return
    const t = window.setTimeout(() => setGreeting('gone'), GREETING_OVERLAP_MS)
    return () => window.clearTimeout(t)
  }, [handedOver, greeting])

  useEffect(() => {
    if (greeting !== 'leaving') return
    const t = window.setTimeout(() => setGreeting('gone'), BUBBLE_OUT_MS)
    return () => window.clearTimeout(t)
  }, [greeting])

  if (!mounted) return null

  const open = () => {
    // Opening answers the greeting (LeFlux hides its bubble on open too).
    setGreeting((g) => (g === 'shown' ? 'leaving' : g === 'waiting' ? 'gone' : g))
    onOpen()
  }
  const dismiss = () => {
    rememberDismissal()
    setGreeting('leaving')
  }

  return (
    <>
      {greeting === 'shown' || greeting === 'leaving' ? (
        <div className={s.bubble} data-leaving={greeting === 'leaving' || undefined}>
          <button type="button" className={s.body} onPointerEnter={onIntent} onFocus={onIntent} onClick={open}>
            {GREETING}
          </button>
          <button type="button" className={s.close} aria-label="Dismiss greeting" onClick={dismiss}>
            &times;
          </button>
        </div>
      ) : null}
      {handedOver ? null : (
        <button
          type="button"
          className={s.launcher}
          data-chat-launcher=""
          data-busy={busy || undefined}
          aria-busy={busy || undefined}
          aria-label={LABEL}
          title={LABEL}
          aria-haspopup="dialog"
          aria-expanded={false}
          onPointerEnter={onIntent}
          onFocus={onIntent}
          onClick={open}
        >
          <svg className={s.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
    </>
  )
}

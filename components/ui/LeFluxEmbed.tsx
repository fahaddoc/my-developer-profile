'use client'

// LeFluxEmbed — the third-party chat widget, loaded on intent only.
//
// The widget is embed.js (3KB gz) plus leflux-agent.js (~150KB gz / ~580KB
// raw, served no-cache) plus a session init, a socket and a messages fetch.
// It used to load for every visitor after the first interaction or 5s idle,
// chatting or not. Now the page shows ChatLauncher, a CSS copy of LeFlux's
// launcher and greeting, and fetches the widget only when the visitor reaches
// for it: pointerenter or focus on the launcher or the greeting starts the
// download, a click also asks for the chat to open as soon as it is ready.
//
// LeFlux's contract (read from embed.js / leflux-agent.js):
//   - embed.js auto-initialises (no data-no-auto here) and, once the session
//     is up, attaches window.LeFlux { open, isReady, showLauncher, ... } and
//     fires `leflux:ready` on window. Its launcher is drawn in the same task.
//   - So on `leflux:ready`: open the chat if the visitor clicked, then hand
//     over to LeFlux's own launcher (ours is removed; it sits in the same spot).
//
// Mid-task visitors still get the widget at once, as before: when LeFlux left
// the chat open (ai_chat_widget_state.isOpen within its 24h) or is carrying a
// task across a page load (sessionStorage leflux:postNavTask / peekSticky /
// formDraft), it is loaded as soon as the loader has gone.
//
// Mounted once in the root layout, so it covers every route.

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatLauncher, whenBooted } from './ChatLauncher'

const SRC = 'https://leflux.xrlabs.app/embed.js'
const SCRIPT_ID = 'leflux-embed'
const READY_EVENT = 'leflux:ready'
/** A click waits this long for the widget, then the launcher stops spinning. */
const OPEN_WAIT_MS = 20000
const STATE_TTL_MS = 24 * 60 * 60 * 1000

type LeFluxApi = { open?: () => void; isReady?: () => boolean }
const leflux = () => (window as Window & { LeFlux?: LeFluxApi }).LeFlux

/** True when LeFlux has a conversation to restore on this page load. */
function midTask(): boolean {
  try {
    if (['leflux:postNavTask', 'leflux:peekSticky', 'leflux:formDraft'].some((k) => sessionStorage.getItem(k))) return true
    const raw = localStorage.getItem('ai_chat_widget_state')
    if (!raw) return false
    const state = JSON.parse(raw) as { isOpen?: boolean; timestamp?: number } | null
    return state?.isOpen === true && Date.now() - (state.timestamp ?? 0) < STATE_TTL_MS
  } catch {
    return false
  }
}

/** Keyboard users keep their place: focus moves to LeFlux's own launcher. */
function focusLeFluxLauncher() {
  const button = document.getElementById('ai-chat-widget-container')?.shadowRoot?.getElementById('chat-button')
  button?.focus()
}

export function LeFluxEmbed() {
  const [busy, setBusy] = useState(false)
  const [handedOver, setHandedOver] = useState(false)
  /** No widget to be had (blocked or offline): drop the launcher too. */
  const [unavailable, setUnavailable] = useState(false)
  const wantOpen = useRef(false)
  const waitTimer = useRef(0)

  const settle = useCallback(() => {
    wantOpen.current = false
    window.clearTimeout(waitTimer.current)
    setBusy(false)
  }, [])

  const load = useCallback(() => {
    if (leflux() || document.getElementById(SCRIPT_ID)) return
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SRC
    script.async = true
    script.onerror = () => {
      script.remove()
      settle()
      setUnavailable(true)
    }
    document.body.appendChild(script)
  }, [settle])

  const open = useCallback(() => {
    const api = leflux()
    if (api?.isReady?.()) {
      api.open?.()
      return
    }
    wantOpen.current = true
    setBusy(true)
    window.clearTimeout(waitTimer.current)
    waitTimer.current = window.setTimeout(settle, OPEN_WAIT_MS)
    load()
  }, [load, settle])

  useEffect(() => {
    const onReady = () => {
      const hadFocus = !!(document.activeElement as HTMLElement | null)?.closest?.('[data-chat-launcher]')
      if (wantOpen.current) leflux()?.open?.()
      else if (hadFocus) focusLeFluxLauncher()
      settle()
      setHandedOver(true)
    }
    window.addEventListener(READY_EVENT, onReady)
    if (leflux()?.isReady?.()) setHandedOver(true)
    const stop = midTask() ? whenBooted(load) : undefined
    return () => {
      window.removeEventListener(READY_EVENT, onReady)
      stop?.()
      window.clearTimeout(waitTimer.current)
    }
  }, [load, settle])

  if (unavailable) return null
  return <ChatLauncher busy={busy} handedOver={handedOver} onIntent={load} onOpen={open} />
}

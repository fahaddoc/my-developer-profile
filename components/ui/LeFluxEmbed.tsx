'use client'

// LeFluxEmbed — the third-party chat widget, kept off the critical path.
//
// It is ~150KB gz / ~580KB raw of JS: on a mid-range phone, parsing it during
// hydration costs more than all of the site's own code. So it is injected
// only after the visitor's first interaction (pointerdown, key, scroll,
// wheel, touch) or after ≥5s of idle, never while the loader card is up
// (<html data-booting>), and then with strategy="lazyOnload". Mounted once in
// the root layout, so it still loads on every route, eventually.

import Script from 'next/script'
import { useEffect, useState } from 'react'

// = LOADER_EXIT_EVENT in components/ui/LoadingScreen. Repeated as a literal so
// the root layout (every route) does not pull the loader module in.
const LOADER_EXIT_EVENT = 'sf:loader-exit'
const SRC = 'https://leflux.xrlabs.app/embed.js'
const IDLE_AFTER_MS = 5000
/** If the loader somehow never announces its exit, stop waiting for it. */
const LOADER_WAIT_CAP_MS = 8000

const INTERACTIONS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

export function LeFluxEmbed() {
  const [inject, setInject] = useState(false)

  useEffect(() => {
    if (inject) return
    const html = document.documentElement
    let timer = 0
    let idle = 0
    let capTimer = 0
    let fired = false

    const opts: AddEventListenerOptions = { capture: true, passive: true }
    const detach = () => {
      INTERACTIONS.forEach((t) => document.removeEventListener(t, trigger, opts))
      window.clearTimeout(timer)
      if (idle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle)
    }
    const afterLoader = () => {
      window.removeEventListener(LOADER_EXIT_EVENT, afterLoader)
      window.clearTimeout(capTimer)
      setInject(true)
    }
    function trigger() {
      if (fired) return
      fired = true
      detach()
      if (html.hasAttribute('data-booting')) {
        window.addEventListener(LOADER_EXIT_EVENT, afterLoader)
        capTimer = window.setTimeout(afterLoader, LOADER_WAIT_CAP_MS)
      } else {
        setInject(true)
      }
    }

    // Capture on document: element scrollers (the mobile .mob-scroll) do not
    // bubble 'scroll', but capture still sees them.
    INTERACTIONS.forEach((t) => document.addEventListener(t, trigger, opts))
    timer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) idle = window.requestIdleCallback(trigger, { timeout: 2000 })
      else trigger()
    }, IDLE_AFTER_MS)

    return () => {
      detach()
      window.removeEventListener(LOADER_EXIT_EVENT, afterLoader)
      window.clearTimeout(capTimer)
    }
  }, [inject])

  return inject ? <Script id="leflux-embed" src={SRC} strategy="lazyOnload" /> : null
}

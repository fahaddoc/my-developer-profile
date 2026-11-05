'use client'

// Shared scroll rails for the tunnel pages:
//   • TunnelAnchors  — invisible <div id="…"> targets at each station's t:
//                      hash links and the no-Lenis fallback of scrollToStation.
//   • useTunnelLoop  — rAF polling that snaps back to the start when the
//                      user wheels down past the bottom of the page.
// Used by both `/` (TunnelMode) and `/tunnel` (preview) so nav + loop
// behave identically on both routes.

import { useEffect } from 'react'
import { STATIONS } from '@/lib/tunnel'

// Must match <main height:500vh> (AppShell TunnelMode, app/tunnel/page.tsx):
// the scrollable range is 500vh - 100vh = 400vh, so progress = scrollY / 400vh.
const SCROLLABLE_VH = 400

// Each anchor sits exactly at its station's t. They used to sit at t - 0.03,
// which left a rail click 0.03 short of the station and the overlay stuck at
// ~68% opacity. TunnelHUD's scrollToStation now reads t directly; these
// anchors are the no-Lenis / hash-link fallback and must agree with it.
const ANCHORS = STATIONS.map(({ id, t }) => ({ id, topVh: t * SCROLLABLE_VH }))

export function TunnelAnchors() {
  return (
    <>
      {ANCHORS.map(({ id, topVh }) => (
        <div
          key={id}
          id={id}
          style={{
            position: 'absolute',
            top: `${topVh}vh`,
            left: 0, right: 0,
            height: 1,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

export function useTunnelLoop() {
  useEffect(() => {
    let cooldown      = 0
    let lastWheelDown = 0
    const COOLDOWN_MS = 700
    const RECENT_MS   = 300

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) lastWheelDown = performance.now()
    }
    window.addEventListener('wheel', onWheel, { passive: true })

    let rafId = 0
    const tick = () => {
      const lenis = (window as unknown as {
        __lenis?: { scroll: number; limit: number; scrollTo: (y: number, opts?: { immediate?: boolean; force?: boolean; lock?: boolean }) => void }
      }).__lenis

      if (lenis && lenis.limit > 0) {
        const now      = performance.now()
        const atBottom = lenis.scroll >= lenis.limit - 1
        const wheeled  = now - lastWheelDown < RECENT_MS
        const ready    = now - cooldown > COOLDOWN_MS
        if (atBottom && wheeled && ready) {
          cooldown      = now
          lastWheelDown = 0
          lenis.scrollTo(0, { immediate: true, force: true, lock: false })
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(rafId)
    }
  }, [])
}

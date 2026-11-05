'use client'

// Lenis smooth scroll — synced with GSAP ScrollTrigger so both read
// the same scroll position. Without this sync, ScrollTrigger fires
// at wrong times because it reads native scroll before Lenis updates it.
//
// Lenis + GSAP are imported dynamically AFTER the touch / reduced-motion
// check, so phones (the MobileSpace path) never download them.

import { useEffect } from 'react'
import type Lenis from 'lenis'

// Module-level ref so any component (e.g. drawers) can pause/resume Lenis
// without prop-drilling or context overhead. ES module live binding: importers
// see the instance once it is created.
export let lenisInstance: Lenis | null = null

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Skip Lenis on touch devices / reduced-motion users.
    // iOS and Android already do momentum scroll natively, and Lenis adds
    // an RAF chain + scroll-event amplification that blocks the main thread.
    const isTouch = window.matchMedia('(hover: none)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isTouch || reducedMotion) return

    let cancelled = false
    let cleanup: (() => void) | null = null

    ;(async () => {
      const [{ default: LenisCtor }, { default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (cancelled) return

      gsap.registerPlugin(ScrollTrigger)

      const lenis = new LenisCtor({
        duration: 1.4,                                              // how long one scroll "unit" takes
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo ease-out
        smoothWheel: true,
      })

      lenisInstance = lenis
      // Exposed on window for code paths in other chunks (tunnel scene, rails).
      ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis

      // keep ScrollTrigger in sync with Lenis scroll position
      lenis.on('scroll', ScrollTrigger.update)

      // drive Lenis via GSAP ticker (avoids double-RAF, keeps everything in lockstep)
      const raf = (time: number) => lenis.raf(time * 1000)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)

      cleanup = () => {
        lenisInstance = null
        delete (window as unknown as { __lenis?: Lenis }).__lenis
        gsap.ticker.remove(raf)
        lenis.destroy()
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return <>{children}</>
}

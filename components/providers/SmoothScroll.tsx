'use client'

// Lenis smooth scroll — synced with GSAP ScrollTrigger so both read
// the same scroll position. Without this sync, ScrollTrigger fires
// at wrong times because it reads native scroll before Lenis updates it.

import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Module-level ref so any component (e.g. modals) can pause/resume Lenis
// without prop-drilling or context overhead.
export let lenisInstance: Lenis | null = null

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    // Skip Lenis on touch devices / reduced-motion users.
    // iOS and Android already do momentum scroll natively, and Lenis adds
    // an RAF chain + scroll-event amplification that blocks the main thread
    // when several useScroll() listeners subscribe to it.
    const isTouch = window.matchMedia('(hover: none)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isTouch || reducedMotion) return

    const lenis = new Lenis({
      duration: 1.4,                                         // how long one scroll "unit" takes
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo ease-out
      smoothWheel: true,
    })

    lenisInstance = lenis
    // Expose on window for any non-React code paths that need to scroll
    // (e.g. nav buttons through HMR-stale module imports).
    if (typeof window !== 'undefined') {
      (window as unknown as { __lenis?: Lenis }).__lenis = lenis
    }

    // keep ScrollTrigger in sync with Lenis scroll position
    lenis.on('scroll', ScrollTrigger.update)

    // drive Lenis via GSAP ticker (avoids double-RAF, keeps everything in lockstep)
    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenisInstance = null
      if (typeof window !== 'undefined') {
        delete (window as unknown as { __lenis?: Lenis }).__lenis
      }
      lenis.destroy()
      gsap.ticker.remove(raf)
    }
  }, [])

  return <>{children}</>
}

'use client'

import { useEffect, useState } from 'react'

// Returns true when scroll-linked decorative effects (3D tilts, scale/opacity
// shifts driven by useScroll) should be skipped. Triggers on touch devices
// and for users who opted into prefers-reduced-motion.
//
// Use this to gate the input range of useTransform() so it returns a flat
// no-op on mobile — keeps the hook chain valid without paying compositing
// cost on every scroll event.
export function useReduceScrollFx() {
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const isTouch       = window.matchMedia('(hover: none)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReduce(isTouch || reducedMotion)
  }, [])

  return reduce
}

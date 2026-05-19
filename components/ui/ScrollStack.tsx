'use client'

// ScrollStack — pinned 3D scene stack driven by GSAP ScrollTrigger.
//
// All children stack at the same viewport position inside a sticky 100vh
// container. As outer scroll progresses, each child's translateZ animates:
// enters from far behind, reaches focal point Z=0, then zooms forward past
// the camera while the next child rises from behind.
//
// Trade-off: each layer is clipped to 100vh — sections taller than viewport
// have content beyond viewport hidden during their slot.

import { useRef, useEffect, Children, isValidElement, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReduceScrollFx } from '@/hooks/useReduceScrollFx'

interface ScrollStackProps {
  children: ReactNode
}

export function ScrollStack({ children }: ScrollStackProps) {
  const items  = Children.toArray(children).filter(isValidElement)
  const N      = items.length
  const ref    = useRef<HTMLDivElement>(null)
  const reduce = useReduceScrollFx()

  useEffect(() => {
    if (reduce || N === 0 || !ref.current) return

    gsap.registerPlugin(ScrollTrigger)

    const container = ref.current
    const sticky    = container.firstElementChild as HTMLElement | null
    if (!sticky) return

    const layers = Array.from(sticky.children) as HTMLElement[]

    // Initial: all layers hidden far back
    gsap.set(layers, { z: -1200, opacity: 0, force3D: true })

    const ctx = gsap.context(() => {
      // Pin sticky for full stack scroll duration
      ScrollTrigger.create({
        trigger: container,
        start:   'top top',
        end:     'bottom bottom',
        pin:     sticky,
        pinSpacing: false,
      })

      // Each layer's slot is centred at (i+1)/(N+1) of container scroll
      layers.forEach((el, i) => {
        const center = (i + 1) / (N + 1)
        const span   = 1 / (N + 1)
        const start  = Math.max(0, center - span)
        const end    = Math.min(1, center + span)

        // Single keyframe-driven animation through entire slot:
        // start: Z=-1200 opacity=0 (far behind, invisible)
        // centre: Z=0 opacity=1 (at focal point)
        // end: Z=+800 opacity=0 (zoomed past camera, faded)
        gsap.to(el, {
          keyframes: [
            { z: -1200, opacity: 0, duration: 0 },
            { z: 0,     opacity: 1, duration: 0.5, ease: 'power2.out' },
            { z: 800,   opacity: 0, duration: 0.5, ease: 'power2.in'  },
          ],
          immediateRender: false,
          scrollTrigger: {
            trigger: container,
            start:   `${start * 100}% top`,
            end:     `${end * 100}% top`,
            scrub:   true,
          },
        })
      })
    }, container)

    return () => ctx.revert()
  }, [N, reduce])

  if (reduce || N === 0) {
    return <>{children}</>
  }

  return (
    <div ref={ref} style={{ position: 'relative', height: `${(N + 1) * 100}vh` }}>
      <div
        style={{
          height: '100vh',
          overflow: 'hidden',
          perspective: '1600px',
          perspectiveOrigin: '50% 45%',
        }}
      >
        {items.map((child, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              willChange: 'transform, opacity',
              transformStyle: 'preserve-3d',
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}

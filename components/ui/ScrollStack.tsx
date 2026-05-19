'use client'

// ScrollStack — pinned 3D scene stack.
//
// All children get stacked at the SAME viewport position (absolute inset:0)
// inside a sticky container. As the outer scroll progresses, each child's
// translateZ animates: enters from far behind, reaches focal point Z=0,
// then zooms forward past the camera while the next child rises from behind.
//
// Trade-off: each layer is clipped to 100vh — sections taller than viewport
// have content beyond viewport hidden during their slot.

import { useRef, Children, isValidElement, type ReactNode } from 'react'
import {
  motion, useScroll, useTransform, useMotionTemplate, type MotionValue,
} from 'framer-motion'
import { useReduceScrollFx } from '@/hooks/useReduceScrollFx'

interface ScrollStackProps {
  children: ReactNode
}

export function ScrollStack({ children }: ScrollStackProps) {
  const items  = Children.toArray(children).filter(isValidElement)
  const N      = items.length
  const ref    = useRef<HTMLDivElement>(null)
  const reduce = useReduceScrollFx()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  if (reduce || N === 0) {
    return <>{children}</>
  }

  // Container holds enough vertical scroll for N + 1 viewport heights so each
  // section has its own "slot" plus head/tail room for entry/exit.
  return (
    <div ref={ref} style={{ position: 'relative', height: `${(N + 1) * 100}vh` }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          perspective: '1600px',
          perspectiveOrigin: '50% 45%',
        }}
      >
        {items.map((child, i) => (
          <StackLayer key={i} index={i} total={N} progress={scrollYProgress}>
            {child}
          </StackLayer>
        ))}
      </div>
    </div>
  )
}

interface StackLayerProps {
  index:    number
  total:    number
  progress: MotionValue<number>
  children: ReactNode
}

function StackLayer({ index, total, progress, children }: StackLayerProps) {
  // Each section's focal point is positioned along [0, 1] progress so that
  // adjacent slots overlap and transitions stay smooth.
  const center = (index + 1) / (total + 1)
  const span   = 1 / (total + 1)

  const Z = useTransform(
    progress,
    [Math.max(0, center - span), center, Math.min(1, center + span)],
    [-1200, 0, 800],
  )
  const opacity = useTransform(
    progress,
    [
      Math.max(0, center - span),
      Math.max(0, center - 0.7 * span),
      Math.min(1, center + 0.7 * span),
      Math.min(1, center + span),
    ],
    [0, 1, 1, 0],
  )

  const transform = useMotionTemplate`translateZ(${Z}px)`

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        transform,
        opacity,
        overflow: 'hidden',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </motion.div>
  )
}

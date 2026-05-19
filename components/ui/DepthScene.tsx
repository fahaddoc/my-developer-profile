'use client'

// DepthScene — CSS 3D tunnel transform for sections.
//
// Each wrapped section comes from FAR (Z=-450, slight rotateX up) when below
// viewport, lands at Z=0 when centered, and recedes (Z=+280, rotateX down) as
// it leaves above. Combined with `perspective` on <main>, this gives a
// "camera moving forward through space" feel — without WebGL.
//
// Effects skip when prefers-reduced-motion is set.

import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform, useMotionTemplate } from 'framer-motion'
import { useReduceScrollFx } from '@/hooks/useReduceScrollFx'

interface DepthSceneProps {
  children: ReactNode
  /** 1 = standard depth. Lower = subtler. Higher = more dramatic. */
  strength?: number
}

export function DepthScene({ children, strength = 1 }: DepthSceneProps) {
  const ref    = useRef<HTMLDivElement>(null)
  const reduce = useReduceScrollFx()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // 3D dolly: section starts FAR BEHIND (small), reaches focal point at
  // viewport centre, then ZOOMS FORWARD past the camera (grows, fades) —
  // like camera passing through. Next section is doing the same dance behind it.
  const Z       = useTransform(scrollYProgress, [0, 0.5, 1],
                    reduce ? [0, 0, 0] : [-1100 * strength, 0, 700 * strength])
  const opacity = useTransform(scrollYProgress, [0, 0.22, 0.7, 1],
                    reduce ? [1, 1, 1, 1] : [0, 1, 1, 0])

  const transform = useMotionTemplate`translateZ(${Z}px)`

  return (
    <motion.div
      ref={ref}
      style={{
        transform,
        opacity,
        transformOrigin: '50% 50%',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </motion.div>
  )
}

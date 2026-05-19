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

  const Z       = useTransform(scrollYProgress, [0, 0.45, 0.55, 1],
                    reduce ? [0, 0, 0, 0] : [-450 * strength, 0, 0, 280 * strength])
  const rotateX = useTransform(scrollYProgress, [0, 0.45, 0.55, 1],
                    reduce ? [0, 0, 0, 0] : [-6 * strength, 0, 0, 4 * strength])
  const opacity = useTransform(scrollYProgress, [0, 0.18, 0.82, 1],
                    reduce ? [1, 1, 1, 1] : [0.4, 1, 1, 0.5])

  const transform = useMotionTemplate`translateZ(${Z}px) rotateX(${rotateX}deg)`

  return (
    <motion.div
      ref={ref}
      style={{
        transform,
        opacity,
        transformStyle: 'preserve-3d',
        transformOrigin: '50% 50%',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </motion.div>
  )
}

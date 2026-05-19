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

  // Pure axial zoom — section enters small (camera far), zooms in to natural
  // size at viewport centre, zooms back out as it leaves. No rotation, no tilt.
  const Z       = useTransform(scrollYProgress, [0, 0.5, 1],
                    reduce ? [0, 0, 0] : [-800 * strength, 0, -800 * strength])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1],
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

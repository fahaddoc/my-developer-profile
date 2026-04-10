// components/ui/RevealText.tsx
// Wraps any content in a fade-up animation that plays once when scrolled into view.

'use client'

import { motion } from 'framer-motion'
import { useInView } from '@/hooks/useInView'

interface RevealTextProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function RevealText({ children, delay = 0, className = '' }: RevealTextProps) {
  const { ref, isInView } = useInView()

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

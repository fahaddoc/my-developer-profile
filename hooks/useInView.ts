// hooks/useInView.ts
// Thin wrapper around Framer Motion's useInView so every animated section
// uses the same default configuration without repeating options everywhere.

import { useRef } from 'react'
import { useInView as useFramerInView } from 'framer-motion'

type MarginValue = `${number}${'px' | '%'}`
type MarginType =
  | MarginValue
  | `${MarginValue} ${MarginValue}`
  | `${MarginValue} ${MarginValue} ${MarginValue}`
  | `${MarginValue} ${MarginValue} ${MarginValue} ${MarginValue}`

interface InViewOptions {
  once?: boolean
  margin?: MarginType
  amount?: number | 'some' | 'all'
}

export function useInView(options: InViewOptions = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useFramerInView(ref, {
    once: true,
    margin: '-60px',
    ...options,
  })

  return { ref, isInView }
}

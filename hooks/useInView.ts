// hooks/useInView.ts
import { useRef } from 'react'
import { useInView as useFramerInView } from 'framer-motion'

type MarginValue = `${number}px` | `${number}%`
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

export function useInView<T extends Element = HTMLDivElement>(options: InViewOptions = {}) {
  const ref = useRef<T>(null)
  const isInView = useFramerInView(ref, {
    once: true,
    margin: '-60px',
    ...options,
  })

  return { ref, isInView }
}

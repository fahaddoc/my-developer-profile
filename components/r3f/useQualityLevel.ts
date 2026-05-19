'use client'

// useQualityLevel — combines GPU tier detection, localStorage override and an
// in-session FPS downgrade into a single effective QualityLevel value.
//
// Priority (highest wins):
//   1. user override (localStorage)
//   2. fps-downgrade (if detected once during the first 3s of canvas runtime)
//   3. raw GPU tier from detect-gpu

import { useCallback, useEffect, useState } from 'react'
import { getGPUTier } from 'detect-gpu'
import {
  type QualityLevel,
  tierToLevel,
  readOverride,
  writeOverride,
} from '@/lib/quality'

export interface QualityState {
  /** null while detect-gpu is still running */
  level:         QualityLevel | null
  loading:       boolean
  detectedTier:  number | null
  /** set to a level, or null to clear the override and fall back to detection */
  setOverride:   (level: QualityLevel | null) => void
  /** call when measured FPS is below threshold during initial sample */
  reportLowFps:  () => void
  fpsDowngraded: boolean
}

export function useQualityLevel(): QualityState {
  const [tier, setTier]                 = useState<number | null>(null)
  const [override, setOverrideState]    = useState<QualityLevel | null>(null)
  const [fpsDowngraded, setFpsDowngraded] = useState(false)
  const [loading, setLoading]           = useState(true)

  // Initial mount: read override + run detect-gpu in parallel
  useEffect(() => {
    let cancelled = false

    setOverrideState(readOverride())

    ;(async () => {
      try {
        const result = await getGPUTier()
        if (!cancelled) setTier(result.tier ?? 1)
      } catch {
        if (!cancelled) setTier(1) // conservative fallback
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [])

  const setOverride = useCallback((level: QualityLevel | null) => {
    setOverrideState(level)
    writeOverride(level)
  }, [])

  const reportLowFps = useCallback(() => {
    setFpsDowngraded(true)
  }, [])

  // Compute effective level
  let level: QualityLevel | null = null
  if (override) {
    level = override
  } else if (tier != null) {
    const base = tierToLevel(tier)
    if (fpsDowngraded) {
      level = base === 'high' ? 'mid' : base === 'mid' ? 'low' : 'low'
    } else {
      level = base
    }
  }

  return {
    level,
    loading,
    detectedTier: tier,
    setOverride,
    reportLowFps,
    fpsDowngraded,
  }
}

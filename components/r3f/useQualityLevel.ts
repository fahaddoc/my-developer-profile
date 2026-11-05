'use client'

// useQualityLevel — combines GPU tier detection, localStorage override and an
// in-session FPS downgrade into a single effective QualityLevel value.
//
// Priority (highest wins):
//   1. user override (localStorage)
//   2. fps-downgrade (if detected once during the first 3s of canvas runtime)
//   3. raw GPU tier from detect-gpu
//
// With an override stored, detect-gpu never runs: no probe WebGL context, no
// benchmark download (it fetches its data from unpkg.com), no wait.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type QualityLevel,
  tierToLevel,
  readOverride,
  writeOverride,
} from '@/lib/quality'

export interface QualityState {
  /** null until a level is known (override read, or detect-gpu finished) */
  level:         QualityLevel | null
  loading:       boolean
  detectedTier:  number | null
  /** set to a level, or null to clear the override and fall back to detection */
  setOverride:   (level: QualityLevel | null) => void
  /** call when measured FPS is below threshold during initial sample */
  reportLowFps:  () => void
  fpsDowngraded: boolean
}

/** If the benchmark data has not answered by then, assume a mid GPU; the FPS
 *  sample still downgrades a GPU that cannot keep up. */
const DETECT_TIMEOUT_MS = 2500
const TIMEOUT_TIER = 2

/**
 * @param enabled  run GPU detection only when the tunnel can actually be shown.
 *                 Phones / classic mode pass false, so they never create the
 *                 probe WebGL context or download detect-gpu's benchmark data.
 */
export function useQualityLevel(enabled = true): QualityState {
  const [tier, setTier]                   = useState<number | null>(null)
  // AppShell renders client-only (ssr: false), so reading storage in the
  // initialiser cannot cause a hydration mismatch, and an override is known
  // on the very first render.
  const [override, setOverrideState]      = useState<QualityLevel | null>(() => readOverride())
  const [fpsDowngraded, setFpsDowngraded] = useState(false)

  // detect-gpu only when nothing else decides the level.
  const needsDetection = enabled && override == null && tier == null
  useEffect(() => {
    if (!needsDetection) return
    let cancelled = false
    let timer = 0

    ;(async () => {
      try {
        const { getGPUTier } = await import('detect-gpu')
        const result = await Promise.race([
          getGPUTier(),
          new Promise<null>((resolve) => { timer = window.setTimeout(() => resolve(null), DETECT_TIMEOUT_MS) }),
        ])
        if (!cancelled) setTier(result ? (result.tier ?? 1) : TIMEOUT_TIER)
      } catch {
        if (!cancelled) setTier(1) // conservative fallback
      } finally {
        window.clearTimeout(timer)
      }
    })()

    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [needsDetection])

  const setOverride = useCallback((level: QualityLevel | null) => {
    setOverrideState(level)
    writeOverride(level)
  }, [])

  const reportLowFps = useCallback(() => {
    setFpsDowngraded(true)
  }, [])

  // Effective level
  let level: QualityLevel | null = null
  if (override) {
    level = override
  } else if (tier != null) {
    const base = tierToLevel(tier)
    level = fpsDowngraded ? (base === 'high' ? 'mid' : 'low') : base
  }

  // Clearing an override before detection has ever run keeps the last level
  // while detect-gpu answers, so the canvas is never torn down in between.
  const lastLevelRef = useRef<QualityLevel | null>(null)
  if (level) lastLevelRef.current = level
  else if (lastLevelRef.current) level = lastLevelRef.current

  return {
    level,
    loading: level == null,
    detectedTier: tier,
    setOverride,
    reportLowFps,
    fpsDowngraded,
  }
}

// lib/quality.ts — performance preset definitions for the R3F tunnel scene.
//
// Three quality levels. Each gets a preset that the tunnel components read to
// scale heavy features (bloom, particles, tube tessellation, tile animation).
// `low` is special: rather than try to render a degraded canvas, we fall back
// to the regular DOM portfolio (same path mobile takes).

export type QualityLevel = 'low' | 'mid' | 'high'

export interface QualityPreset {
  /** false = skip the R3F canvas entirely, render ClassicMode instead */
  canvas:         boolean
  /** EffectComposer + Bloom mounted */
  bloom:          boolean
  bloomIntensity: number
  /** dust mote count inside the tunnel */
  particleCount:  number
  /** Number of cross-section rings drawn along the tunnel curve.
      (Field name retained for backward compat with existing presets.) */
  tubeSegments:   number
  /** floating Y-bob on project tiles + particle bob */
  tileBob:        boolean
}

export const PRESETS: Record<QualityLevel, QualityPreset> = {
  low:  { canvas: false, bloom: false, bloomIntensity: 0,    particleCount: 200, tubeSegments: 30,  tileBob: false },
  mid:  { canvas: true,  bloom: true,  bloomIntensity: 0.4,  particleCount: 270, tubeSegments: 60,  tileBob: true  },
  high: { canvas: true,  bloom: true,  bloomIntensity: 0.75, particleCount: 340, tubeSegments: 120, tileBob: true  },
}

/** Map raw detect-gpu tier (0..3) to a QualityLevel. */
export function tierToLevel(tier: number): QualityLevel {
  if (tier <= 1) return 'low'
  if (tier === 2) return 'mid'
  return 'high'
}

/** Step to the next level in a rotating cycle for the manual toggle. */
export function nextLevel(level: QualityLevel): QualityLevel {
  if (level === 'low') return 'mid'
  if (level === 'mid') return 'high'
  return 'low'
}

// ── localStorage persistence for the user override ──────────────────────────
export const QUALITY_STORAGE_KEY = 'tunnel-quality-override'

export function readOverride(): QualityLevel | null {
  if (typeof window === 'undefined') return null
  try {
    const v = localStorage.getItem(QUALITY_STORAGE_KEY)
    if (v === 'low' || v === 'mid' || v === 'high') return v
  } catch {
    /* localStorage may throw in private mode */
  }
  return null
}

export function writeOverride(level: QualityLevel | null) {
  if (typeof window === 'undefined') return
  try {
    if (level == null) localStorage.removeItem(QUALITY_STORAGE_KEY)
    else               localStorage.setItem(QUALITY_STORAGE_KEY, level)
  } catch {
    /* ignore */
  }
}

'use client'

// QualityToggle — small bottom-right button that lets the user cycle through
// low / mid / high. Persists via the override stored in localStorage.

import { type QualityLevel, nextLevel } from '@/lib/quality'

interface QualityToggleProps {
  level:    QualityLevel
  onChange: (level: QualityLevel) => void
}

export function QualityToggle({ level, onChange }: QualityToggleProps) {
  const labels: Record<QualityLevel, string> = {
    low:  'LOW',
    mid:  'MID',
    high: 'HIGH',
  }

  return (
    <button
      type="button"
      onClick={() => onChange(nextLevel(level))}
      aria-label={`Quality preset. Currently ${labels[level]}. Click to change.`}
      style={{
        position:    'fixed',
        bottom:      24,
        right:       24,
        zIndex:      60,
        background:  'rgba(10,10,18,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        color:       '#FFB547',
        border:      '1px solid rgba(255,181,71,0.35)',
        borderRadius: 4,
        padding:     '8px 14px',
        fontFamily:  'var(--font-mono), ui-monospace, monospace',
        fontSize:    11,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        cursor:      'pointer',
        textShadow:  '0 0 8px rgba(255,181,71,0.55)',
        transition:  'border-color 200ms, background 200ms',
        pointerEvents: 'auto',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,181,71,0.7)'
        e.currentTarget.style.background  = 'rgba(20,15,5,0.8)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,181,71,0.35)'
        e.currentTarget.style.background  = 'rgba(10,10,18,0.65)'
      }}
    >
      ⚡ Quality: {labels[level]}
    </button>
  )
}

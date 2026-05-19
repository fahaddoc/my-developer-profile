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
        top:         72,
        right:       32,
        zIndex:      55,
        background:  'transparent',
        color:       'rgba(245,245,247,0.45)',
        border:      'none',
        padding:     0,
        fontFamily:  'var(--font-mono), ui-monospace, monospace',
        fontSize:    9,
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        cursor:      'pointer',
        transition:  'color 200ms',
        pointerEvents: 'auto',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#FFB547' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(245,245,247,0.45)' }}
    >
      ⚡ Quality: {labels[level]}
    </button>
  )
}

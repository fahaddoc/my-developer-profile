'use client'

// LoadingScreen — "Space Nebula" intro, jerk-proof edition.
//
// CRITICAL: every animated property here is COMPOSITED (opacity + transform).
// No text-shadow keyframes, no filter blur transitions, no width/height
// animations. Reason: during initial Next.js hydration the main thread is
// blocked for several hundred ms — any non-composited animation would freeze
// on screen during that block ("jerk"). Composited animations keep running on
// the compositor thread regardless of main-thread state.
//
// Structure:
//   - 26 stars: opacity-only twinkle, deterministic positions (no rerender)
//   - Nebula glow: single radial-gradient div, scale + opacity pulse
//   - SF initials: outlined cyan stroke (no shadow keyframe), fades in
//   - Tagline: opacity-only fade-in
//   - Whole loader: opacity transition to fade out

import { useEffect, useRef, useState } from 'react'

const TOTAL_MS   = 3000
const FADE_AT    = 2500
const STAR_COUNT = 26

interface Star {
  top:      string
  left:     string
  size:     number
  cyan:     boolean
  delay:    string
  duration: string
}

const seeded = (i: number, salt: number) => {
  const x = Math.sin(i * 9301 + salt * 49297) * 233280
  return x - Math.floor(x)
}
const STARS: Star[] = Array.from({ length: STAR_COUNT }, (_, i) => ({
  top:      `${(seeded(i, 1) * 100).toFixed(2)}%`,
  left:     `${(seeded(i, 2) * 100).toFixed(2)}%`,
  size:     seeded(i, 3) < 0.3 ? 2 : 1,
  cyan:     seeded(i, 4) < 0.25,
  delay:    `${(seeded(i, 5) * 2).toFixed(2)}s`,
  duration: `${(1.6 + seeded(i, 6) * 2.2).toFixed(2)}s`,
}))

interface Props { onComplete: () => void }

export function LoadingScreen({ onComplete }: Props) {
  const [fading, setFading] = useState(false)
  const [gone,   setGone]   = useState(false)

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    const t1 = setTimeout(() => setFading(true), FADE_AT)
    const t2 = setTimeout(() => { setGone(true); onCompleteRef.current() }, TOTAL_MS)
    return () => {
      clearTimeout(t1); clearTimeout(t2)
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (gone) return null

  return (
    <div
      aria-hidden
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     9999,
        background: '#05050A',
        overflow:   'hidden',
        opacity:    fading ? 0 : 1,
        transition: 'opacity 500ms ease-out',
        contain:    'layout paint size',
      }}
    >
      {/* Stars — opacity-only twinkle (composited). */}
      {STARS.map((s, i) => (
        <span
          key={i}
          style={{
            position:     'absolute',
            top:          s.top,
            left:         s.left,
            width:        s.size,
            height:       s.size,
            borderRadius: '50%',
            background:   s.cyan ? '#9be8ff' : '#ffffff',
            opacity:      0,
            animation:    `ls-twinkle ${s.duration} ${s.delay} ease-in-out infinite`,
            willChange:   'opacity',
          }}
        />
      ))}

      {/* Nebula glow — scale + opacity pulse only (composited). No filter blur. */}
      <div style={{
        position:      'absolute',
        top:           '50%',
        left:          '50%',
        width:         'min(85vw, 900px)',
        height:        'min(85vw, 900px)',
        marginLeft:    'calc(min(85vw, 900px) / -2)',
        marginTop:     'calc(min(85vw, 900px) / -2)',
        background:    'radial-gradient(circle at center, rgba(0,255,255,0.22) 0%, rgba(0,255,255,0.10) 25%, rgba(119,0,255,0.08) 50%, transparent 72%)',
        animation:     'ls-pulse 2400ms ease-in-out infinite',
        pointerEvents: 'none',
        willChange:    'transform, opacity',
        transformOrigin: 'center',
      }} />

      {/* SF — outlined cyan stroke. Static text-shadow (no keyframe), fade-in
          via opacity ONLY. The glow halo is a separate stacked layer below. */}
      <div style={{
        position:       'absolute',
        inset:          0,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        pointerEvents:  'none',
      }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Static halo — radial gradient behind the letters, opacity fade in */}
          <div style={{
            position:      'absolute',
            top:           '50%',
            left:          '50%',
            width:         420,
            height:        420,
            marginLeft:    -210,
            marginTop:     -210,
            borderRadius:  '50%',
            background:    'radial-gradient(circle at center, rgba(0,255,255,0.40) 0%, rgba(0,255,255,0.18) 35%, rgba(119,0,255,0.12) 55%, transparent 75%)',
            opacity:       0,
            animation:     'ls-halo 1800ms 200ms ease-out forwards',
            willChange:    'opacity, transform',
            pointerEvents: 'none',
          }} />
          <span style={{
            position:         'relative',
            fontFamily:       'var(--font-display), ui-monospace, "SF Mono", monospace',
            fontSize:         'clamp(120px, 20vw, 220px)',
            fontWeight:       800,
            letterSpacing:    '-0.04em',
            color:            'transparent',
            WebkitTextStroke: '1px rgba(0,255,255,0.55)',
            // STATIC shadow — no keyframe, no per-frame paint cost
            textShadow:       '0 0 12px rgba(0,255,255,0.55), 0 0 28px rgba(0,255,255,0.35)',
            opacity:          0,
            animation:        'ls-fade-in 1200ms ease-out forwards',
            willChange:       'opacity',
          }}>SF</span>
        </div>
      </div>

      {/* Tagline — opacity-only fade-in */}
      <div style={{
        position:      'absolute',
        bottom:        '14%',
        left:          0, right: 0,
        textAlign:     'center',
        fontFamily:    'var(--font-mono), ui-monospace, monospace',
        fontSize:      12,
        letterSpacing: '0.4em',
        color:         'rgba(0,255,255,0.7)',
        opacity:       0,
        animation:     'ls-fade-in 800ms 1000ms ease-out forwards',
        willChange:    'opacity',
      }}>
        shahfahad.dev
      </div>

      <style jsx>{`
        @keyframes ls-twinkle {
          0%, 100% { opacity: 0;   }
          50%      { opacity: 0.95;}
        }
        /* scale + opacity = both composited */
        @keyframes ls-pulse {
          0%, 100% { transform: scale(0.94); opacity: 0.82; }
          50%      { transform: scale(1.06); opacity: 1;    }
        }
        @keyframes ls-halo {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1);    }
        }
        @keyframes ls-fade-in {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

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
//   - SF mark: a morphing liquid-glass blob (border-radius morph; runs on a
//     free main thread since AppShell is deferred) with a steady glowing SF
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

      {/* SF Emboss — a morphing liquid-glass blob with an embossed SF mark.
          The whole blob fades in via opacity (composited); the blob shape
          morphs (border-radius) and the SF stays steady + legible. Mounts
          before AppShell, so the main thread is free and the morph stays
          smooth. */}
      <div style={{
        position:       'absolute',
        inset:          0,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        pointerEvents:  'none',
      }}>
        <div style={{
          position:       'relative',
          width:          'clamp(200px, 26vw, 300px)',
          aspectRatio:    '1 / 1',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          opacity:        0,
          animation:      'ls-fade-in 900ms 150ms ease-out forwards',
          willChange:     'opacity',
        }}>
          {/* Glass blob — morphs behind the mark */}
          <div style={{
            position:             'absolute',
            inset:                0,
            background:           'linear-gradient(160deg, rgba(94,234,212,0.22), rgba(56,189,248,0.10))',
            backdropFilter:       'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border:               '1px solid rgba(94,234,212,0.5)',
            boxShadow:            'inset 0 10px 30px rgba(255,255,255,0.22), inset 0 -14px 36px rgba(0,0,0,0.45), 0 0 60px rgba(0,255,255,0.28)',
            animation:            'ls-morph 4s ease-in-out infinite',
            willChange:           'border-radius',
          }} />
          {/* Sheen highlight */}
          <div style={{
            position:     'absolute',
            top:          '20%',
            left:         '24%',
            width:        '26%',
            height:       '15%',
            borderRadius: '50%',
            background:   'rgba(255,255,255,0.42)',
            filter:       'blur(6px)',
          }} />
          {/* SF — white with a static cyan glow (no keyframe, paint-once) */}
          <span style={{
            position:      'relative',
            fontFamily:    'var(--font-display), ui-monospace, "SF Mono", monospace',
            fontWeight:    800,
            fontSize:      'clamp(64px, 9vw, 110px)',
            letterSpacing: '0.01em',
            color:         '#ffffff',
            textShadow:    '0 0 18px rgba(0,255,255,0.7), 0 0 5px rgba(255,255,255,0.55)',
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
        @keyframes ls-fade-in {
          to { opacity: 1; }
        }
        /* Liquid-glass blob shape morph (border-radius). Runs on a free main
           thread during the loader, so it stays smooth. */
        @keyframes ls-morph {
          0%, 100% { border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%; }
          34%      { border-radius: 70% 30% 46% 54% / 30% 60% 40% 70%; }
          67%      { border-radius: 36% 64% 58% 42% / 62% 38% 62% 38%; }
        }
      `}</style>
    </div>
  )
}

'use client'

// StarfieldBackground — the deep-space backdrop for the classic / touch
// experience and the subpages (/projects/[slug], /open-source,
// /achievements/[slug]). See DESIGN.md §2 and §7.
//
// Dark : near-black space (--space-0), a cold low-opacity nebula wash from
//        --nebula-a / --nebula-b, one faint ember "sun" glow near the top and
//        neutral warm / cool white stars that twinkle gently.
// Light: the same world in daylight. A pale sky gradient, the same faint warm
//        sun, and the stars reduced to static --ink-3 dust at very low opacity.
//
// Performance contract (DESIGN.md §9):
// - Stars come from a seeded PRNG, so SSR and client markup are identical.
// - Parallax is ONE CSS variable (--sf-scroll) written on this component's own
//   root (never documentElement) by one passive, rAF-throttled scroll listener,
//   and only when a `scrollRef` is passed (MobileSpace's inner scroller).
//   Subpages pass nothing and stay static. No per-frame React work.
// - Each star layer is a stack of identical tiles and its travel is clamped to
//   the overscan, so stars never run out at the bottom of a long page.
// - Twinkle animates opacity only, on a subset of stars, dark theme only, and
//   is off under prefers-reduced-motion (as is the parallax).

import { useEffect, useRef, type RefObject } from 'react'

// Mulberry32 — tiny deterministic PRNG. Seeded once at module load.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Star = {
  x: number      // % of the tile width
  y: number      // % of the tile height
  size: number   // px
  alpha: number  // resting opacity (dark theme)
  warm: boolean  // warm vs cool white
  twinkle: boolean
  dur: number    // s
  delay: number  // s
}

// Far layer: many small, dim stars. Near layer: few, larger, brighter.
// factor = parallax in px per scrolled px; tiles = stacked copies (overscan).
const LAYERS = [
  { count: 38, factor: 0.02,  tiles: 2, size: [0.9, 1.5], alpha: [0.35, 0.7] },
  { count: 24, factor: 0.045, tiles: 2, size: [1.2, 2.0], alpha: [0.45, 0.85] },
  { count: 12, factor: 0.08,  tiles: 3, size: [1.8, 2.6], alpha: [0.6, 0.95] },
] as const

const rand = mulberry32(20260603)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const STARS: Star[][] = LAYERS.map((L) =>
  Array.from({ length: L.count }, () => ({
    x: +(rand() * 100).toFixed(2),
    y: +(rand() * 100).toFixed(2),
    size: +lerp(L.size[0], L.size[1], rand()).toFixed(2),
    alpha: +lerp(L.alpha[0], L.alpha[1], rand()).toFixed(2),
    warm: rand() < 0.45,
    twinkle: rand() < 0.32,
    dur: +(3.2 + rand() * 4.4).toFixed(2),
    delay: +(rand() * 6).toFixed(2),
  })),
)

export interface StarfieldBackgroundProps {
  /**
   * The element whose scrollTop drives the parallax (MobileSpace passes its
   * inner scroller). Omit it and the starfield stays static.
   */
  scrollRef?: RefObject<HTMLElement | null>
}

export function StarfieldBackground({ scrollRef }: StarfieldBackgroundProps = {}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const parallax = Boolean(scrollRef)

  useEffect(() => {
    const root = rootRef.current
    const scroller = scrollRef?.current
    if (!root || !scroller) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0

    const write = () => {
      raf = 0
      root.style.setProperty('--sf-scroll', String(Math.round(scroller.scrollTop)))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(write)
    }
    const bind = () => {
      scroller.removeEventListener('scroll', onScroll)
      if (raf) { cancelAnimationFrame(raf); raf = 0 }
      if (reduced.matches) {
        root.style.removeProperty('--sf-scroll')
        return
      }
      scroller.addEventListener('scroll', onScroll, { passive: true })
      write()
    }
    bind()
    reduced.addEventListener('change', bind)
    return () => {
      reduced.removeEventListener('change', bind)
      scroller.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
      root.style.removeProperty('--sf-scroll')
    }
  }, [scrollRef])

  return (
    <div ref={rootRef} className="sf" aria-hidden="true">
      <div className="sf-sky" />
      <div className="sf-nebula" />

      {LAYERS.map((L, li) => {
        const tiles = parallax ? L.tiles : 1
        return (
          <div
            key={li}
            className="sf-layer"
            style={{
              height: `${tiles * 100}%`,
              // Travel = factor × scroll, clamped to the overscan so the
              // layer's bottom edge never rises into view.
              transform: parallax
                ? `translate3d(0, max(calc(var(--sf-scroll, 0) * -${L.factor}px), -${(((tiles - 1) / tiles) * 100).toFixed(3)}%), 0)`
                : undefined,
              willChange: parallax ? 'transform' : undefined,
            }}
          >
            {Array.from({ length: tiles }, (_, ti) =>
              STARS[li].map((s, si) => (
                <span
                  key={`${ti}-${si}`}
                  className={`sf-star ${s.warm ? 'sf-star--warm' : 'sf-star--cool'}${s.twinkle ? ' sf-star--twinkle' : ''}`}
                  style={{
                    left: `${s.x}%`,
                    top: `${((s.y + ti * 100) / tiles).toFixed(3)}%`,
                    width: s.size,
                    height: s.size,
                    ['--a' as string]: s.alpha,
                    ['--dur' as string]: `${s.dur}s`,
                    ['--delay' as string]: `${s.delay}s`,
                  }}
                />
              )),
            )}
          </div>
        )
      })}

      <style jsx>{`
        .sf {
          position: fixed;
          inset: 0;
          z-index: var(--z-canvas, 0);
          overflow: hidden;
          pointer-events: none;
          contain: strict;
          background: rgb(var(--space-0));
        }

        /* Sky: near-black, a cold low-chroma wash, one warm sun near the top
           (the key light comes from the upper left, DESIGN.md §7). */
        .sf-sky {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(55% 32% at 14% -6%, rgb(var(--accent) / 0.11), transparent 72%),
            radial-gradient(90% 60% at 0% 30%, rgb(var(--nebula-a) / 0.2), transparent 70%),
            radial-gradient(80% 55% at 100% 82%, rgb(var(--nebula-b) / 0.14), transparent 70%),
            rgb(var(--space-0));
        }

        /* A second, slower wash that drifts with the scroll: sparse cold
           filaments, not a flat blue fill. Gradients only, no blur filter. */
        .sf-nebula {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 160%;
          background:
            radial-gradient(38% 14% at 72% 22%, rgb(var(--nebula-a) / 0.16), transparent 70%),
            radial-gradient(30% 10% at 24% 58%, rgb(var(--nebula-b) / 0.12), transparent 70%),
            radial-gradient(44% 12% at 64% 86%, rgb(var(--nebula-a) / 0.12), transparent 70%);
          transform: translate3d(0, max(calc(var(--sf-scroll, 0) * -0.012px), -37.5%), 0);
        }

        .sf-layer {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
        }

        .sf-star {
          position: absolute;
          border-radius: 50%;
          opacity: var(--a);
        }
        /* Neutral warm / cool whites mixed from the tokens; the plain ink
           declaration is the fallback for browsers without color-mix(). */
        .sf-star--warm {
          background: rgb(var(--ink));
          background: color-mix(in oklab, rgb(var(--ink)) 86%, rgb(var(--accent)));
        }
        .sf-star--cool {
          background: rgb(var(--ink));
          background: color-mix(in oklab, rgb(var(--ink)) 84%, rgb(var(--nebula-a)));
        }
        .sf-star--twinkle {
          animation: sf-twinkle var(--dur) ease-in-out var(--delay) infinite;
        }
        @keyframes sf-twinkle {
          0%, 100% { opacity: var(--a); }
          50%      { opacity: calc(var(--a) * 0.35); }
        }

        /* Daylight: pale sky, warm sun, stars become faint static dust. */
        :global(:root[data-theme='light']) .sf-sky {
          background:
            radial-gradient(60% 34% at 14% -8%, rgb(var(--accent) / 0.09), transparent 72%),
            radial-gradient(80% 50% at 100% 85%, rgb(var(--nebula-b) / 0.18), transparent 70%),
            linear-gradient(180deg, rgb(var(--nebula-a) / 0.32) 0%, rgb(var(--space-1)) 42%, rgb(var(--space-0)) 100%);
        }
        :global(:root[data-theme='light']) .sf-nebula {
          opacity: 0.6;
        }
        :global(:root[data-theme='light']) .sf-star {
          background: rgb(var(--ink-3));
          opacity: calc(var(--a) * 0.22);
          animation: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .sf-star--twinkle { animation: none; }
          .sf-layer,
          .sf-nebula { transform: none !important; will-change: auto !important; }
        }
      `}</style>
    </div>
  )
}

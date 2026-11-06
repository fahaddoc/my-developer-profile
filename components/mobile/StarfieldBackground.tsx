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
// - Parallax: one passive, rAF-throttled scroll listener writes `transform`
//   straight onto the four moving elements (three star layers + the nebula),
//   and only when a `scrollRef` is passed (MobileSpace's inner scroller). No
//   inherited custom property, so a scroll frame restyles 4 elements, not the
//   ~160 stars under them. Subpages pass nothing and stay static. No per-frame
//   React work; unchanged values are never rewritten.
// - Each star layer is a stack of identical tiles and its travel is clamped to
//   the overscan, so stars never run out at the bottom of a long page.
// - Twinkle animates opacity only, dark theme only, and is off under
//   prefers-reduced-motion (as is the parallax). It never runs per star: the
//   twinkling stars of each layer sit in TWINKLE_GROUPS wrappers and each
//   wrapper animates its own opacity, so the page runs 6 animations whatever
//   the tile count (59 per-star ones on a phone before), with constant
//   keyframes the compositor can take. Tile copies carry no animation of their
//   own; they ride in their group, so a copy that scrolls into view still
//   shimmers at no extra cost.

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
  dur: number    // s, the star's own twinkle rate (it picks the star's group)
}

// The twinkling stars of one layer that share one opacity animation.
type TwinkleGroup = {
  members: number[] // indexes into the layer's STARS row
  dur: number       // s
  delay: number     // s
}

// Far layer: many small, dim stars. Near layer: few, larger, brighter.
// factor = parallax in px per scrolled px; tiles = stacked copies (overscan).
const LAYERS = [
  { count: 38, factor: 0.02,  tiles: 2, size: [0.9, 1.5], alpha: [0.35, 0.7] },
  { count: 24, factor: 0.045, tiles: 2, size: [1.2, 2.0], alpha: [0.45, 0.85] },
  { count: 12, factor: 0.08,  tiles: 3, size: [1.8, 2.6], alpha: [0.6, 0.95] },
] as const

// The nebula wash is 160% of the viewport tall, so it may travel 60% of the
// viewport before its bottom edge rises into view.
const NEBULA = { factor: 0.012, overscan: 0.6 } as const

const rand = mulberry32(20260603)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const STARS: Star[][] = LAYERS.map((L) =>
  Array.from({ length: L.count }, () => {
    const star = {
      x: +(rand() * 100).toFixed(2),
      y: +(rand() * 100).toFixed(2),
      size: +lerp(L.size[0], L.size[1], rand()).toFixed(2),
      alpha: +lerp(L.alpha[0], L.alpha[1], rand()).toFixed(2),
      warm: rand() < 0.45,
      twinkle: rand() < 0.32,
      dur: +(3.2 + rand() * 4.4).toFixed(2),
    }
    // The old per-star delay. Still drawn so the seeded sequence, and so every
    // star's position, size and colour, stays exactly as it was.
    rand()
    return star
  }),
)

// Wrappers per layer. One group per layer would make all ~16 far-layer
// twinklers dim in lockstep; two per layer keeps the shimmer at 6 animations.
const TWINKLE_GROUPS = 2

// Each layer's twinkling stars, sorted by their own rate and split into the
// faster and the slower half; a group runs at the mean rate of its members
// (3.8 to 7.3 s across the six). Start delays are spread by the golden ratio
// over 0 to 4 s so no two groups begin in phase. Before its delay a group sits
// at opacity 1, the 0% keyframe, so the first paint is the resting field.
const GROUPS: TwinkleGroup[][] = STARS.map((stars, li) => {
  const twinklers = stars
    .map((_, i) => i)
    .filter((i) => stars[i].twinkle)
    .sort((a, b) => stars[a].dur - stars[b].dur)
  const n = Math.min(TWINKLE_GROUPS, twinklers.length)
  return Array.from({ length: n }, (_, g) => {
    const members = twinklers.slice(
      Math.round((g * twinklers.length) / n),
      Math.round(((g + 1) * twinklers.length) / n),
    )
    const dur = members.reduce((sum, i) => sum + stars[i].dur, 0) / members.length
    const phase = ((li * TWINKLE_GROUPS + g) * 0.618) % 1
    return { members, dur: +dur.toFixed(2), delay: +(phase * 4).toFixed(2) }
  })
})

export interface StarfieldBackgroundProps {
  /**
   * The element whose scrollTop drives the parallax (MobileSpace passes its
   * inner scroller). Omit it and the starfield stays static.
   */
  scrollRef?: RefObject<HTMLElement | null>
}

export function StarfieldBackground({ scrollRef }: StarfieldBackgroundProps = {}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const nebulaRef = useRef<HTMLDivElement>(null)
  const layerRefs = useRef<(HTMLDivElement | null)[]>([])
  const parallax = Boolean(scrollRef)

  useEffect(() => {
    const root = rootRef.current
    const scroller = scrollRef?.current
    if (!root || !scroller) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    // Travel = factor x scroll, clamped to the overscan (in viewport heights)
    // so a layer's bottom edge never rises into view.
    const targets = [
      ...LAYERS.map((L, i) => ({ el: layerRefs.current[i], factor: L.factor, overscan: L.tiles - 1, step: 10, last: '' })),
      // The nebula moves ~1px per 80px of scroll: whole pixels only, so it is
      // rewritten (and repainted) a few times per screen, not every frame.
      { el: nebulaRef.current, factor: NEBULA.factor, overscan: NEBULA.overscan, step: 1, last: '' },
    ]
    let h = root.clientHeight
    let raf = 0

    const write = () => {
      raf = 0
      const y = scroller.scrollTop
      for (const t of targets) {
        if (!t.el) continue
        const travel = Math.round(Math.min(y * t.factor, t.overscan * h) * t.step) / t.step
        const v = `translate3d(0, ${-travel}px, 0)`
        if (v !== t.last) {
          t.el.style.transform = v
          t.last = v
        }
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(write)
    }
    const onResize = () => {
      h = root.clientHeight
      onScroll()
    }
    const clear = () => {
      for (const t of targets) {
        if (t.el) t.el.style.transform = ''
        t.last = ''
      }
    }
    const bind = () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (raf) { cancelAnimationFrame(raf); raf = 0 }
      if (reduced.matches) {
        clear()
        return
      }
      scroller.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onResize, { passive: true })
      write()
    }
    bind()
    reduced.addEventListener('change', bind)
    return () => {
      reduced.removeEventListener('change', bind)
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
      clear()
    }
  }, [scrollRef])

  return (
    <div ref={rootRef} className="sf" aria-hidden="true">
      <div className="sf-sky" />
      <div ref={nebulaRef} className="sf-nebula" />

      {LAYERS.map((L, li) => {
        const tiles = parallax ? L.tiles : 1
        const copies = Array.from({ length: tiles }, (_, ti) => ti)
        // One star. `top` is a share of the whole layer (tiles stacked), and a
        // group wrapper fills the layer, so it resolves the same in both.
        const star = (si: number, ti: number) => {
          const s = STARS[li][si]
          return (
            <span
              key={`${ti}-${si}`}
              className={`sf-star ${s.warm ? 'sf-star--warm' : 'sf-star--cool'}`}
              style={{
                left: `${s.x}%`,
                top: `${((s.y + ti * 100) / tiles).toFixed(3)}%`,
                width: s.size,
                height: s.size,
                ['--a' as string]: s.alpha,
              }}
            />
          )
        }
        return (
          <div
            key={li}
            ref={(el) => { layerRefs.current[li] = el }}
            className="sf-layer"
            style={{
              height: `${tiles * 100}%`,
              willChange: parallax ? 'transform' : undefined,
            }}
          >
            {copies.flatMap((ti) =>
              STARS[li].flatMap((s, si) => (s.twinkle ? [] : [star(si, ti)])),
            )}
            {GROUPS[li].map((g, gi) => (
              <div
                key={`tw-${gi}`}
                className="sf-tw"
                style={{
                  ['--dur' as string]: `${g.dur}s`,
                  ['--delay' as string]: `${g.delay}s`,
                }}
              >
                {copies.flatMap((ti) => g.members.map((si) => star(si, ti)))}
              </div>
            ))}
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

        /* A second, slower wash that drifts with the scroll (transform written
           by the effect above): sparse cold filaments, not a flat blue fill.
           Gradients only, no blur filter. */
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
        /* A twinkle group fills its layer (so its stars' % positions resolve as
           in the layer) and dims them all from their resting --a to 0.35 x --a
           and back, the same swing each star used to run on its own. Plain
           number keyframes: no var(), so the compositor can run them. */
        .sf-tw {
          position: absolute;
          inset: 0;
          animation: sf-twinkle var(--dur) ease-in-out var(--delay) infinite;
        }
        @keyframes sf-twinkle {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.35; }
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
        }
        :global(:root[data-theme='light']) .sf-tw {
          animation: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .sf-tw { animation: none; }
          .sf-layer,
          .sf-nebula { transform: none !important; will-change: auto !important; }
        }
      `}</style>
    </div>
  )
}

'use client'

// StarfieldBackground — the site-wide "space" backdrop for the mobile
// experience. Deterministic stars (seeded PRNG → identical SSR + client, no
// hydration mismatch) across three parallax layers, plus two soft nebula
// glows. Parallax is driven by the `--mob-scroll` CSS variable that
// MobileSpace updates from its scroll container — so this stays decoupled and
// does zero work of its own per frame. Theme-aware via CSS tokens.

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

type Star = { x: string; y: string; size: number; dur: string; delay: string; layer: number; teal: boolean }

const rand = mulberry32(20260603)
const STARS: Star[] = Array.from({ length: 72 }, () => {
  const r = rand()
  return {
    x: `${(rand() * 100).toFixed(2)}%`,
    y: `${(rand() * 100).toFixed(2)}%`,
    size: r < 0.78 ? 1.5 : r < 0.94 ? 2.5 : 3.5,
    dur: `${(2.4 + rand() * 4).toFixed(2)}s`,
    delay: `${(rand() * 5).toFixed(2)}s`,
    layer: Math.floor(rand() * 3),
    teal: rand() < 0.22,
  }
})

const PARALLAX = [0.018, 0.045, 0.085] // per-layer scroll factor (px per scrolled px)

export function StarfieldBackground() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* base wash + nebula glows (token-driven → adapts to light/dark) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 75% at 50% -10%, rgb(var(--mob-accent) / 0.12), transparent 55%),' +
            'radial-gradient(90% 60% at 85% 108%, rgb(var(--accent-violet) / 0.12), transparent 60%),' +
            'rgb(var(--bg-base))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '70vw',
          height: '70vw',
          left: '-20vw',
          top: '8vh',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgb(var(--mob-accent) / 0.16), transparent 70%)',
          filter: 'blur(60px)',
          transform: 'translateY(calc(var(--mob-scroll, 0) * -0.03px))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '60vw',
          height: '60vw',
          right: '-15vw',
          bottom: '4vh',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgb(var(--accent-violet) / 0.15), transparent 70%)',
          filter: 'blur(70px)',
          transform: 'translateY(calc(var(--mob-scroll, 0) * 0.04px))',
        }}
      />

      {/* star layers */}
      {[0, 1, 2].map((layer) => (
        <div
          key={layer}
          style={{
            position: 'absolute',
            inset: '-10% 0',
            transform: `translateY(calc(var(--mob-scroll, 0) * -${PARALLAX[layer]}px))`,
            willChange: 'transform',
          }}
        >
          {STARS.filter((s) => s.layer === layer).map((s, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: s.x,
                top: s.y,
                width: s.size,
                height: s.size,
                borderRadius: '50%',
                background: s.teal ? 'rgb(var(--mob-accent))' : 'rgb(var(--text-primary))',
                opacity: 0.5,
                boxShadow: s.teal ? '0 0 4px rgb(var(--mob-accent) / 0.8)' : 'none',
                animation: `mob-twinkle ${s.dur} ease-in-out ${s.delay} infinite`,
              }}
            />
          ))}
        </div>
      ))}

      <style jsx>{`
        @keyframes mob-twinkle {
          0%, 100% { opacity: 0.18; }
          50%      { opacity: 0.85; }
        }
      `}</style>
    </div>
  )
}

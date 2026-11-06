'use client'

// SeaBackground — the daylight world for the classic / touch experience
// (MobileSpace). Dark theme keeps the deep-space StarfieldBackground; light
// theme swaps to this illustrated sea: a pale sky warming to a hazy horizon,
// the sun upper left (the desktop key light), big soft clouds, a pale teal
// sea with wave lines and sun glints, and a few bird flocks crossing the sky.
//
// Swap: both backdrops are always rendered and the theme attribute picks one
// (display: none here in dark), so the no-flash script's data-theme decides
// the first paint and a theme toggle swaps them without a reload or a render.
//
// Performance contract (DESIGN.md §9): SVG + CSS only. No JS, no canvas, no
// scroll listener. Every animation is transform or opacity on a small set of
// elements (clouds, three wave layers, glints, flocks, wing flaps), all off
// under prefers-reduced-motion. The water stays pale (every text token keeps
// AA on it: ink-3 >= 4.6:1); the busy parts sit in the upper sky and on the
// water near the horizon, and only lighten what is behind the copy.
//
// The horizon follows the hero's own formula (MobileSpace .ms-st--hero:
// --top + --scene-h per breakpoint), so the hero island sits on it at rest.

type Puff = readonly [cx: number, cy: number, r: number]

const CLOUD_SHAPES: Record<'big' | 'long' | 'small', { puffs: Puff[]; base: [number, number, number, number] }> = {
  big: { puffs: [[46, 54, 22], [74, 40, 28], [110, 30, 32], [146, 42, 25], [172, 56, 17]], base: [26, 50, 160, 24] },
  long: { puffs: [[30, 52, 15], [58, 44, 21], [92, 40, 23], [126, 45, 19], [156, 51, 15], [180, 57, 11]], base: [18, 50, 174, 20] },
  small: { puffs: [[62, 52, 19], [90, 40, 25], [122, 47, 19], [146, 56, 12]], base: [46, 50, 112, 22] },
}

const CLOUDS = [
  { id: 'c1', shape: 'big', cls: 'sea-cloud--1' },
  { id: 'c2', shape: 'long', cls: 'sea-cloud--2' },
  { id: 'c3', shape: 'small', cls: 'sea-cloud--3' },
  { id: 'c4', shape: 'long', cls: 'sea-cloud--4' },
] as const

function Cloud({ id, shape }: { id: string; shape: keyof typeof CLOUD_SHAPES }) {
  const { puffs, base } = CLOUD_SHAPES[shape]
  const silhouette = (
    <>
      {puffs.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />)}
      <rect x={base[0]} y={base[1]} width={base[2]} height={base[3]} rx={base[3] / 2} />
    </>
  )
  return (
    <svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMax meet" focusable="false">
      <defs>
        <clipPath id={`sea-${id}-clip`}>{silhouette}</clipPath>
        <linearGradient id={`sea-${id}-shade`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#f9fbfd" />
          <stop offset="0.55" stopColor="#e6edf4" />
          <stop offset="1" stopColor="#cbd8e6" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#sea-${id}-clip)`}>
        <rect width="200" height="80" fill={`url(#sea-${id}-shade)`} />
        {/* Lit, warm-white puffs offset toward the sun (upper left); the cool
            crescent left at each lower right is the shadow side. */}
        {puffs.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x - r * 0.18} cy={y - r * 0.24} r={r * 0.84} fill="#fffdf8" />)}
      </g>
    </svg>
  )
}

// A bird is a gull "m": two arcs meeting at the body. The wing flap is a
// scaleY on the path (origin at the body line), so the wings fold down.
const BIRD = 'M-7 0 Q-3.5 -4.2 0 0 Q3.5 -4.2 7 0'

type Flock = { cls: string; birds: readonly (readonly [number, number, number])[] }
const FLOCKS: Flock[] = [
  { cls: 'sea-flock--1', birds: [[0, 10, 0], [16, 4, 0.18], [30, 12, 0.36], [44, 2, 0.1], [58, 9, 0.27]] },
  { cls: 'sea-flock--2', birds: [[0, 6, 0.05], [15, 0, 0.3], [27, 9, 0.16]] },
  { cls: 'sea-flock--3', birds: [[0, 14, 0], [12, 8, 0.2], [24, 3, 0.12], [36, 0, 0.32], [48, 5, 0.08], [60, 11, 0.24], [72, 16, 0.4]] },
]

// Wave tile (240 x 96, scaled per layer: finer toward the horizon). Arcs are
// scattered so the repeat does not read as a grid: [x, y, width].
const WAVE_ARCS = [
  [8, 14, 26], [70, 8, 14], [128, 20, 30], [196, 10, 18], [40, 44, 16],
  [96, 52, 28], [164, 46, 14], [214, 60, 20], [18, 78, 22], [72, 86, 12], [140, 82, 24], [190, 92, 14],
] as const
const WAVE_SCALE = [0, 0.3, 0.55, 0.9] as const

const GLINTS = [
  [16, 6, 14, 2.6, 0], [12, 14, 9, 3.4, 0.9], [21, 20, 18, 2.9, 1.7], [9, 31, 12, 3.8, 0.4],
  [18, 40, 22, 3.1, 2.3], [25, 52, 10, 4.2, 1.2], [13, 64, 16, 3.5, 2.8], [20, 80, 12, 4.6, 0.6],
] as const

export function SeaBackground() {
  return (
    <div className="sea" aria-hidden="true">
      <div className="sea-sky" />
      <div className="sea-sun" />
      <svg className="sea-far" viewBox="0 0 400 20" preserveAspectRatio="none" focusable="false">
        <path d="M18 20 C30 14 38 9 52 8 C64 7 70 12 80 13 C90 14 96 18 104 20 Z" fill="#bccfd9" />
        <path d="M300 20 C308 15 314 13 322 13 C330 13 334 17 342 20 Z" fill="#c4d6de" />
      </svg>
      <div className="sea-water">
        <div className="sea-path" />
        {[1, 2, 3].map((n) => (
          <div key={n} className={`sea-waves sea-waves--${n}`}>
            <svg className="sea-waves-in" focusable="false">
              <defs>
                <pattern id={`sea-w${n}`} patternUnits="userSpaceOnUse" width={240 * WAVE_SCALE[n]} height={96 * WAVE_SCALE[n]}>
                  <g transform={`scale(${WAVE_SCALE[n]})`} fill="none" strokeLinecap="round">
                    {WAVE_ARCS.map(([x, y, w], i) => (
                      <g key={i}>
                        <path d={`M${x - 1} ${y + 1.6} Q${x + w / 2} ${y - w * 0.22} ${x + w + 1} ${y + 1.6}`} stroke="#86b0ba" strokeOpacity="0.3" strokeWidth="1.8" />
                        <path d={`M${x} ${y} Q${x + w / 2} ${y - w * 0.24} ${x + w} ${y}`} stroke="#fff" strokeOpacity={i % 3 ? 0.75 : 0.95} strokeWidth="1.5" />
                      </g>
                    ))}
                  </g>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#sea-w${n})`} />
            </svg>
          </div>
        ))}
        {GLINTS.map(([x, y, w, dur, delay], i) => (
          <span
            key={i}
            className="sea-glint"
            style={{ left: `${x}%`, top: `${y}px`, width: `${w}px`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
          />
        ))}
      </div>
      {CLOUDS.map((c) => (
        <div key={c.id} className={`sea-cloud ${c.cls}`}>
          <Cloud id={c.id} shape={c.shape} />
        </div>
      ))}
      {FLOCKS.map((f) => (
        <div key={f.cls} className={`sea-flock ${f.cls}`}>
          <svg viewBox="-10 -6 92 28" focusable="false">
            {f.birds.map(([x, y, d]) => (
              <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                <path className="sea-bird" d={BIRD} style={{ animationDelay: `${-d}s` }} />
              </g>
            ))}
          </svg>
        </div>
      ))}

      <style jsx global>{`
        .sea {
          /* Local palette: daylight sky and a pale teal sea. Never text. */
          --sky-top: #c9dff0;
          --sky-mid: #dbe9f3;
          --sky-haze: #f4e7d4;
          --sea-deep: #b6d5da;
          --sea-near: #c4dee0;
          --sea-body: #c9e2e3;
          --sea-low: #d0e6e5;
          /* Horizon = the hero's --top + --scene-h (phones). */
          --sea-h: calc(60px + clamp(180px, calc(100svh - 400px), 380px));
          position: fixed;
          inset: 0;
          z-index: var(--z-canvas, 0);
          display: none;
          overflow: hidden;
          pointer-events: none;
          contain: strict;
          background: var(--sky-mid);
        }
        :root[data-theme='light'] .sea { display: block; }
        @media (min-width: 640px) and (min-height: 541px) {
          .sea { --sea-h: calc(72px + clamp(240px, calc(100svh - 500px), 640px)); }
        }
        @media (min-width: 1024px) and (min-height: 541px) {
          .sea { --sea-h: calc(72px + min(calc(82svh - 72px), 640px)); }
        }
        @media (orientation: landscape) and (max-height: 540px) {
          .sea { --sea-h: calc(100svh - 56px); }
        }

        .sea-sky {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            var(--sky-top) 0%,
            var(--sky-mid) calc(var(--sea-h) * 0.5),
            #ebebe4 calc(var(--sea-h) - 70px),
            var(--sky-haze) var(--sea-h)
          );
        }
        /* The sun, upper left: a warm-white disc in a wide amber bloom. */
        .sea-sun {
          position: absolute;
          left: 18%;
          top: 10%;
          width: 520px;
          height: 520px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(
            circle,
            #fffdf8 0 7.5%,
            #fff1d8 9%,
            rgb(255 226 178 / 0.6) 14%,
            rgb(var(--accent) / 0.12) 30%,
            rgb(var(--accent) / 0.04) 46%,
            transparent 64%
          );
        }
        .sea-far {
          position: absolute;
          left: 0;
          width: 100%;
          height: 14px;
          top: calc(var(--sea-h) - 14px);
        }

        .sea-water {
          position: absolute;
          left: 0;
          right: 0;
          top: var(--sea-h);
          bottom: 0;
          border-top: 1px solid #93bcc4;
          background: linear-gradient(180deg, var(--sea-deep) 0, var(--sea-near) 10px, var(--sea-body) 46px, var(--sea-low) 100%);
        }
        /* The sun's path on the water, under the sun. */
        .sea-path {
          position: absolute;
          left: 18%;
          top: 0;
          width: min(60vw, 520px);
          height: 78%;
          transform: translateX(-50%);
          background: radial-gradient(36% 100% at 50% 0%, rgb(255 251 240 / 0.8), rgb(255 248 232 / 0.3) 45%, transparent 75%);
        }
        .sea-waves {
          position: absolute;
          left: 0;
          right: 0;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(transparent, #000 22%, #000 78%, transparent);
          mask-image: linear-gradient(transparent, #000 22%, #000 78%, transparent);
        }
        .sea-waves--1 { top: 3px; height: 18%; opacity: 0.55; }
        .sea-waves--2 { top: 14%; height: 34%; opacity: 0.6; }
        .sea-waves--3 { top: 44%; height: 58%; opacity: 0.55; }
        .sea-waves-in {
          position: absolute;
          left: -48px;
          top: 0;
          width: calc(100% + 96px);
          height: 100%;
          animation: sea-sway 13s ease-in-out infinite alternate;
        }
        .sea-waves--2 .sea-waves-in { animation-duration: 17s; animation-delay: -6s; }
        .sea-waves--3 .sea-waves-in { animation-duration: 21s; animation-delay: -11s; }
        @keyframes sea-sway {
          from { transform: translate3d(-22px, 0, 0); }
          to   { transform: translate3d(22px, 0, 0); }
        }
        .sea-glint {
          position: absolute;
          height: 2px;
          border-radius: 2px;
          background: #fff;
          opacity: 0;
          animation: sea-glint 3s ease-in-out infinite;
        }
        @keyframes sea-glint {
          0%, 100% { opacity: 0; }
          45%, 55% { opacity: 0.95; }
        }

        .sea-cloud {
          position: absolute;
          animation: sea-drift 80s ease-in-out infinite alternate;
        }
        .sea-cloud svg { display: block; width: 100%; height: auto; filter: blur(0.8px); }
        .sea-cloud--1 { left: 50%; top: 7%; width: clamp(230px, 64vw, 540px); }
        .sea-cloud--2 { left: -14%; top: 21%; width: clamp(200px, 52vw, 520px); animation-duration: 96s; animation-delay: -40s; }
        .sea-cloud--3 { left: 66%; bottom: calc(100% - var(--sea-h) + 28px); width: clamp(120px, 28vw, 300px); opacity: 0.85; animation-duration: 70s; animation-delay: -20s; }
        .sea-cloud--4 { left: 2%; bottom: calc(100% - var(--sea-h) + 2px); width: clamp(130px, 30vw, 340px); opacity: 0.7; animation-duration: 110s; animation-delay: -70s; }
        @keyframes sea-drift {
          from { transform: translate3d(-26px, 0, 0); }
          to   { transform: translate3d(26px, 0, 0); }
        }

        .sea-flock {
          position: absolute;
          left: 0;
          width: 92px;
          transform: translate3d(var(--rest), 0, 0);
          animation: sea-fly var(--dur) linear var(--delay) infinite;
        }
        .sea-flock svg { display: block; width: 100%; height: auto; overflow: visible; }
        .sea-flock--1 { top: 15%; --rest: 8vw; --dur: 74s; --delay: -22s; }
        .sea-flock--2 { top: 27%; width: 64px; --rest: 62vw; --dur: 92s; --delay: -61s; animation-direction: reverse; }
        .sea-flock--3 { top: 5%; width: 74px; --rest: 40vw; --dur: 118s; --delay: -80s; }
        @keyframes sea-fly {
          from { transform: translate3d(-120px, 2vh, 0); }
          to   { transform: translate3d(calc(100vw + 40px), -3vh, 0); }
        }
        .sea-bird {
          fill: none;
          stroke: #3e4a5c;
          stroke-opacity: 0.62;
          stroke-width: 1.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          transform-box: fill-box;
          transform-origin: 50% 100%;
          /* Three-frame flap: far birds read fine stepped, and a stepped value
             only invalidates paint when it changes, not every frame. */
          animation: sea-flap 0.9s steps(3, jump-none) infinite alternate;
        }
        @keyframes sea-flap {
          from { transform: scaleY(1); }
          to   { transform: scaleY(-0.45); }
        }

        @media (prefers-reduced-motion: reduce) {
          .sea-waves-in,
          .sea-glint,
          .sea-cloud,
          .sea-flock,
          .sea-bird { animation: none; }
          .sea-glint { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}

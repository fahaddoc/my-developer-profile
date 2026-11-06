'use client'

// SeaIslands — the daylight stand-ins for MobileSpace's planets (light theme
// only; the dark planets are untouched). Three distinct silhouettes, painted
// flat: the sun-facing (left) planes warm, the far planes cool, a green crest,
// a sand strip and a foam line at the waterline.
//
// - HeroIsleBack: a peaked island behind the sticker photo (painted under it),
//   with a few birds lifting off the peak now and then.
// - HeroIsleFront: the grassy ledge the photo stands on (painted over the
//   photo's hidden lower edge, inside .ms-planet, exactly where the orb was).
// - AboutIsle: a long low island with a sea stack, under the About copy.
// - Coast: a beach with lapping foam and a grassy dune under Contact.
//
// Hero geometry is in photo units (--photo-w / --photo-h / --apex from
// .ms-st--hero), and every viewBox keeps the aspect of the box it is drawn
// in, so nothing stretches between breakpoints. CSS only: transform and
// opacity animations, all off under prefers-reduced-motion.

const ROCK_LIT = '#e7d2ad'
const ROCK_MID = '#d3c2a6'
const ROCK_COOL = '#a6b2be'
const GRASS_LIT = '#b5cf90'
const GRASS_COOL = '#82a685'
const SAND = '#f1e3c4'

/** A wavy foam line from x0 to x1 along y. */
function foam(x0: number, x1: number, y: number, amp: number, step: number) {
  let d = `M${x0} ${y}`
  for (let x = x0, i = 0; x < x1; x += step, i++) {
    d += ` Q${x + step / 2} ${y + (i % 2 ? amp : -amp)} ${x + step} ${y}`
  }
  return d
}

const LIFT = [
  { dx: -0.08, dy: -0.42, delay: 0 },
  { dx: 0.02, dy: -0.46, delay: 0.45 },
  { dx: 0.1, dy: -0.38, delay: 0.95 },
  { dx: -0.13, dy: -0.3, delay: 1.5 },
  { dx: -0.03, dy: -0.34, delay: 2.2 },
]

export function HeroIsleBack() {
  return (
    <div className="isle isle-back" aria-hidden="true">
      <svg viewBox="0 0 316 100" focusable="false">
        <defs>
          <linearGradient id="isle-back-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={GRASS_LIT} />
            <stop offset="1" stopColor={GRASS_COOL} />
          </linearGradient>
          {/* Each plane darkens a little toward the water (bounce light is
              cooler at the base), which keeps the big faces from reading flat. */}
          <linearGradient id="isle-back-lit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f1dfbd" />
            <stop offset="1" stopColor="#d8bf98" />
          </linearGradient>
          <linearGradient id="isle-back-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0cfb2" />
            <stop offset="1" stopColor="#bfb19c" />
          </linearGradient>
          <linearGradient id="isle-back-cool" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b6c2cd" />
            <stop offset="1" stopColor="#97a6b5" />
          </linearGradient>
        </defs>
        {/* A hazy headland further out, for depth. */}
        <path fill="#c6d4de" d="M0 100 C8 88 18 78 28 72 C34 68 40 70 44 76 C48 82 52 92 56 100 Z" />
        {/* The mountain, in the cool far-side tone. */}
        <path
          fill="url(#isle-back-cool)"
          d="M20 100 C26 90 32 78 38 66 C44 54 50 40 56 30 C62 20 68 12 74 10 C80 9 86 14 90 20 C96 28 102 34 110 38 C122 44 134 46 148 52 C168 60 190 62 210 58 C228 54 242 52 256 56 C276 64 296 82 316 100 Z"
        />
        {/* Planes facing the sun (upper left): lit cliff, then a mid plane. */}
        <path fill="url(#isle-back-mid)" d="M74 10 C80 9 86 14 90 20 C88 34 86 50 86 66 C86 80 88 92 90 100 L62 100 C64 82 64 66 66 52 C68 38 72 24 74 10 Z" />
        <path fill="url(#isle-back-lit)" d="M20 100 C26 90 32 78 38 66 C44 54 50 40 56 30 C62 20 68 12 74 10 C72 24 68 38 66 52 C64 66 64 82 62 100 Z" />
        <path fill="#f5e7ca" d="M38 66 C44 54 50 40 56 30 C60 24 64 18 68 14 C64 26 58 40 52 52 C48 60 44 68 40 76 Z" />
        <g fill="none" strokeLinecap="round">
          <path d="M44 74 C50 72 56 72 62 70 M50 56 C55 54 60 54 66 52 M57 40 C61 38 65 38 69 36" stroke="#c9b08a" strokeWidth="0.9" opacity="0.7" />
          <path d="M80 26 C81 42 80 58 82 76 M70 40 C70 56 69 72 70 88" stroke="#a9a08f" strokeWidth="0.8" opacity="0.45" />
        </g>
        {/* Green on the shoulder behind the photo, the lower slope and the summit. */}
        <path
          fill="url(#isle-back-grass)"
          d="M90 20 C96 28 102 34 110 38 C122 44 134 46 148 52 C168 60 190 62 210 58 C228 54 242 52 256 56 C276 64 296 82 316 100 L250 100 C240 90 226 80 206 76 C182 72 160 72 140 68 C120 64 104 56 96 46 C92 38 90 30 90 20 Z"
        />
        <path fill={GRASS_LIT} opacity="0.7" d="M110 38 C122 44 134 46 148 52 C168 60 190 62 210 58 C228 54 242 52 256 56 C236 58 220 63 204 66 C182 69 160 66 140 61 C126 57 116 50 110 38 Z" />
        <path fill={GRASS_LIT} d="M20 100 C26 90 32 80 38 70 C42 76 46 82 48 88 C50 93 53 97 56 100 Z" />
        <path fill={GRASS_LIT} d="M66 16 C68 11 72 8 76 8 C81 8 85 11 88 16 C84 16 81 18 77 17 C73 16 70 19 66 16 Z" />
        <path fill={GRASS_COOL} d="M77 17 C81 18 84 16 88 16 C89 19 87 21 84 21 C81 21 79 20 77 17 Z" />
      </svg>
      <div className="isle-lift">
        {LIFT.map((b, i) => (
          <span
            key={i}
            className="isle-bird"
            style={{ ['--dx' as string]: b.dx, ['--dy' as string]: b.dy, animationDelay: `${b.delay}s` }}
          >
            <svg viewBox="-8 -5 16 6" focusable="false">
              <path d="M-7 0 Q-3.5 -4.2 0 0 Q3.5 -4.2 7 0" style={{ animationDelay: `${-i * 0.13}s` }} />
            </svg>
          </span>
        ))}
      </div>
    </div>
  )
}

export function HeroIsleFront() {
  return (
    <div className="isle isle-front" aria-hidden="true">
      <svg viewBox="0 0 464 100" focusable="false">
        <defs>
          <linearGradient id="isle-front-rock" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={ROCK_LIT} />
            <stop offset="0.55" stopColor={ROCK_MID} />
            <stop offset="1" stopColor={ROCK_COOL} />
          </linearGradient>
          <linearGradient id="isle-front-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={GRASS_LIT} />
            <stop offset="1" stopColor={GRASS_COOL} />
          </linearGradient>
          <linearGradient id="isle-front-skirt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fb8c0" stopOpacity="0.45" />
            <stop offset="1" stopColor="#8fb8c0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path fill="url(#isle-front-skirt)" d="M28 87 L466 87 L466 99 C360 100 200 99 110 95 C70 93 44 90 28 87 Z" />
        <path
          fill="url(#isle-front-rock)"
          d="M30 87 C40 84 52 80 62 70 C70 60 76 40 84 24 C88 16 96 10 108 8 C150 6 200 9 240 7 C290 5 330 8 362 10 C384 12 400 24 418 40 C432 54 446 72 462 87 Z"
        />
        {/* The sunlit cliff on the left end. */}
        <path fill="#efdcb8" d="M30 87 C40 84 52 80 62 70 C70 60 76 40 84 24 C88 16 96 10 108 8 C102 22 98 40 96 56 C94 70 92 80 94 87 Z" />
        <path fill={ROCK_COOL} opacity="0.55" d="M372 30 C392 40 410 54 424 66 C436 76 446 82 462 87 L404 87 C398 70 390 52 372 30 Z" />
        <g fill="none" strokeLinecap="round">
          <path d="M112 44 C150 40 200 46 248 42 C290 39 330 44 360 42" stroke="#f5e6c8" strokeWidth="1.3" opacity="0.8" />
          <path d="M122 62 C170 58 220 64 280 60 C320 57 350 62 380 60" stroke="#bda98a" strokeWidth="1.1" opacity="0.65" />
          <path d="M180 30 L176 52 M262 32 L266 58 M320 34 L316 50" stroke="#bda98a" strokeWidth="1" opacity="0.5" />
          <path d="M72 58 L86 55 M66 70 L82 68" stroke="#fff3da" strokeWidth="1.2" opacity="0.8" />
        </g>
        <path fill="#9d9a92" opacity="0.28" d="M104 20 C140 30 170 26 200 30 C230 33 260 28 290 31 C320 34 350 30 372 34 C390 40 404 52 416 60 L416 64 C400 56 386 46 368 40 C340 36 320 40 290 37 C260 34 230 39 200 36 C170 33 140 36 104 26 Z" />
        <path
          fill="url(#isle-front-grass)"
          d="M96 11 C100 9 104 8 108 8 C150 6 200 9 240 7 C290 5 330 8 362 10 C384 12 400 24 418 40 C432 54 446 72 456 81 C440 77 430 66 416 59 C400 51 390 37 370 31 C340 27 320 31 290 28 C260 25 230 31 200 27 C170 24 140 29 120 25 C108 23 100 18 96 11 Z"
        />
        <path fill="#c9de9f" d="M108 8 C150 6 200 9 240 7 C290 5 330 8 362 10 C330 11 290 9 240 11 C200 13 150 10 108 8 Z" />
        <path fill={SAND} d="M30 87 C60 82 100 81 140 82.5 C220 84.5 300 80.5 380 82 C420 83 446 84 462 87 Z" />
        <path d={foam(22, 470, 87.5, 1.1, 14)} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        <path d={foam(44, 450, 93, 0.8, 22)} fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      </svg>
    </div>
  )
}

export function AboutIsle() {
  return (
    <div className="isle isle-about" aria-hidden="true">
      <svg viewBox="0 0 600 100" focusable="false">
        <defs>
          <linearGradient id="isle-about-skirt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fb8c0" stopOpacity="0.4" />
            <stop offset="1" stopColor="#8fb8c0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="isle-about-rock" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={ROCK_LIT} />
            <stop offset="0.5" stopColor={ROCK_MID} />
            <stop offset="1" stopColor={ROCK_COOL} />
          </linearGradient>
        </defs>
        <path fill="url(#isle-about-skirt)" d="M40 86 L604 86 L604 97 C460 99 300 98 150 93 C100 91 64 89 40 86 Z" />
        {/* The sea stack off the western tip. */}
        <path fill={ROCK_COOL} d="M40 86 C42 72 46 60 52 55 C58 52 62 56 64 62 C66 70 68 78 71 86 Z" />
        <path fill={ROCK_LIT} d="M40 86 C42 72 46 60 52 55 C53 64 52 76 54 86 Z" />
        <path fill={GRASS_LIT} d="M49 57 C51 54 55 53 58 54 C56 57 52 58 49 57 Z" />
        {/* The long island: a cliff, one rounded hill, then a long low tail. */}
        <path
          fill="url(#isle-about-rock)"
          d="M96 86 C104 80 110 70 118 62 C128 54 150 52 176 48 C206 44 236 32 266 29 C294 27 316 34 340 40 C380 48 420 50 460 52 C500 54 530 60 556 70 C572 76 586 81 600 86 Z"
        />
        <path fill="#efdcb8" d="M96 86 C104 80 110 70 118 62 C122 58 128 56 134 55 C128 64 124 76 126 86 Z" />
        <path
          fill={GRASS_COOL}
          d="M128 56 C150 52 176 48 206 44 C236 32 266 29 294 27 C316 34 340 40 380 48 C420 50 460 52 500 54 C530 60 556 70 580 79 C556 76 532 68 502 64 C462 60 422 60 382 58 C346 54 318 46 292 42 C262 42 236 50 206 54 C176 58 150 60 128 56 Z"
        />
        <path fill={GRASS_LIT} d="M134 55 C160 50 190 47 210 43 C236 32 262 29 290 28 C270 33 250 38 226 46 C200 54 170 56 134 55 Z" />
        <g fill="#6f9877">
          <circle cx="246" cy="31" r="5" /><circle cx="256" cy="28" r="6" /><circle cx="268" cy="28.5" r="4.6" />
          <circle cx="412" cy="49" r="3.6" /><circle cx="420" cy="48" r="4.2" />
        </g>
        <g fill="#93b886">
          <circle cx="244.6" cy="29.6" r="2.6" /><circle cx="254.4" cy="26.2" r="3.2" /><circle cx="410.8" cy="47.8" r="1.8" />
        </g>
        <path fill={SAND} d="M96 86 C150 82 220 81 300 82.5 C380 84 470 80 560 82 C580 83 592 84 600 86 Z" />
        <path d={foam(34, 604, 86.6, 0.9, 16)} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        <path d={foam(60, 590, 92, 0.7, 26)} fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
      </svg>
    </div>
  )
}

export function Coast() {
  return (
    <div className="isle isle-coast" aria-hidden="true">
      <div className="isle-coast-foam">
        <svg viewBox="0 0 400 24" preserveAspectRatio="none" focusable="false">
          <path d={`${foam(-20, 420, 10, 3, 28)} L420 24 L-20 24 Z`} fill="#e9f4f2" opacity="0.9" />
          <path d={foam(-20, 420, 10, 3, 28)} fill="none" stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d={foam(-6, 420, 16, 2, 40)} fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.7" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <svg className="isle-coast-dune" viewBox="0 0 220 100" focusable="false">
        <path fill="#e4d2ad" d="M0 100 C30 92 60 70 100 56 C130 46 160 42 190 44 C204 45 214 48 220 50 L220 100 Z" />
        <path fill={SAND} d="M0 100 C30 92 60 70 100 56 C116 50 130 47 144 46 C120 60 96 80 84 100 Z" />
        <g fill="none" stroke="#7fa67f" strokeWidth="2" strokeLinecap="round">
          <path d="M120 52 Q118 36 110 26" /><path d="M126 50 Q128 34 136 24" /><path d="M150 46 Q148 30 140 20" />
          <path d="M158 45 Q162 32 172 24" /><path d="M186 44 Q184 30 178 22" /><path d="M196 45 Q200 34 208 28" />
        </g>
        <g fill="none" stroke="#a8c88a" strokeWidth="1.6" strokeLinecap="round">
          <path d="M123 51 Q121 40 116 32" /><path d="M154 45 Q156 34 162 28" /><path d="M190 44 Q190 34 194 26" />
        </g>
      </svg>
    </div>
  )
}

/** The islands' styles, rendered once by MobileSpace next to SeaBackground. */
export function SeaIslandStyles() {
  return (
    <style jsx global>{`
      .isle { display: none; pointer-events: none; }
      :root[data-theme='light'] .isle { display: block; }
      .isle svg { display: block; width: 100%; height: auto; overflow: visible; }

      /* Hero, behind the photo: its base sits on the horizon (the scene's
         bottom edge), centred on the photo. */
      .isle-back {
        position: absolute;
        left: calc(var(--apex) - var(--photo-w) * 1.05);
        bottom: 0;
        width: calc(var(--photo-w) * 2.1);
      }
      /* Hero, in front of the photo (inside .ms-planet, whose top is 160px
         above the horizon): the plateau crest lands exactly on the horizon
         and the rock reaches 0.2 x photo height below it, past --sink. */
      .isle-front {
        position: absolute;
        left: calc(var(--apex) - var(--photo-w) * 0.8);
        top: calc(160px - var(--photo-h) * 0.0208);
        width: calc(var(--photo-w) * 1.6);
      }

      /* Calm water around the ledge's base. At rest it matches the sea under
         it; while the hero scrolls away the island carries this pool with it,
         so its base fades into water instead of a hard foam line over sky. */
      .isle-front::before {
        content: '';
        position: absolute;
        z-index: -1;
        left: -45%;
        right: -45%;
        top: 74%;
        height: 140%;
        pointer-events: none;
        background: radial-gradient(50% 50% at 50% 22%, rgb(201 226 227 / 0.96) 0%, rgb(201 226 227 / 0.8) 42%, rgb(201 226 227 / 0) 100%);
      }

      /* Birds lifting off the peak: a short burst, then a long pause. */
      .isle-lift { position: absolute; left: 24%; top: 9%; width: 0; height: 0; }
      .isle-bird {
        position: absolute;
        --bw: max(12px, calc(var(--photo-h) * 0.036));
        left: calc(var(--bw) / -2);
        top: calc(var(--bw) / -3);
        width: var(--bw);
        opacity: 0;
        animation: isle-lift 15s cubic-bezier(0.35, 0.05, 0.45, 1) infinite;
      }
      .isle-bird path {
        fill: none;
        stroke: #3e4a5c;
        stroke-opacity: 0.72;
        stroke-width: 1.6;
        stroke-linecap: round;
        stroke-linejoin: round;
        transform-box: fill-box;
        transform-origin: 50% 100%;
        animation: isle-flap 0.3s ease-in-out infinite alternate;
      }
      @keyframes isle-lift {
        0% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.5); }
        3% { opacity: 1; }
        12% {
          transform: translate3d(calc(var(--dx) * var(--photo-h) * 0.3), calc(var(--dy) * var(--photo-h) * 0.5), 0) scale(0.8);
        }
        26% { opacity: 0.9; }
        32%, 100% {
          opacity: 0;
          transform: translate3d(calc(var(--dx) * var(--photo-h)), calc(var(--dy) * var(--photo-h)), 0) scale(1.05);
        }
      }
      @keyframes isle-flap {
        from { transform: scaleY(1); }
        to   { transform: scaleY(-0.5); }
      }

      /* About: a long low island across the lower right of the station. */
      .isle-about {
        position: absolute;
        right: -16%;
        bottom: 14%;
        width: clamp(380px, 120vw, 1040px);
      }

      /* Contact: the beach along the bottom, foam lapping at its top edge. */
      .isle-coast {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: clamp(64px, 12svh, 140px);
        background: linear-gradient(180deg, transparent 0, transparent 8px, #e3d9c0 9px, #eadfc5 32%, #f2e6cc 62%, #f0e2c4 100%);
      }
      .isle-coast-foam {
        position: absolute;
        left: -24px;
        right: -24px;
        top: -6px;
        height: 22px;
        animation: isle-lap 7s ease-in-out infinite alternate;
      }
      .isle-coast-foam svg { width: 100%; height: 100%; }
      @keyframes isle-lap {
        from { transform: translate3d(-12px, 2px, 0); }
        to   { transform: translate3d(12px, -2px, 0); }
      }
      .isle .isle-coast-dune {
        position: absolute;
        right: 0;
        bottom: 0;
        width: clamp(150px, 42vw, 340px);
      }

      @media (prefers-reduced-motion: reduce) {
        .isle-bird { animation: none; opacity: 0; }
        .isle-bird path,
        .isle-coast-foam { animation: none; }
      }
    `}</style>
  )
}

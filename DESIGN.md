# Design — shahfahad.dev, "cinematic deep space"

Read with PRODUCT.md. This file is the visual contract: every surface (desktop
tunnel, HUD, mobile, drawers, loader, later the subpages) follows it.

## 1. Scene

A hiring manager clicks a link late in the day, in a dim room or inside the
LinkedIn app. The screen goes dark like a cinema before the titles: cold deep
space, a single warm light, a name set big and wide. Calm, expensive, precise.
Daylight mode is the same world seen from orbit at noon: pale cool sky, ink
type, the same warm light.

Reference feel: Apple launch pacing and restraint; Active Theory's cinematic
WebGL that still reads as a product; the classic teal-and-orange film grade.

## 2. Color

Strategy: **Drenched space + one accent.** The surface IS deep space
(blue-black, never pure black). Atmosphere is cold and low-chroma. The only
saturated colour is **ember** (warm orange), and it covers well under 10% of
any frame.

Tokens live in `app/globals.css` (RGB triplets: `rgb(var(--x) / a)`). WebGL
mirrors them in `lib/palette.ts` (`useScenePalette()`).

| token | dark | light | use |
|---|---|---|---|
| `--space-0` | #05080f | #f4f7fb | page + canvas |
| `--space-1` | #0a0e17 | #ecf1f6 | subtle bands |
| `--surface` | #0f141d | #fcfdff | raised panels (solid, not glass) |
| `--surface-2` | #181e29 | #e4eaf1 | hover, inner wells |
| `--line` | #2d333d | #cbd2d9 | hairlines |
| `--ink` | #f1f3f8 | #121927 | headings, primary text |
| `--ink-2` | #b8bec8 | #454d5d | body / lead |
| `--ink-3` | #9299a5 | #576070 | meta, captions (still AA) |
| `--accent` | #fc9e47 | #dd6300 | fills, glows, large text |
| `--accent-text` | #fc9e47 | #a3420c | accent as small text |
| `--accent-ink` | #05080f | #121927 | text on an accent fill |
| `--nebula-a/b` | cold blue / sea teal | pale blue / pale teal | atmosphere only, never text |
| `--flutter-accent`, `--status-*` | | | Flutter logo + git status only |

Contrast is computed (WCAG ratios in the globals.css header). Every text
token passes AA in its theme against what is really behind the text, not
only the token: the daylight sky renders darker than `--space-0` (about
#e6ecf2 behind the copy), so light `--ink-3` (5.9:1 on #f4f7fb, 5.3:1 on the
sky) and `--accent-text` (5.9 / 5.3) keep headroom above 4.5. **Never** put
`--accent` (light) as small text; use `--accent-text`. Never set text in
nebula colours.

Where ember is allowed: primary CTA fill, the active station on the rail, one
highlighted word or numeral per station at most, focus rings, link hover,
key data highlights (the merged count), the warm key light and rims in 3D.
Nowhere else. No second accent: no teal, violet, cyan, rainbow brand icons.

Retired: `#5EEAD4` teal identity, violet/lavender, neon cyan, gradient fills,
glow on everything.

## 3. Typography

One variable family, **Archivo** (`wdth` 62–125, `wght` 100–900), loaded once
via next/font as `--font-display` (`--font-body` aliases it). Contrast comes
from the width axis: expanded + heavy for titles (film title card), normal
width for reading. **JetBrains Mono** (400/500/700) only for real data: PR
numbers, dates, diffs, commit hashes, coordinates, counters.

Classes in globals.css (use them, or match their values inline):

| class | spec | use |
|---|---|---|
| `.t-display` | wdth 125, 800, -0.035em, lh .92, balance | the name, the one hero line |
| `.t-title` | wdth 112, 700, -0.025em, lh 1.02 | station / page titles |
| `.t-subtitle` | wdth 106, 600, -0.012em, lh 1.2 | card titles, roles |
| `.t-lead` | body 400, lh 1.6, ink-2, pretty | lead paragraphs |
| `.t-label` | body 500, 13px | chrome, nav, buttons |
| `.t-data` | mono, tabular-nums, 12px | data only |

Scale (desktop / mobile):
- Hero name: `clamp(56px, 7vw, 96px)` / `clamp(44px, 13.5vw, 64px)` — max 96px.
- Station title: `clamp(40px, 4.4vw, 64px)` / `clamp(34px, 10vw, 46px)`.
- Lead: 18–19px / 16px. Body never below 15px on mobile, 14px on desktop.
- Labels: 13px. Data: 12px. **Nothing below 12px** except decorative 3D.
- Light text on dark: line-height +0.05.

Bans: tiny uppercase tracked eyebrows above headings; mono as costume (mono
caps for nav, buttons, labels, emails, phone numbers); numbered section
markers except where order is real (the station rail position, a carousel
counter like `01 / 05`); faux bold (only load weights you use); all-caps body.

Sentence case everywhere. Titles may end with a period when they are
statements ("Merged upstream.").

## 4. Layout

- Desktop tunnel: content overlays sit on a 12-col mental grid; left rail
  (≈ 160px) is navigation, content block starts at `max(200px, 12vw)` and is
  `min(560px, 44vw)` wide; right side belongs to the 3D object of the station.
  One dominant idea per station. Asymmetry is the default.
- Mobile: one column, 20px gutters (left 44px to clear the rail), sections are
  `min-height: 100svh` scenes with their own composition, not stamped templates.
- Panels: solid `--surface` at 0.72–0.9 alpha with a 1px `--line` border and a
  tinted shadow (up to 0.94 dark / 0.98 light when a planet sits directly
  behind small text, e.g. the Work library). No glassmorphism by default; `backdrop-filter` only on the
  mobile top bar if it is genuinely needed. The drawer overlay is a static
  `--space-0` scrim at 0.7, never a blur.
- Radii: 6 (chips), 12 (inputs), 18 (panels), 999 (buttons). Never nested
  cards. No side-stripe borders. No identical card grids.
- z-index from the `--z-*` scale in globals.css.

## 5. Components

- **Buttons:** `.btn .btn--primary` (ember fill, accent-ink text), `.btn
  .btn--ghost` (ink hairline), `.btn--sm`; `.link-quiet` for inline links.
  Arrow glyphs inside `<span class="btn-arrow">→</span>`. Max one primary per
  view. Hover, active (press `scale(0.97)` in 80ms, 160ms release),
  focus-visible and forced-colors edges are in CSS; do not re-implement hover
  in JS. `.link-quiet` draws its hairline as an `::after` scaled on X.
- **Hover:** every `:hover` rule sits inside `@media (hover: hover) and
  (pointer: fine)`, so nothing sticks after a tap. Touch gets `:active`.
- **Rail (desktop + mobile):** a thin vertical line with ticks; the active
  tick is ember with the station name in ink; others ink-3. Sentence-case
  names: Intro, About, Skills, Work, Open source, Experience, Contact.
  `aria-current="step"` on the active item, 24px+ hit targets (44px mobile).
- **Data rows:** mono for the value, body for the label, `--line` dividers.
- **Drawers:** one shared shell; solid surface, hairline, focus trap, initial
  focus, focus return, Escape, reduced motion. No scanlines, no gradients.
  While one is open, `<html data-drawer-open>` is set (the grain pauses) and
  `sf:drawer-open` / `sf:drawer-close` fire on window so the WebGL scene can
  stop drawing. Mobile sheet: dismiss past 25% of its height or a flick
  faster than 300px/s.
- **Icons:** react-icons (fa6) at one stroke weight; no emoji or glyphs as UI.

## 6. Motion

Easing: `--ease-out` (quint) for UI, `--ease-out-expo` for reveals,
never bounce/elastic. Durations: 160 (hover), 280 (state), 520 (reveal),
900 (scene). Transform/opacity/clip-path/filter only.

- **Station entrance (desktop HUD):** title lines rise out of a mask
  (`translateY(105%) → 0`, 520ms expo, 60ms stagger), lead and actions fade up
  8px after. Exit is a 280ms crossfade. Driven by proximity, so it reverses
  naturally when scrolling back.
- **Ambient:** only in 3D (slow planet spin, star twinkle, nebula drift).
  No infinite floats or pulses on DOM text or panels.
- **Camera:** frame-rate independent damping, small roll (≤ 0.08 rad), slight
  look-ahead; it should feel like a dolly, not a rollercoaster.
- **Loader:** one orchestrated moment, an overlay ABOVE the app (AppShell
  mounts underneath on frame 0): a single ember point ignites, the name
  rises through a mask and is up by ~300ms, a hairline fills, the name
  leaves and the light draws back into the point (2.2s). That last frame is
  held until the app reports its first real frame (`sf:app-ready`), at most
  1.5s, then a 280ms crossfade. Touch: no exit, the card fades from 1.12s
  and is gone by 1.4s. Every chunk on the way to the first frame falls back
  to the same held frame (BootFrame), so there is never an empty screen.
  `<html data-booting>` is set while the card is up and `sf:loader-exit`
  fires when it starts to leave: hold entrance reveals until then.
- **Theme switch:** a 520ms circle reveal from the toggle (View
  Transitions). `<html data-theme-switching>` turns CSS transitions off
  while it runs, so the new view never shows colours mid-fade.
- **Grain:** six offsets at 8fps (`steps(1, end)` per segment), paused while
  a drawer is open, static and viewport-sized on touch / reduced motion.
- Reduced motion: everything becomes opacity crossfades or instant. Content is
  visible by default; reveals enhance, never gate visibility.

## 7. 3D art direction (desktop tunnel)

- **Sky:** near-black with sparse cold nebula filaments (`palette.nebula`),
  no flat blue wash. A real star field (neutral warm/cool whites, gentle
  twinkle, size 1–3px), counts from the quality preset.
- **Planets:** one restrained family lit by a single warm key light from upper
  left (`palette.keyLight`) with a terminator, plus a cold rim. Palette:
  graphite, dust, ice, stone, and a natural Earth for Contact. No neon cyan,
  no violet giant. Ember appears only as the lit rim/atmosphere of the hero
  planet.
- **Station labels in space:** quiet wayfinding, not glowing per-letter
  gimmicks: Archivo wide 600, ink at low alpha, no float animation.
- **Grain:** global CSS `.grain` (already mounted in layout). Vignette via
  `.vignette` over the canvas. No EffectComposer unless measured on high.
- **Daylight:** pale sky haze, faint warm sun side, stars mostly hidden,
  planets lit the same way, all text in ink.

## 8. Station content (copy) — honest, specific

Use the same copy on desktop and mobile.

| station | title | lead / content |
|---|---|---|
| Intro | Shah Fahad | Senior software engineer building real-time web and mobile products. React, Next.js, Flutter and WebRTC, from Karachi, Pakistan. CTAs: **See the work** (primary, scroll to Work) · **Resume** (ghost, `/Shah_Fahad_Resume.pdf`) |
| About | I ship products people use. | 8+ years turning ideas into shipped software, from Miletap's real-time video platform to DigitalHire's hiring system. Facts row (data): `8+ years` · `DigitalHire · Kistpay · Miletap` · `Karachi, PK`. No stats strip, no tech chips, no fake terminal. |
| Skills | Eight years of craft. | React and Next.js on the web, Flutter on mobile, WebRTC and SignalR when it has to be live. The 3D orbit is the visual; categories from `data/projects.ts` `skills`. |
| Work | Selected work. | Shipped products and engineering demos (data-driven showcase). |
| Open source | Merged upstream. | `N` pull requests merged into Flutter and the Supabase Flutter SDK (derive N from `data/open-source.ts`). Rotating PR card. |
| Experience | Where I've worked. | DigitalHire, Kistpay and Miletap, plus part-time work for E-Ocean and Entertech: frontend, real-time and mobile. Static testimonial with prev/next, no autoplay. |
| Contact | Let's build something. | Open to senior frontend and real-time roles, full-time or contract. Email as a big link; **Write to me** (opens drawer) · **Book a 15-min call** (cal.com). |

Remove everywhere: "Welcome to my space", "Hi, I'm…", "FOLLOW ME",
"PORTFOLIO", duplicate scroll hints, "⚡ Quality", "★", "25+ clients",
"9+ projects", "6 Years of Craft", "built in space".

## 9. Performance contract (do not break)

AppShell eligibility gate and `?view=` override; dynamic imports; loader
once per session (an inline head script hides it before first paint when the
session has seen it); detect-gpu skipped when a quality override is stored;
third-party embeds (LeFlux) only after first interaction or ≥5s idle, never
during the loader; `frameloop="demand"` + 36fps RenderDriver; `dpr={1}`;
never key the Canvas on theme; ProximityGate for heavy Html; context-loss
remount; time-based animation in useFrame; no Lenis/framer/GSAP/R3F on the
mobile path; starfield parallax via one CSS var; next/image + video source
triplets kept; quality presets in `lib/quality.ts` actually drive cost.

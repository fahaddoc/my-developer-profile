'use client'

// MobileSpace — the classic experience: touch devices, screens under 1024px
// and reduced-motion desktops (AppShell decides). Same journey and the same
// copy as the desktop tunnel (DESIGN.md §8), told as seven scenes in one
// scroller over the CSS starfield (dark) or the illustrated sea (light:
// SeaBackground, with SeaIslands standing in for the planets).
//
// Three compositions from one markup:
// - phones (<640px): one column, even gutters; a Set course dock at the bottom.
// - tablets and narrow windows (640-1023px): the column widens to 880px and
//   centres; the hero planet flattens so its ember rim stays above the copy.
// - >=1024px (iPad landscape, reduced-motion desktops): stations split into
//   two columns (copy left, proof right) inside a centred 1120px frame, and
//   the hero puts the name left with the portrait standing on the planet to
//   the right, the horizon kept below the copy.
//
// Performance contract (DESIGN.md §9): no framer / GSAP / R3F / Lenis here.
// - StarfieldBackground owns the parallax: one passive rAF-throttled scroll
//   listener writing transforms on its four moving layers (fed by `scrollRef`).
// - One IntersectionObserver tracks the station under the centre line for the
//   Set course dock; one one-shot observer plays reveals once and then lets go; one more
//   warms the contact drawer chunk when Contact comes into view.
// - Reveals only hide content after JS sets `data-ms-ready`; reduced motion
//   never sets it, so content is visible by default. Focus reveals at once.
// - The project sheet is plain CSS transitions + a pointer-captured drag that
//   writes the panel transform directly.

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  FaChevronLeft,
  FaChevronRight,
  FaCircleHalfStroke,
  FaGithub,
  FaLinkedinIn,
  FaPlay,
  FaVolumeHigh,
  FaVolumeXmark,
  FaXmark,
} from 'react-icons/fa6'
import { useTheme } from '@/components/providers/ThemeProvider'
import { StarfieldBackground } from '@/components/mobile/StarfieldBackground'
import { SeaBackground } from '@/components/mobile/SeaBackground'
import { AboutIsle, Coast, HeroIsleBack, HeroIsleFront, SeaIslandStyles } from '@/components/mobile/SeaIslands'
import { FeaturedAchievement } from '@/components/featured/FeaturedAchievement'
import { StarMap } from '@/components/projects/starmap/StarMap'
import { HoloText } from '@/components/type/HoloText'
import { CourseDock, NavComputer } from '@/components/nav/NavComputer'
import { STATIONS as JOURNEY } from '@/lib/tunnel'
import { prefetchDrawer } from '@/components/ui/drawerPrefetch'
import { projects, experience, skills } from '@/data/projects'
import type { Project } from '@/data/projects'
import { testimonials } from '@/data/testimonials'
import { openSourceStats } from '@/data/open-source'

// ── content ──────────────────────────────────────────────────────────────────
const STATION_IDS = ['intro', 'about', 'skills', 'work', 'open-source', 'experience', 'contact'] as const
const WORK = 3
const CONTACT = 6
const EMAIL = 'hello@shahfahad.dev'
const RESUME = '/Shah_Fahad_Resume.pdf'
const CAL = 'https://cal.com/shahfahad'
const INTRO_POSTER = '/videos/shah-intro-poster-360.webp'

const CATEGORY: Record<Project['category'], string> = { web: 'Web', mobile: 'Mobile', realtime: 'Real-time' }

const shortTitle = (p: Project) => p.title.split(' — ')[0]
// Screenshots crop a little below the top (phone mockups keep their screen);
// the demo posters are left-aligned title cards, so they keep their left edge.
const coverPosition = (p: Project) => (p.image.endsWith('.svg') ? 'left center' : 'center 22%')
const projectSlug = (p: Project) => {
  const s = (p as Project & { slug?: unknown }).slug
  return typeof s === 'string' && s ? s : p.id
}
// "Real-Time" → "Real-time", "Tools & Platforms" → "Tools & platforms"; acronyms stay.
const sentenceCase = (s: string) =>
  s.replace(/([ -])([A-Za-z][a-z]+)/g, (_, sep: string, w: string) => sep + w.toLowerCase())

const iv = (i: number) => ({ ['--i' as string]: i }) as CSSProperties
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ═══════════════════════════════════════════════════════════════════════════
export default function MobileSpace() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stationEls = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [openProject, setOpenProject] = useState<Project | null>(null)

  const setStationRef = useCallback((i: number) => (el: HTMLElement | null) => {
    stationEls.current[i] = el
  }, [])

  // Reveal gate: hide-then-reveal only once JS is ready, never under reduced
  // motion. Layout effect so the hidden state lands before the first paint.
  // State lives in data attributes React never renders, so a re-render that
  // rewrites `class` can never hide revealed content again.
  useLayoutEffect(() => {
    const root = scrollRef.current
    if (!root || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return
    root.setAttribute('data-ms-ready', '')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.setAttribute('data-in', '')
          io.unobserve(e.target)
        }
      },
      { root, rootMargin: '0px 0px -8% 0px', threshold: 0 },
    )
    root.querySelectorAll('[data-reveal], [data-mask]').forEach((el) => io.observe(el))

    // Focus must never land on something invisible: every reveal around the
    // focused element shows at once (data-now skips the animation, so it does
    // not replay when focus moves on).
    const onFocusIn = (e: FocusEvent) => {
      let el = e.target instanceof Element ? e.target.closest('[data-reveal], [data-mask]') : null
      while (el) {
        el.setAttribute('data-in', '')
        el.setAttribute('data-now', '')
        io.unobserve(el)
        el = el.parentElement ? el.parentElement.closest('[data-reveal], [data-mask]') : null
      }
    }
    root.addEventListener('focusin', onFocusIn)
    return () => {
      root.removeEventListener('focusin', onFocusIn)
      io.disconnect()
      root.removeAttribute('data-ms-ready')
    }
  }, [])

  // Active station = the one crossing the viewport's centre line. Works for
  // stations taller than the screen and in landscape.
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const idx = stationEls.current.indexOf(e.target as HTMLElement)
          if (idx !== -1) setActive(idx)
        }
      },
      { root, rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    )
    stationEls.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  // Warm the contact drawer chunk (framer-motion + the shell) as Contact
  // comes into view, so the first tap on "Write to me" is never dead.
  useEffect(() => {
    const root = scrollRef.current
    const el = stationEls.current[CONTACT]
    if (!root || !el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        prefetchDrawer()
        io.disconnect()
      },
      { root, rootMargin: '0px 0px 20% 0px', threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const goTo = useCallback((i: number, focus = false) => {
    const el = stationEls.current[i]
    if (!el) return
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    if (focus) el.focus({ preventScroll: true })
  }, [])

  const closeSheet = useCallback(() => setOpenProject(null), [])

  // /#<station> (the subpages link back this way): land on that section; the
  // desktop ids are mapped to this layout's own
  useEffect(() => {
    const raw = decodeURIComponent(window.location.hash.slice(1))
    const alias: Record<string, string> = { hero: 'intro', projects: 'work', opensource: 'open-source' }
    const i = STATION_IDS.indexOf((alias[raw] ?? raw) as (typeof STATION_IDS)[number])
    if (i > 0) requestAnimationFrame(() => goTo(i, true))
  }, [goTo])
  const [course, setCourse] = useState(false)

  return (
    <>
      {/* Dark: deep space. Light: the illustrated sea. Both stay mounted and
          the data-theme attribute picks one, so a toggle swaps them in place. */}
      <div className="ms-bg-space">
        <StarfieldBackground scrollRef={scrollRef} />
      </div>
      <SeaBackground />
      <SeaIslandStyles />
      <TopBar onHome={() => goTo(0, true)} />
      {/* the flight plan's phone form: a dock that opens the nav computer */}
      <div className="ms-dock" data-ms-inert>
        <CourseDock station={JOURNEY[active]} onOpen={() => setCourse(true)} />
      </div>
      <NavComputer
        open={course}
        onClose={() => setCourse(false)}
        progress={JOURNEY[active].t}
        activeId={JOURNEY[active].id}
        showEta={false}
        onGo={(id) => goTo(JOURNEY.findIndex((st) => st.id === id), true)}
      />

      <div ref={scrollRef} className="mob-scroll" data-lenis-prevent data-ms-inert>
        <main>
          <Station i={0} setRef={setStationRef(0)} className="ms-st--hero">
            <Hero onWork={() => goTo(WORK, true)} />
          </Station>
          <Station
            i={1}
            setRef={setStationRef(1)}
            className="ms-st--about"
            after={
              <div className="ms-horizon" aria-hidden="true">
                <div className="ms-horizon-orb" />
                <AboutIsle />
              </div>
            }
          >
            <About />
          </Station>
          <Station i={2} setRef={setStationRef(2)}>
            <Skills />
          </Station>
          <Station i={3} setRef={setStationRef(3)} className="ms-st--work">
            <Work onOpen={setOpenProject} />
          </Station>
          <Station i={4} setRef={setStationRef(4)}>
            <OpenSource />
          </Station>
          <Station i={5} setRef={setStationRef(5)}>
            <Experience />
          </Station>
          <Station
            i={6}
            setRef={setStationRef(6)}
            className="ms-st--contact"
            after={
              <>
                <div className="ms-home-planet" aria-hidden="true" />
                <Coast />
              </>
            }
          >
            <Contact />
          </Station>
        </main>
      </div>

      {openProject && <ProjectSheet project={openProject} onClose={closeSheet} />}

      <style jsx global>{`
        /* ── scroller + stations ─────────────────────────────────────────── */
        .mob-scroll {
          position: relative;
          z-index: var(--z-content);
          height: 100svh;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior: contain;
          scroll-snap-type: y proximity;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          background: transparent;
        }
        .mob-scroll::-webkit-scrollbar { display: none; }
        .mob-scroll.is-locked { overflow-y: hidden; }
        @media (prefers-reduced-motion: reduce) {
          .mob-scroll { scroll-snap-type: none; }
        }

        .ms-st {
          --pad-t: 92px;
          --pad-b: 76px;
          --pad-l: max(20px, env(safe-area-inset-left));
          --pad-r: max(20px, env(safe-area-inset-right));
          position: relative;
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: var(--pad-t) var(--pad-r) var(--pad-b) var(--pad-l);
          scroll-snap-align: start;
          color: rgb(var(--ink));
        }
        .ms-st:focus { outline: none; }
        .ms-inner { position: relative; z-index: 1; width: 100%; max-width: 560px; }

        .ms-title {
          font-size: clamp(34px, 10vw, 46px);
          line-height: 1.04;
          color: rgb(var(--ink));
        }
        .ms-lead {
          font-size: 16px;
          line-height: 1.65;
          margin-top: 16px;
          max-width: 38ch;
        }
        .ms-em {
          color: rgb(var(--accent-text));
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        /* The one highlighted numeral in a lead is set large and bold, so it
           clears the large-text contrast bar on the daylight sky as well. */
        .ms-lead .ms-em { font-size: 1.2em; font-weight: 700; line-height: 1; }

        .ms-nw { white-space: nowrap; }

        /* Square icon variant of the shared ghost button. */
        .btn.ms-icon {
          --btn-h: 44px;
          width: 44px;
          padding: 0;
          flex: none;
        }
        .btn.ms-icon svg { width: 15px; height: 15px; }

        /* Wider screens: a centred frame that uses the width (DESIGN.md §4). */
        @media (min-width: 640px) {
          .ms-st {
            --pad-t: 104px;
            --pad-b: 88px;
            --pad-l: max(40px, env(safe-area-inset-left));
            --pad-r: max(40px, env(safe-area-inset-right));
          }
          .ms-inner { max-width: 880px; margin-inline: auto; }
          .ms-title { font-size: clamp(44px, 5.6vw, 64px); }
          .ms-lead { font-size: 18px; max-width: 46ch; }
        }
        @media (min-width: 1024px) {
          .ms-st { --pad-t: 112px; --pad-b: 96px; }
          .ms-inner { max-width: 1120px; }
          .ms-split {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr);
            column-gap: clamp(56px, 6.5vw, 112px);
            align-items: center;
          }
          /* The proof column starts flush; a reveal wrapper passes it on. */
          .ms-split > .ms-col-b > :first-child,
          .ms-split > .ms-col-b > [data-reveal]:first-child > :first-child { margin-top: 0; }
        }

        /* ── reveals (one-shot; only after data-ms-ready) ───────────────── */
        [data-ms-ready] [data-reveal]:not([data-in]) { opacity: 0; transform: translate3d(0, 10px, 0); }
        [data-ms-ready] [data-reveal][data-in] {
          animation: ms-fade-up var(--dur-3) var(--ease-out-expo) both;
          animation-delay: calc(var(--i, 0) * 70ms);
        }
        [data-ms-ready] [data-reveal='rise']:not([data-in]) { transform: translate3d(0, 28px, 0); }
        [data-ms-ready] [data-reveal='rise'][data-in] { animation: ms-rise var(--dur-4) var(--ease-out-expo) both; }
        [data-ms-ready] [data-reveal='group']:not([data-in]) { opacity: 1; transform: none; }
        [data-ms-ready] [data-reveal='group'][data-in] { animation: none; }
        [data-ms-ready] [data-reveal='group']:not([data-in]) .ms-si { opacity: 0; }
        [data-ms-ready] [data-reveal='group'][data-in] .ms-si {
          animation: ms-fade-up var(--dur-3) var(--ease-out-expo) both;
          animation-delay: calc(var(--i, 0) * 45ms);
        }
        [data-ms-ready] [data-mask]:not([data-in]) > * { transform: translate3d(0, 105%, 0); }
        [data-ms-ready] [data-mask][data-in] > * {
          animation: ms-mask-up var(--dur-3) var(--ease-out-expo) both;
          animation-delay: calc(var(--i, 0) * 70ms);
        }
        /* Focus inside a reveal shows it instantly (keyboard, screen readers). */
        [data-ms-ready] [data-reveal]:focus-within,
        [data-ms-ready] [data-reveal][data-now],
        [data-ms-ready] [data-reveal]:focus-within .ms-si,
        [data-ms-ready] [data-reveal][data-now] .ms-si,
        [data-ms-ready] [data-mask]:focus-within > *,
        [data-ms-ready] [data-mask][data-now] > * { opacity: 1; transform: none; animation: none; }
        @keyframes ms-fade-up {
          from { opacity: 0; transform: translate3d(0, 10px, 0); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes ms-rise {
          from { opacity: 0; transform: translate3d(0, 28px, 0); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes ms-mask-up {
          from { transform: translate3d(0, 105%, 0); }
          to   { transform: none; }
        }
        @keyframes ms-fade { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          [data-ms-ready] [data-reveal],
          [data-ms-ready] [data-reveal] .ms-si,
          [data-ms-ready] [data-mask] > * { opacity: 1 !important; transform: none !important; animation: none !important; }
        }

        /* ── top bar ─────────────────────────────────────────────────────── */
        .ms-topbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: var(--z-chrome);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 18px max(20px, env(safe-area-inset-left));
          background: linear-gradient(rgb(var(--space-0) / 0.94) 0%, rgb(var(--space-0) / 0.8) 58%, rgb(var(--space-0) / 0) 100%);
          pointer-events: none;
        }
        .ms-topbar > * { pointer-events: auto; }
        /* Daylight sky is blue-tinted at the top (StarfieldBackground mixes
           --nebula-a 32% into --space-0); match it so the scrim leaves no band. */
        @supports (color: color-mix(in srgb, red 50%, blue)) {
          :root[data-theme='light'] .ms-topbar {
            --sky-top: #c9dff0; /* SeaBackground's zenith (--sky-top there) */
            background: linear-gradient(
              color-mix(in srgb, var(--sky-top) 94%, transparent) 0%,
              color-mix(in srgb, var(--sky-top) 80%, transparent) 58%,
              color-mix(in srgb, var(--sky-top) 0%, transparent) 100%
            );
          }
        }
        .ms-wordmark {
          min-height: 44px;
          padding: 0;
          border: 0;
          background: none;
          color: rgb(var(--ink));
          font-family: var(--font-display), system-ui, sans-serif;
          font-variation-settings: 'wdth' 112;
          font-weight: 700;
          font-size: 16px;
          letter-spacing: -0.012em;
          cursor: pointer;
          transition: transform var(--dur-1) var(--ease-out);
        }
        .ms-wordmark:active { transform: scale(0.97); transition-duration: 80ms; }

        /* ── set course dock (components/nav/NavComputer) ─────────────────── */
        .ms-dock {
          position: fixed;
          left: 50%;
          bottom: max(16px, env(safe-area-inset-bottom));
          z-index: var(--z-chrome);
          translate: -50% 0;
        }

        /* ── 0 · intro ───────────────────────────────────────────────────── */
        .ms-st--hero {
          --top: 60px;
          --scene-h: clamp(180px, calc(100svh - 400px), 380px);
          --horizon: calc(var(--top) + var(--scene-h));
          --photo-h: calc(var(--scene-h) * 1.1);
          --photo-w: calc(var(--photo-h) * 0.7534);
          --sink: 0.16; /* share of the photo hidden behind the horizon */
          --apex: 60%;
          /* Planet diameter. Wide enough that the rim drops less than
             --copy-gap across the copy's left edge, so it never crosses it. */
          --orb: max(300vw, 1000px);
          --copy-gap: 36px;
          justify-content: flex-start;
          padding-top: var(--top);
          overflow: hidden;
          overflow: clip;
        }
        .ms-hero-scene {
          position: relative;
          height: var(--scene-h);
          margin-left: calc(-1 * var(--pad-l));
          margin-right: calc(-1 * var(--pad-r));
        }
        .ms-sunrise {
          position: absolute;
          left: var(--apex);
          bottom: -40px;
          width: min(150%, 760px);
          height: 120%;
          transform: translateX(-50%);
          pointer-events: none;
          background:
            radial-gradient(42% 46% at 50% 100%, rgb(var(--accent) / 0.34), rgb(var(--accent) / 0.1) 48%, transparent 74%);
        }
        .ms-intro {
          position: absolute;
          left: calc(var(--apex) - var(--photo-w) / 2);
          bottom: calc(var(--photo-h) * var(--sink) * -1);
          width: var(--photo-w);
          height: var(--photo-h);
        }
        .ms-intro-card {
          position: absolute;
          inset: 0;
          display: block;
          padding: 0;
          border: 0;
          background: none;
          cursor: pointer;
          perspective: 900px;
          -webkit-tap-highlight-color: transparent;
        }
        .ms-intro-card:focus-visible { outline-offset: 6px; border-radius: 14px; }
        .ms-intro-inner {
          position: absolute;
          inset: 0;
          display: block;
          transform-style: preserve-3d;
          transition: transform 560ms var(--ease-in-out);
        }
        .ms-intro[data-flipped='true'] .ms-intro-inner { transform: rotateY(180deg); }
        .ms-intro-face {
          position: absolute;
          inset: 0;
          display: block;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .ms-intro-back { transform: rotateY(180deg); }
        .ms-intro-media {
          filter: drop-shadow(0 0 1px rgb(var(--accent) / 0.5)) drop-shadow(-4px -3px 14px rgb(var(--accent) / 0.22));
        }
        .ms-intro-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: bottom;
        }
        .ms-intro-ctl {
          position: absolute;
          left: -18px;
          bottom: calc(var(--photo-h) * var(--sink) + 18px);
          z-index: 4;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 14px 0 12px;
          border-radius: 999px;
          border: 1px solid rgb(var(--ink) / 0.22);
          background: rgb(var(--space-0) / 0.74);
          color: rgb(var(--ink));
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          cursor: pointer;
          transition:
            border-color var(--dur-1) var(--ease-out),
            background-color var(--dur-1) var(--ease-out),
            transform var(--dur-1) var(--ease-out);
        }
        .ms-intro-ctl::before { content: ''; position: absolute; inset: -5px -2px; }
        .ms-intro-ctl svg { width: 11px; height: 11px; flex: none; }
        .ms-intro-ctl--sound svg { width: 14px; height: 14px; }
        .ms-intro-card:active .ms-intro-ctl,
        .ms-intro-ctl:active { transform: scale(0.97); transition-duration: 80ms; }
        @media (hover: hover) and (pointer: fine) {
          .ms-intro-card:hover .ms-intro-ctl,
          .ms-intro-ctl:hover { border-color: rgb(var(--ink) / 0.42); }
        }
        .ms-intro-ctl:focus-visible { outline-offset: 3px; border-radius: 999px; }
        /* Reduced motion: no 3D turn, the two faces crossfade instead. */
        @media (prefers-reduced-motion: reduce) {
          .ms-intro-inner { transition: none; transform: none !important; }
          .ms-intro-face { transition: opacity var(--dur-2) linear; }
          .ms-intro-back { transform: none; opacity: 0; }
          .ms-intro[data-flipped='true'] .ms-intro-back { opacity: 1; }
          .ms-intro[data-flipped='true'] .ms-intro-front { opacity: 0; }
        }

        .ms-planet {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(var(--horizon) - 160px);
          bottom: 0;
          z-index: 2;
          overflow: hidden;
          pointer-events: none;
          -webkit-mask-image: linear-gradient(#000 calc(100% - 140px), transparent);
          mask-image: linear-gradient(#000 calc(100% - 140px), transparent);
        }
        .ms-planet-orb {
          position: absolute;
          top: 160px;
          left: var(--apex);
          width: var(--orb);
          aspect-ratio: 1;
          border-radius: 50%;
          transform: translateX(-50%);
          background: linear-gradient(180deg, rgb(var(--surface-2)) 0px, rgb(var(--space-1)) 70px, rgb(var(--space-0)) 240px);
          box-shadow:
            inset 0 1.5px 0 rgb(var(--accent) / 0.9),
            inset 0 16px 26px -16px rgb(var(--accent) / 0.55),
            0 -1px 10px rgb(var(--accent) / 0.35),
            0 -22px 70px -8px rgb(var(--accent) / 0.2);
        }
        /* The scene, planet and copy position against the section itself. */
        .ms-st--hero .ms-inner { position: static; max-width: none; }
        .ms-hero-copy { position: relative; z-index: 3; margin-top: var(--copy-gap); max-width: 560px; }
        .ms-hero-name {
          font-size: clamp(44px, 13.5vw, 64px);
          color: rgb(var(--ink));
        }
        .ms-hero-lead { font-size: 16px; margin-top: 14px; max-width: 36ch; }
        .ms-ctas { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }

        :root[data-theme='light'] .ms-intro-media {
          filter: drop-shadow(0 14px 20px rgb(var(--ink) / 0.16)) drop-shadow(-2px -2px 10px rgb(var(--accent) / 0.16));
        }
        :root[data-theme='light'] .ms-sunrise {
          background: radial-gradient(42% 46% at 50% 100%, rgb(var(--accent) / 0.2), rgb(var(--accent) / 0.06) 50%, transparent 74%);
        }
        :root[data-theme='light'] .ms-planet-orb {
          background: linear-gradient(180deg, rgb(var(--surface)) 0px, rgb(var(--surface-2)) 80px, rgb(var(--space-1)) 260px);
          box-shadow:
            inset 0 1.5px 0 rgb(var(--accent) / 0.7),
            inset 0 16px 26px -16px rgb(var(--accent) / 0.32),
            0 -1px 10px rgb(var(--accent) / 0.22),
            0 -22px 70px -8px rgb(var(--accent) / 0.12);
        }
        :root[data-theme='light'] .ms-intro-ctl { background: rgb(var(--surface) / 0.86); }

        /* Daylight is the sea (SeaBackground + SeaIslands): the planets give
           way to islands, so the orbs and their masks step aside. Dark keeps
           every planet exactly as it is. */
        .ms-bg-space { display: contents; }
        :root[data-theme='light'] .ms-bg-space { visibility: hidden; }
        :root[data-theme='light'] .ms-planet-orb,
        :root[data-theme='light'] .ms-horizon-orb,
        :root[data-theme='light'] .ms-home-planet { display: none; }
        :root[data-theme='light'] .ms-planet,
        :root[data-theme='light'] .ms-horizon {
          -webkit-mask-image: none;
          mask-image: none;
        }
        :root[data-theme='light'] .ms-sunrise { opacity: 0.45; }

        /* Tablets and narrow windows: the portrait stands centred on a flatter
           planet and the copy sits below the rim's lowest point across its own
           width (a 4x-viewport planet drops < 48px over half the screen). */
        @media (min-width: 640px) and (min-height: 541px) {
          .ms-st--hero {
            --top: 72px;
            --scene-h: clamp(240px, calc(100svh - 500px), 640px);
            --apex: 50%;
            --orb: max(400vw, 1600px);
            --copy-gap: 72px;
          }
          .ms-st--hero .ms-inner { width: 100%; max-width: 880px; margin-inline: auto; }
          .ms-hero-scene { position: absolute; left: 0; right: 0; top: var(--top); margin: 0; }
          .ms-hero-copy { margin-top: calc(var(--scene-h) + var(--copy-gap)); max-width: 640px; }
          .ms-hero-name { font-size: clamp(64px, 9vw, 88px); }
          .ms-hero-lead { font-size: 18px; margin-top: 18px; max-width: 44ch; }
          .ms-ctas { margin-top: 28px; }
          .ms-sunrise { width: min(120%, 980px); }
        }

        /* >=1024px: two columns in a centred 1120px frame. The name sits left,
           centred in the sky above the horizon; the portrait stands on the
           planet on the right. The horizon is below the copy, so the rim can
           only ever pass under it. */
        @media (min-width: 1024px) and (min-height: 541px) {
          .ms-st--hero {
            --inner: min(1120px, calc(100vw - 112px));
            --scene-h: min(calc(82svh - var(--top)), 640px);
            --apex: calc(50% + 16px + var(--inner) * 0.26);
            --sink: 0.12;
            --orb: max(250vw, 2400px);
            justify-content: center;
            padding-bottom: calc(100svh - var(--horizon) + 48px);
          }
          .ms-st--hero .ms-inner { max-width: var(--inner); }
          .ms-hero-copy { margin-top: 0; max-width: calc(var(--inner) * 0.52); }
          .ms-hero-name { font-size: clamp(56px, 5.6vw, 88px); }
          /* Fade only below the photo's hidden lower edge (the planet's top is
             160px above the horizon), so the cut never shows through. */
          .ms-planet {
            -webkit-mask-image: linear-gradient(#000 calc(176px + var(--photo-h) * var(--sink)), transparent);
            mask-image: linear-gradient(#000 calc(176px + var(--photo-h) * var(--sink)), transparent);
          }
        }

        /* Landscape phones: copy sits in the sky on the left, the planet rises
           across the bottom and the photo stands on it to the right. */
        @media (orientation: landscape) and (max-height: 540px) {
          .ms-st--hero {
            --top: 56px;
            --scene-h: calc(100svh - var(--top) - 56px);
            --apex: 76%;
            --sink: 0.1;
            justify-content: center;
            padding-bottom: 72px;
          }
          .ms-hero-scene { position: absolute; left: 0; right: 0; top: var(--top); margin: 0; }
          /* Only ~56px of planet below the horizon: a short fade keeps the
             body opaque over the photo's cut-off edge. */
          .ms-planet {
            -webkit-mask-image: linear-gradient(#000 calc(100% - 20px), transparent);
            mask-image: linear-gradient(#000 calc(100% - 20px), transparent);
          }
          .ms-hero-copy { margin-top: 0; max-width: min(52%, 420px); }
          .ms-hero-name { font-size: 44px; }
          .ms-hero-lead { margin-top: 10px; font-size: 15px; }
          .ms-ctas { margin-top: 16px; }
        }

        /* ── 1 · about ───────────────────────────────────────────────────── */
        .ms-facts { margin-top: 36px; border-top: 1px solid rgb(var(--line)); }
        .ms-fact {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 4px 16px;
          padding: 14px 0;
          border-bottom: 1px solid rgb(var(--line));
        }
        .ms-fact dt { font-size: 14px; color: rgb(var(--ink-3)); }
        .ms-fact dd { margin-left: auto; color: rgb(var(--ink)); text-align: right; }
        @media (min-width: 640px) {
          .ms-fact { padding: 18px 0; }
          .ms-fact dt { font-size: 15px; }
        }

        /* The station's one visual: a cool planet rising in the lower right,
           lit from the upper left (DESIGN.md §7). It sits in flow under the
           copy, so the copy centres in the space above it and never overlaps. */
        .ms-st--about { overflow: hidden; overflow: clip; }
        .ms-st--about > .ms-inner { margin-block: auto; }
        .ms-horizon {
          position: relative;
          flex: none;
          height: clamp(110px, 24svh, 300px);
          margin: 24px calc(-1 * var(--pad-r)) calc(-1 * var(--pad-b)) calc(-1 * var(--pad-l));
          overflow: hidden;
          pointer-events: none;
          -webkit-mask-image: linear-gradient(#000 40%, transparent);
          mask-image: linear-gradient(#000 40%, transparent);
        }
        .ms-horizon-orb {
          position: absolute;
          top: 26%;
          left: 72%;
          width: max(150vw, 560px);
          aspect-ratio: 1;
          border-radius: 50%;
          transform: translateX(-50%);
          background: radial-gradient(120% 120% at 24% 4%, rgb(var(--surface-2)) 0%, rgb(var(--space-1)) 20%, rgb(var(--space-0)) 44%);
          box-shadow:
            inset 2px 2px 0 -0.5px rgb(var(--ink) / 0.32),
            inset 22px 18px 34px -22px rgb(var(--ink) / 0.16),
            0 -16px 60px -16px rgb(var(--nebula-a) / 0.75);
        }
        :root[data-theme='light'] .ms-horizon-orb {
          background: radial-gradient(120% 120% at 24% 4%, rgb(var(--surface)) 0%, rgb(var(--surface-2)) 24%, rgb(var(--space-1)) 50%);
          box-shadow:
            inset 2px 2px 0 -0.5px rgb(var(--surface)),
            inset -40px -10px 60px -30px rgb(var(--ink) / 0.1),
            0 -16px 60px -16px rgb(var(--nebula-a) / 0.95),
            0 0 0 1px rgb(var(--ink) / 0.06);
        }
        @media (min-width: 1024px) {
          .ms-horizon-orb { left: 76%; width: max(110vw, 1200px); top: 30%; }
        }

        /* ── 2 · skills ──────────────────────────────────────────────────── */
        .ms-skills { list-style: none; margin-top: 32px; border-top: 1px solid rgb(var(--line)); }
        .ms-skill-row { padding: 16px 0 17px; border-bottom: 1px solid rgb(var(--line)); }
        .ms-skill-cat { font-size: 20px; color: rgb(var(--ink)); }
        .ms-skill-list { margin-top: 6px; font-size: 16px; line-height: 1.55; }
        .ms-skill { white-space: nowrap; }
        .ms-sep { color: rgb(var(--ink-3)); }
        @media (min-width: 520px) {
          .ms-skill-row { display: grid; grid-template-columns: 170px 1fr; gap: 16px; align-items: baseline; }
          .ms-skill-list { margin-top: 0; }
        }
        @media (min-width: 640px) {
          .ms-skill-row { grid-template-columns: 200px 1fr; padding: 20px 0 21px; }
          .ms-skill-list { font-size: 17px; }
        }

        /* ── 3 · work: a featured shot, then the library ─────────────────── */
        .ms-work-count { margin-top: 14px; color: rgb(var(--ink-2)); }
        .ms-feat {
          position: relative;
          display: block;
          width: 100%;
          margin-top: 28px;
          padding: 0;
          border: 0;
          border-radius: 18px;
          background: none;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform var(--dur-1) var(--ease-out);
        }
        .ms-feat:focus-visible { outline-offset: 6px; border-radius: 20px; }
        .ms-feat:active { transform: scale(0.985); transition-duration: 80ms; }
        .ms-feat-media {
          position: relative;
          display: block;
          aspect-ratio: 16 / 10;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgb(var(--line));
          background: rgb(var(--surface-2));
          box-shadow: 0 28px 60px -34px rgb(var(--space-0) / 0.9);
        }
        :root[data-theme='light'] .ms-feat-media { box-shadow: 0 24px 48px -30px rgb(var(--ink) / 0.3); }
        .ms-feat-media img { transition: transform var(--dur-3) var(--ease-out); }
        .ms-feat-body { display: block; padding-top: 16px; }
        .ms-feat-meta { display: block; font-size: 13px; color: rgb(var(--ink-2)); }
        .ms-feat-title {
          display: block;
          margin-top: 6px;
          font-size: 24px;
          color: rgb(var(--ink));
          transition: color var(--dur-1) var(--ease-out);
        }
        .ms-feat-tag {
          display: block;
          margin-top: 8px;
          font-size: 15px;
          line-height: 1.55;
          color: rgb(var(--ink-2));
          text-wrap: pretty;
        }

        .ms-group { margin-top: 36px; }
        .ms-group-h {
          padding-bottom: 10px;
          border-bottom: 1px solid rgb(var(--line));
          font-size: 18px;
          color: rgb(var(--ink));
        }
        .ms-rows { list-style: none; display: grid; grid-template-columns: minmax(0, 1fr); }
        .ms-rows > li { min-width: 0; border-bottom: 1px solid rgb(var(--line)); }
        .ms-row {
          display: flex;
          align-items: center;
          gap: 14px;
          width: calc(100% + 16px);
          min-height: 72px;
          margin: 0 -8px;
          padding: 8px;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform var(--dur-1) var(--ease-out), background-color var(--dur-1) var(--ease-out);
        }
        .ms-row:focus-visible { outline-offset: -2px; border-radius: 12px; }
        .ms-row:active { transform: scale(0.97); background: rgb(var(--ink) / 0.06); transition-duration: 80ms; }
        .ms-row-thumb {
          position: relative;
          flex: none;
          width: 56px;
          height: 56px;
          overflow: hidden;
          border-radius: 10px;
          border: 1px solid rgb(var(--line));
          background: rgb(var(--surface-2));
        }
        .ms-row-text { min-width: 0; }
        .ms-row-title {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.25;
          color: rgb(var(--ink));
          transition: color var(--dur-1) var(--ease-out);
        }
        .ms-row-meta {
          display: block;
          margin-top: 3px;
          font-size: 13px;
          line-height: 1.3;
          color: rgb(var(--ink-2));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (hover: hover) and (pointer: fine) {
          .ms-feat:hover .ms-feat-title { color: rgb(var(--accent-text)); }
          .ms-feat:hover .ms-feat-media img { transform: scale(1.02); }
          .ms-row:hover { background: rgb(var(--ink) / 0.04); }
          .ms-row:hover .ms-row-title { color: rgb(var(--accent-text)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ms-feat-media img { transition: none; }
        }
        @media (min-width: 640px) {
          .ms-rows { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 32px; }
          .ms-feat-title { font-size: 28px; }
          .ms-feat-tag { font-size: 16px; max-width: 52ch; }
        }
        @media (min-width: 1200px) {
          .ms-rows { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }

        /* ── 5 · experience ──────────────────────────────────────────────── */
        /* On phones the list is indented so its spine (x >= 60) never runs as
           a second vertical beside the station rail. */
        .ms-tl { position: relative; list-style: none; margin: 32px 0 0 16px; }
        .ms-tl::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 8px;
          bottom: 30px;
          width: 1px;
          background: rgb(var(--line));
        }
        .ms-tl-item { position: relative; padding: 0 0 24px 28px; }
        .ms-tl-dot {
          position: absolute;
          left: 0;
          top: 4px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgb(var(--space-0));
          box-shadow: inset 0 0 0 1.5px rgb(var(--ink-3));
        }
        .ms-tl-item.is-current .ms-tl-dot {
          background: rgb(var(--accent));
          box-shadow: 0 0 0 4px rgb(var(--accent) / 0.18);
        }
        .ms-tl-date { display: block; color: rgb(var(--ink-3)); white-space: nowrap; }
        .ms-tl-role { margin-top: 6px; font-size: 19px; color: rgb(var(--ink)); text-wrap: pretty; }
        .ms-tl-co { margin-top: 3px; font-size: 15px; color: rgb(var(--ink-2)); }
        @media (min-width: 640px) {
          .ms-tl { margin-left: 0; }
        }

        .ms-quote { margin-top: 20px; padding-top: 28px; border-top: 1px solid rgb(var(--line)); }
        .ms-quote-stack { display: grid; }
        .ms-quote-item {
          grid-area: 1 / 1;
          opacity: 0;
          visibility: hidden;
          transition: opacity var(--dur-2) var(--ease-out), visibility 0s linear var(--dur-2);
        }
        .ms-quote-item.is-active { opacity: 1; visibility: visible; transition: opacity var(--dur-2) var(--ease-out); }
        .ms-quote-text {
          font-family: var(--font-display), system-ui, sans-serif;
          font-size: 19px;
          font-weight: 500;
          line-height: 1.5;
          letter-spacing: -0.005em;
          color: rgb(var(--ink));
          text-wrap: pretty;
        }
        .ms-quote-by { margin-top: 16px; display: flex; flex-direction: column; gap: 2px; }
        .ms-quote-name { font-size: 15px; font-weight: 600; color: rgb(var(--ink)); }
        .ms-quote-role { font-size: 13px; color: rgb(var(--ink-3)); }
        .ms-quote-nav { display: flex; align-items: center; gap: 12px; margin-top: 20px; }
        .ms-quote-nav .t-data { color: rgb(var(--ink-2)); min-width: 3.5em; text-align: center; }
        @media (min-width: 640px) {
          .ms-quote-text { max-width: 54ch; }
        }
        @media (min-width: 1024px) {
          .ms-quote-text { font-size: 22px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ms-quote-item, .ms-quote-item.is-active { transition: none; }
        }

        /* ── 6 · contact ─────────────────────────────────────────────────── */
        .ms-st--contact { overflow: hidden; overflow: clip; padding-bottom: 104px; }
        .ms-email {
          display: inline-block;
          margin-top: 28px;
          max-width: 100%;
          font-family: var(--font-display), system-ui, sans-serif;
          font-variation-settings: 'wdth' 100;
          font-size: clamp(22px, 7.2vw, 32px);
          font-weight: 650;
          letter-spacing: -0.02em;
          line-height: 1.15;
          color: rgb(var(--ink));
          overflow-wrap: anywhere;
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 7px;
          text-decoration-color: rgb(var(--ink) / 0.3);
          transition: color var(--dur-1) var(--ease-out), text-decoration-color var(--dur-1) var(--ease-out);
        }
        .ms-email:active { color: rgb(var(--accent-text)); text-decoration-color: currentColor; }
        @media (hover: hover) and (pointer: fine) {
          .ms-email:hover { color: rgb(var(--accent-text)); text-decoration-color: currentColor; }
        }
        @media (min-width: 1024px) {
          .ms-email { font-size: clamp(32px, 3vw, 42px); }
        }
        /* Pending state while the drawer chunk is still downloading. */
        .ms-spin {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid currentColor;
          border-right-color: transparent;
          animation: ms-spin 700ms linear infinite;
        }
        @keyframes ms-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .ms-spin { animation: none; border-right-color: currentColor; opacity: 0.6; }
        }
        .ms-links { list-style: none; margin-top: 30px; border-top: 1px solid rgb(var(--line)); }
        .ms-link {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 58px;
          border-bottom: 1px solid rgb(var(--line));
          color: rgb(var(--ink));
          transition: transform var(--dur-1) var(--ease-out);
        }
        .ms-link:active { transform: scale(0.97); transition-duration: 80ms; }
        .ms-link svg { width: 17px; height: 17px; flex: none; color: rgb(var(--ink-2)); transition: color var(--dur-1) var(--ease-out); }
        .ms-link-label { font-size: 16px; font-weight: 600; }
        .ms-link-value { margin-left: auto; font-size: 14px; color: rgb(var(--ink-3)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        .ms-link-arrow { color: rgb(var(--ink-3)); transition: transform var(--dur-2) var(--ease-out), color var(--dur-1) var(--ease-out); }
        .ms-link:focus-visible .ms-link-arrow { color: rgb(var(--accent-text)); transform: translate(2px, -2px); }
        @media (hover: hover) and (pointer: fine) {
          .ms-link:hover .ms-link-arrow { color: rgb(var(--accent-text)); transform: translate(2px, -2px); }
          .ms-link:hover svg { color: rgb(var(--ink)); }
        }
        .ms-footer {
          position: relative;
          z-index: 1;
          margin-top: 56px;
          font-size: 13px;
          color: rgb(var(--ink-3));
        }
        .ms-home-planet {
          position: absolute;
          left: 50%;
          top: calc(100% - 64px);
          width: max(240vw, 860px);
          aspect-ratio: 1;
          border-radius: 50%;
          transform: translateX(-50%);
          pointer-events: none;
          background: linear-gradient(180deg, rgb(var(--surface)) 0px, rgb(var(--space-0)) 90px);
          box-shadow:
            inset 0 1px 0 rgb(var(--ink) / 0.2),
            0 -14px 60px -12px rgb(var(--nebula-a) / 0.75);
        }
        :root[data-theme='light'] .ms-home-planet {
          background: linear-gradient(180deg, rgb(var(--surface)) 0px, rgb(var(--surface-2)) 90px);
          box-shadow: inset 0 1px 0 rgb(var(--ink) / 0.14), 0 -14px 60px -12px rgb(var(--nebula-a) / 0.9);
        }
        @media (min-width: 1024px) {
          .ms-home-planet { width: max(160vw, 1800px); }
        }

        /* ── project sheet (dialog) ──────────────────────────────────────── */
        /* CSS transitions (not keyframes), so every change of direction - a
           tap on the scrim mid-entrance, a drag, a snap back - starts from
           where the panel is. The drag writes the transform inline. */
        .ms-sheet {
          position: fixed;
          inset: 0;
          z-index: var(--z-sheet);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
        }
        .ms-sheet-scrim {
          position: absolute;
          inset: 0;
          background: rgb(var(--space-0) / 0.66);
          opacity: 0;
          transition: opacity 360ms var(--ease-out);
          -webkit-tap-highlight-color: transparent;
        }
        .ms-sheet[data-state='open'] .ms-sheet-scrim { opacity: 1; }
        .ms-sheet[data-state='closing'] .ms-sheet-scrim { opacity: 0; transition-duration: var(--dur-2); }
        :root[data-theme='light'] .ms-sheet-scrim { background: rgb(var(--ink) / 0.32); }
        .ms-sheet-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 640px;
          max-height: 88svh;
          border-radius: 18px 18px 0 0;
          border: 1px solid rgb(var(--line));
          border-bottom: 0;
          background: rgb(var(--surface));
          box-shadow: 0 -24px 60px -20px rgb(var(--space-0) / 0.8);
          transform: translate3d(0, 100%, 0);
          transition: transform 500ms cubic-bezier(0.32, 0.72, 0, 1);
          will-change: transform;
        }
        /* Surface under the panel, seen only when it is pulled upward. */
        .ms-sheet-panel::after {
          content: '';
          position: absolute;
          left: -1px;
          right: -1px;
          top: 100%;
          height: 120px;
          background: rgb(var(--surface));
          border-inline: 1px solid rgb(var(--line));
        }
        .ms-sheet[data-state='open'] .ms-sheet-panel { transform: translate3d(0, 0, 0); }
        .ms-sheet[data-state='closing'] .ms-sheet-panel {
          transform: translate3d(0, 100%, 0);
          transition: transform var(--dur-2) var(--ease-out);
        }
        :root[data-theme='light'] .ms-sheet-panel { box-shadow: 0 -24px 60px -24px rgb(var(--ink) / 0.3); }
        .ms-sheet-panel:focus { outline: none; }
        @media (prefers-reduced-motion: reduce) {
          .ms-sheet-panel,
          .ms-sheet[data-state='open'] .ms-sheet-panel,
          .ms-sheet[data-state='closing'] .ms-sheet-panel {
            transform: none;
            opacity: 0;
            transition: opacity 200ms linear;
          }
          .ms-sheet[data-state='open'] .ms-sheet-panel { opacity: 1; }
        }
        /* Drag handle: the grip and the whole header. */
        .ms-sheet-head {
          flex: none;
          padding: 10px 20px 14px;
          touch-action: none;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
        }
        .ms-sheet-head[data-dragging] { cursor: grabbing; }
        .ms-sheet-grip {
          width: 36px;
          height: 4px;
          margin: 0 auto 12px;
          border-radius: 2px;
          background: rgb(var(--ink) / 0.22);
        }
        .ms-sheet-body {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 0 20px calc(28px + env(safe-area-inset-bottom));
        }
        .ms-sheet-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .ms-sheet-meta { padding-top: 12px; font-size: 14px; color: rgb(var(--ink-3)); }
        .ms-sheet-meta .t-data { font-size: 13px; }
        .ms-sheet-title { margin-top: 6px; font-size: 26px; color: rgb(var(--ink)); }
        .ms-sheet-cover {
          position: relative;
          margin-top: 4px;
          aspect-ratio: 16 / 9;
          border-radius: 12px;
          overflow: hidden;
          background: rgb(var(--surface-2));
          border: 1px solid rgb(var(--line));
        }
        .ms-sheet-tagline { margin-top: 18px; font-size: 17px; color: rgb(var(--ink)); line-height: 1.5; }
        .ms-sheet-desc { margin-top: 12px; font-size: 15px; line-height: 1.65; color: rgb(var(--ink-2)); }
        .ms-sheet-h { margin-top: 24px; font-size: 15px; font-weight: 600; color: rgb(var(--ink)); }
        .ms-sheet-list { list-style: none; margin-top: 6px; border-top: 1px solid rgb(var(--line)); }
        .ms-sheet-list li { padding: 11px 0; border-bottom: 1px solid rgb(var(--line)); font-size: 15px; line-height: 1.55; color: rgb(var(--ink-2)); }
        .ms-sheet-tech { margin-top: 18px; font-size: 14px; line-height: 1.6; color: rgb(var(--ink-3)); }
        .ms-sheet-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
      `}</style>
    </>
  )
}

// ── shell ───────────────────────────────────────────────────────────────────
function Station({ i, setRef, className, after, children }: {
  i: number
  setRef: (el: HTMLElement | null) => void
  className?: string
  /** Full-bleed decoration rendered after the content frame (planets). */
  after?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      ref={setRef}
      id={STATION_IDS[i]}
      data-station={i}
      aria-labelledby={`${STATION_IDS[i]}-title`}
      tabIndex={-1}
      className={`ms-st${className ? ` ${className}` : ''}`}
    >
      <div className="ms-inner">{children}</div>
      {after}
    </section>
  )
}

/** Station titles float as zero-gravity HUD text (components/type/HoloText),
    with their own lock-on entrance instead of the old rise-out-of-a-mask. */
function StationTitle({ i, children }: { i: number; children: string }) {
  return <HoloText id={`${STATION_IDS[i]}-title`} text={children} className="t-title ms-title" baseWdth={85} />
}

function TopBar({ onHome }: { onHome: () => void }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <header className="ms-topbar" data-ms-inert>
      <button type="button" className="ms-wordmark" onClick={onHome}>Shah Fahad</button>
      <button
        type="button"
        className="btn btn--ghost ms-icon"
        onClick={(e) => toggle(e)}
        aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        <FaCircleHalfStroke aria-hidden />
      </button>
    </header>
  )
}

// ── 0 · intro ───────────────────────────────────────────────────────────────
function Hero({ onWork }: { onWork: () => void }) {
  return (
    <>
      <div className="ms-hero-scene">
        <div className="ms-sunrise" aria-hidden="true" />
        <HeroIsleBack />
        <IntroCard />
      </div>
      <div className="ms-planet" aria-hidden="true">
        <div className="ms-planet-orb" />
        <HeroIsleFront />
      </div>

      <div className="ms-hero-copy">
        <div className="ms-title-mask" data-mask>
          <HoloText as="h1" id="intro-title" text="Shah Fahad" className="t-display ms-hero-name" />
        </div>
        <p className="t-lead ms-hero-lead" data-reveal style={iv(2)}>
          Senior software engineer building real-time web and mobile products. React, Next.js, Flutter and WebRTC,
          from Karachi, Pakistan.
        </p>
        <div className="ms-ctas" data-reveal style={iv(3)}>
          <button type="button" className="btn btn--primary" onClick={onWork}>
            See the work <span className="btn-arrow" aria-hidden="true">→</span>
          </button>
          <a className="btn btn--ghost" href={RESUME} target="_blank" rel="noopener noreferrer">
            Resume
          </a>
        </div>
      </div>
    </>
  )
}

// The sticker photo standing on the horizon. Tap (or Enter / Space) flips it
// to the intro video; the pill becomes a mute toggle while it plays. The video
// fetches nothing (no poster, no preload) until the card is flipped, so it
// never competes with the sticker for LCP.
function IntroCard() {
  const [flipped, setFlipped] = useState(false)
  const [muted, setMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Mute is kept in sync on its own, so toggling it never restarts playback.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (flipped) {
      v.play().catch(() => {
        // Sound was refused (autoplay policy): play muted and say so.
        v.muted = true
        setMuted(true)
        v.play().catch(() => {})
      })
    } else if (!v.paused || v.currentTime > 0) {
      v.pause()
      v.currentTime = 0
    }
  }, [flipped])

  return (
    // Flip state lives in a data attribute so the element's class never
    // changes while it plays.
    <div className="ms-intro" data-flipped={flipped} data-reveal="rise">
      <button
        type="button"
        className="ms-intro-card"
        aria-pressed={flipped}
        aria-label="Play the intro video"
        onClick={() => setFlipped((f) => !f)}
      >
        <span className="ms-intro-inner">
          <span className="ms-intro-face ms-intro-front">
            <Image
              src="/images/shah-fahad-sticker.png"
              alt="Shah Fahad"
              fill
              priority
              sizes="(min-width: 1024px) 540px, (min-width: 640px) 500px, 320px"
              className="ms-intro-media"
              style={{ objectFit: 'contain', objectPosition: 'bottom' }}
            />
          </span>
          <span className="ms-intro-face ms-intro-back">
            <video
              ref={videoRef}
              className="ms-intro-video ms-intro-media"
              poster={flipped ? INTRO_POSTER : undefined}
              playsInline
              preload={flipped ? 'auto' : 'none'}
              onEnded={() => setFlipped(false)}
              aria-hidden="true"
              tabIndex={-1}
            >
              <source src="/videos/shah-intro.webm" type="video/webm" />
              <source src="/videos/shah-intro.mov" type='video/mp4; codecs="hvc1"' />
              <source src="/videos/shah-intro.mp4" type="video/mp4" />
            </video>
          </span>
        </span>
        {!flipped && (
          <span className="ms-intro-ctl" aria-hidden="true">
            <FaPlay /> Play intro
          </span>
        )}
      </button>
      {flipped && (
        <button
          type="button"
          className="ms-intro-ctl ms-intro-ctl--sound"
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? <FaVolumeXmark aria-hidden /> : <FaVolumeHigh aria-hidden />}
          {muted ? 'Unmute' : 'Mute'}
        </button>
      )}
    </div>
  )
}

// ── 1 · about ───────────────────────────────────────────────────────────────
function About() {
  return (
    <div className="ms-split">
      <div className="ms-col-a">
        <StationTitle i={1}>I ship products people use.</StationTitle>
        <p className="t-lead ms-lead" data-reveal style={iv(1)}>
          8+ years turning ideas into shipped software, from Miletap&apos;s real-time video platform to
          DigitalHire&apos;s hiring system.
        </p>
      </div>
      <div className="ms-col-b">
        <dl className="ms-facts" data-reveal="group">
          <div className="ms-fact ms-si" style={iv(0)}>
            <dt>Experience</dt>
            <dd className="t-data"><span className="ms-em">8+</span> years</dd>
          </div>
          <div className="ms-fact ms-si" style={iv(1)}>
            <dt>Teams</dt>
            <dd className="t-data">DigitalHire · Kistpay · Miletap</dd>
          </div>
          <div className="ms-fact ms-si" style={iv(2)}>
            <dt>Based in</dt>
            <dd className="t-data">Karachi, PK</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

// ── 2 · skills ──────────────────────────────────────────────────────────────
function Skills() {
  return (
    <div className="ms-split">
      <div className="ms-col-a">
        <StationTitle i={2}>Eight years of craft.</StationTitle>
        <p className="t-lead ms-lead" data-reveal style={iv(1)}>
          React and Next.js on the web, Flutter on mobile, WebRTC and SignalR when it has to be live.
        </p>
      </div>
      <div className="ms-col-b">
        <ul className="ms-skills" data-reveal="group">
          {skills.map((cat, i) => (
            <li key={cat.label} className="ms-skill-row ms-si" style={iv(i)}>
              <h3 className="t-subtitle ms-skill-cat">{sentenceCase(cat.label)}</h3>
              <p className="t-lead ms-skill-list">
                {cat.skills.map((s, j) => (
                  <Fragment key={s}>
                    {j > 0 && <span className="ms-sep" aria-hidden="true"> · </span>}
                    <span className="ms-skill">{s}</span>
                  </Fragment>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── 3 · work ────────────────────────────────────────────────────────────────
// The featured product leads as a full-width shot (same asset as the desktop
// showcase), then the library: 56px thumbnails, title, category and year.
// Every row opens the project sheet.
function Work({ onOpen }: { onOpen: (p: Project) => void }) {
  return (
    <>
      <StationTitle i={3}>Selected work.</StationTitle>
      <p className="t-lead ms-lead" data-reveal style={iv(1)}>
        Shipped products and engineering demos.
      </p>
      {/* the same star map as the desktop Work station; a star opens the
          telescope, and "Explore case study" opens this page's project sheet */}
      <div className="ms-starmap" data-reveal style={iv(2)}>
        <StarMap onExplore={onOpen} />
      </div>
    </>
  )
}

// ── 4 · open source ─────────────────────────────────────────────────────────
function OpenSource() {
  const merged = openSourceStats().merged
  return (
    <div className="ms-split">
      <div className="ms-col-a">
        <StationTitle i={4}>Merged upstream.</StationTitle>
        <p className="t-lead ms-lead" data-reveal style={iv(1)}>
          <span className="ms-em">{merged}</span> pull requests merged into Flutter and the Supabase Flutter SDK.
        </p>
      </div>
      <div className="ms-col-b">
        <div data-reveal style={iv(2)}>
          <FeaturedAchievement />
        </div>
      </div>
    </div>
  )
}

// ── 5 · experience ──────────────────────────────────────────────────────────
function Experience() {
  const [ti, setTi] = useState(0)
  const n = testimonials.length
  return (
    <div className="ms-split">
      <div className="ms-col-a">
        <StationTitle i={5}>Where I&apos;ve worked.</StationTitle>
        <p className="t-lead ms-lead" data-reveal style={iv(1)}>
          DigitalHire, Kistpay and Miletap, plus part-time work for <span className="ms-nw">E-Ocean</span> and
          Entertech: frontend, real-time and mobile.
        </p>

        <ol className="ms-tl" data-reveal="group">
          {experience.map((e, i) => (
            <li key={e.id} className={`ms-tl-item ms-si${e.current ? ' is-current' : ''}`} style={iv(i)}>
              <span className="ms-tl-dot" aria-hidden="true" />
              <span className="t-data ms-tl-date">{e.period}</span>
              <h3 className="t-subtitle ms-tl-role">{e.role}</h3>
              <p className="ms-tl-co">
                {e.company}
                {e.current && <span className="sr-only">, current role</span>}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="ms-col-b">
        <figure className="ms-quote" data-reveal aria-label="Recommendations from LinkedIn">
          <div className="ms-quote-stack" aria-live="polite">
            {testimonials.map((t, i) => (
              <div key={t.name} className={`ms-quote-item${i === ti ? ' is-active' : ''}`} aria-hidden={i !== ti}>
                <blockquote>
                  <p className="ms-quote-text">&ldquo;{t.short}&rdquo;</p>
                </blockquote>
                <figcaption className="ms-quote-by">
                  <span className="ms-quote-name">{t.name}</span>
                  <span className="ms-quote-role">{t.role}</span>
                </figcaption>
              </div>
            ))}
          </div>
          <div className="ms-quote-nav">
            <button
              type="button"
              className="btn btn--ghost ms-icon"
              aria-label="Previous recommendation"
              onClick={() => setTi((v) => (v - 1 + n) % n)}
            >
              <FaChevronLeft aria-hidden />
            </button>
            <span className="t-data" aria-hidden="true">{ti + 1} / {n}</span>
            <button
              type="button"
              className="btn btn--ghost ms-icon"
              aria-label="Next recommendation"
              onClick={() => setTi((v) => (v + 1) % n)}
            >
              <FaChevronRight aria-hidden />
            </button>
          </div>
        </figure>
      </div>
    </div>
  )
}

// ── 6 · contact ─────────────────────────────────────────────────────────────
function Contact() {
  const links = [
    { label: 'GitHub', value: 'github.com/fahaddoc', href: 'https://github.com/fahaddoc', Icon: FaGithub },
    { label: 'LinkedIn', value: 'in/fahaddoc600', href: 'https://www.linkedin.com/in/fahaddoc600', Icon: FaLinkedinIn },
  ]
  return (
    <>
      <div className="ms-split">
        <div className="ms-col-a">
          <StationTitle i={6}>Let&apos;s build something.</StationTitle>
          <p className="t-lead ms-lead" data-reveal style={iv(1)}>
            Open to senior frontend and real-time roles, full-time or contract.
          </p>
          <a className="ms-email" href={`mailto:${EMAIL}`} data-reveal style={iv(2)}>{EMAIL}</a>
          <div className="ms-ctas" data-reveal style={iv(3)}>
            <WriteToMe />
            <a className="btn btn--ghost" href={CAL} target="_blank" rel="noopener noreferrer">
              Book a 15-min call
            </a>
          </div>
        </div>
        <div className="ms-col-b">
          <ul className="ms-links" data-reveal="group">
            {links.map(({ label, value, href, Icon }, i) => (
              <li key={label} className="ms-si" style={iv(i)}>
                <a className="ms-link" href={href} target="_blank" rel="noopener noreferrer">
                  <Icon aria-hidden />
                  <span className="ms-link-label">{label}</span>
                  <span className="ms-link-value">{value}</span>
                  <span className="ms-link-arrow" aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <footer className="ms-footer">© 2026 Shah Fahad</footer>
    </>
  )
}

// Opens the shared contact drawer. The chunk is warmed on press (and when the
// Contact station comes into view); if it is still downloading 120ms after the
// tap, the button says so instead of looking dead.
function WriteToMe() {
  const [busy, setBusy] = useState(false)
  const open = () => {
    let ready = false
    const t = window.setTimeout(() => { if (!ready) setBusy(true) }, 120)
    prefetchDrawer().then(() => {
      ready = true
      window.clearTimeout(t)
      setBusy(false)
    })
    window.dispatchEvent(new Event('contact-drawer-open'))
  }
  const warm = () => { prefetchDrawer() }
  return (
    <button
      type="button"
      className="btn btn--primary"
      aria-busy={busy || undefined}
      onPointerDown={warm}
      onTouchStart={warm}
      onFocus={warm}
      onClick={open}
    >
      Write to me
      {busy && <span className="ms-spin" aria-hidden="true" />}
    </button>
  )
}

// ── project sheet: a real modal dialog ──────────────────────────────────────
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
const SHEET_OUT_MS = 280
const DISMISS_SHARE = 0.25 // of the panel height
const DISMISS_VELOCITY = 0.3 // px/ms, downward

type SheetState = 'enter' | 'open' | 'closing'
type Drag = {
  id: number
  startY: number
  base: number // panel offset when the press began (mid-transition presses included)
  y: number
  h: number
  lastY: number
  lastT: number
  v: number
  active: boolean
}

/** Current translateY of an element, read from its computed transform. */
function currentY(el: HTMLElement) {
  const t = getComputedStyle(el).transform
  if (!t || t === 'none') return 0
  try {
    return new DOMMatrixReadOnly(t).m42
  } catch {
    return 0
  }
}

function ProjectSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const drag = useRef<Drag | null>(null)
  const closingRef = useRef(false)
  const [state, setState] = useState<SheetState>('enter')
  const [dragging, setDragging] = useState(false)

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    // Set on the DOM first, so the transition targets the closed state in the
    // same frame any inline drag styles are cleared.
    if (rootRef.current) rootRef.current.dataset.state = 'closing'
    setState('closing')
  }, [])

  // Enter: commit the off-screen state, flush it, then open, so the CSS
  // transition runs from translateY(100%).
  useLayoutEffect(() => {
    panelRef.current?.getBoundingClientRect()
    setState((s) => (s === 'enter' ? 'open' : s))
  }, [])

  // Exit: unmount once the slide-down (or fade) has finished.
  useEffect(() => {
    if (state !== 'closing') return
    const panel = panelRef.current
    const onEnd = (e: TransitionEvent) => {
      if (e.target === panel) onClose()
    }
    panel?.addEventListener('transitionend', onEnd)
    const t = window.setTimeout(onClose, (prefersReducedMotion() ? 200 : SHEET_OUT_MS) + 120)
    return () => {
      panel?.removeEventListener('transitionend', onEnd)
      window.clearTimeout(t)
    }
  }, [state, onClose])

  // Modal: background inert + scroll-locked, focus in, focus back on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const bg = Array.from(document.querySelectorAll<HTMLElement>('[data-ms-inert]'))
    const scroller = document.querySelector<HTMLElement>('.mob-scroll')
    bg.forEach((el) => { el.inert = true })
    scroller?.classList.add('is-locked')
    closeRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      bg.forEach((el) => { el.inert = false })
      scroller?.classList.remove('is-locked')
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [requestClose])

  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  // ── drag to dismiss (grip + header) ──
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (closingRef.current || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
    // Buttons and links in the header keep their own click.
    if (e.target instanceof Element && e.target.closest('button, a')) return
    const panel = panelRef.current
    if (!panel) return
    drag.current = {
      id: e.pointerId,
      startY: e.clientY,
      base: currentY(panel),
      y: 0,
      h: panel.offsetHeight,
      lastY: e.clientY,
      lastT: e.timeStamp,
      v: 0,
      active: false,
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const panel = panelRef.current
    const scrim = scrimRef.current
    if (!d || e.pointerId !== d.id || !panel || !scrim) return
    const raw = e.clientY - d.startY
    if (!d.active) {
      if (Math.abs(raw) < 4) return
      d.active = true
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Pointer already gone (or synthetic): the drag still works uncaptured.
      }
      panel.style.transition = 'none'
      scrim.style.transition = 'none'
      setDragging(true)
    }
    let y = d.base + raw
    // Upward: damped rubber band that tops out around 48px.
    if (y < 0) y = -48 * (1 - 1 / (1 + -y / 160))
    panel.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
    scrim.style.opacity = String(Math.max(0, Math.min(1, 1 - y / d.h)))
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.v = 0.7 * ((e.clientY - d.lastY) / dt) + 0.3 * d.v
    d.lastY = e.clientY
    d.lastT = e.timeStamp
    d.y = y
  }

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    if (!d.active) return
    const panel = panelRef.current
    const scrim = scrimRef.current
    setDragging(false)
    if (!panel || !scrim) return
    // A finger that stopped before lifting has no flick left in it.
    const v = e.timeStamp - d.lastT > 90 ? 0 : d.v
    const dismiss = !cancelled && (d.y > d.h * DISMISS_SHARE || v > DISMISS_VELOCITY)
    panel.style.transition = ''
    scrim.style.transition = ''
    scrim.style.opacity = ''
    if (dismiss) {
      // Reduced motion fades out where it was dropped; otherwise the panel
      // carries on down from its current offset.
      if (!prefersReducedMotion()) panel.style.transform = ''
      requestClose()
    } else {
      // Snap back: the open-state transition runs from the current offset.
      panel.style.transform = ''
    }
  }

  const titleId = `sheet-title-${project.id}`
  return (
    <div ref={rootRef} className="ms-sheet" data-state={state}>
      <div ref={scrimRef} className="ms-sheet-scrim" aria-hidden="true" onClick={requestClose} />
      <div
        ref={panelRef}
        className="ms-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapTab}
      >
        <div
          className="ms-sheet-head"
          data-dragging={dragging ? '' : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e, false)}
          onPointerCancel={(e) => endDrag(e, true)}
        >
          <div className="ms-sheet-grip" aria-hidden="true" />
          <div className="ms-sheet-top">
            <div>
              <p className="ms-sheet-meta">
                {project.company} · <span className="t-data">{project.year}</span>
              </p>
              <h2 id={titleId} className="t-subtitle ms-sheet-title">{project.title}</h2>
            </div>
            <button ref={closeRef} type="button" className="btn btn--ghost ms-icon" aria-label="Close" onClick={requestClose}>
              <FaXmark aria-hidden />
            </button>
          </div>
        </div>

        <div className="ms-sheet-body">
          <div className="ms-sheet-cover">
            <Image
              src={project.image}
              alt={`${shortTitle(project)} screenshot`}
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              style={{ objectFit: 'cover', objectPosition: coverPosition(project) }}
            />
          </div>

          <p className="ms-sheet-tagline">{project.tagline}</p>
          <p className="ms-sheet-desc">{project.description}</p>

          <h3 className="ms-sheet-h">Highlights</h3>
          <ul className="ms-sheet-list">
            {project.features.slice(0, 4).map((f) => <li key={f}>{f}</li>)}
          </ul>
          <p className="ms-sheet-tech">{project.tech.join(' · ')}</p>

          <div className="ms-sheet-actions">
            <Link className="btn btn--primary" href={`/projects/${projectSlug(project)}`}>
              Read case study <span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
            {project.liveUrl && (
              <a className="btn btn--ghost" href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                Live site <span className="btn-arrow" aria-hidden="true">↗</span>
              </a>
            )}
            {project.githubUrl && (
              <a className="btn btn--ghost" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <FaGithub aria-hidden /> GitHub
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

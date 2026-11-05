'use client'

// MobileSpace — the classic experience: touch devices, screens under 1024px
// and reduced-motion desktops (AppShell decides). Same journey and the same
// copy as the desktop tunnel (DESIGN.md §8), told as seven scenes in one
// scroller over the CSS starfield.
//
// Performance contract (DESIGN.md §9): no framer / GSAP / R3F / Lenis here.
// - One passive rAF-throttled scroll listener writes ONE CSS var on the
//   starfield root (StarfieldBackground owns it, fed by `scrollRef`).
// - One IntersectionObserver tracks the station under the centre line for the
//   rail; one one-shot observer plays reveals once and then lets go.
// - Reveals only hide content after JS sets `data-ms-ready`; reduced motion
//   never sets it, so content is visible by default.

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
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
import { FeaturedAchievement } from '@/components/featured/FeaturedAchievement'
import { projects, experience, skills } from '@/data/projects'
import type { Project } from '@/data/projects'
import { engineeringDemos } from '@/data/engineering-demos'
import { testimonials } from '@/data/testimonials'
import { openSourceStats } from '@/data/open-source'

// ── content ──────────────────────────────────────────────────────────────────
const STATIONS = ['Intro', 'About', 'Skills', 'Work', 'Open source', 'Experience', 'Contact'] as const
const STATION_IDS = ['intro', 'about', 'skills', 'work', 'open-source', 'experience', 'contact'] as const
const EMAIL = 'hello@shahfahad.dev'
const RESUME = '/Shah_Fahad_Resume.pdf'
const CAL = 'https://cal.com/shahfahad'

const DEMO_IDS = new Set(engineeringDemos.map((p) => p.id))
const WORK_GROUPS: { label: string; items: Project[] }[] = [
  { label: 'Shipped products', items: projects.filter((p) => !DEMO_IDS.has(p.id)) },
  { label: 'Engineering demos', items: projects.filter((p) => DEMO_IDS.has(p.id)) },
]
// Star x positions (% of the chart width) — a meander in the right-hand band.
const STAR_X = [87, 95, 80, 91, 77, 85, 96, 81, 93, 78, 89, 83]
const ROW = 56 // px per star row: a 44px+ hit target for every project
const CATEGORY: Record<Project['category'], string> = { web: 'Web', mobile: 'Mobile', realtime: 'Real-time' }

const shortTitle = (p: Project) => p.title.split(' — ')[0]
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
    return () => {
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

  const goTo = useCallback((i: number, focus = false) => {
    const el = stationEls.current[i]
    if (!el) return
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    if (focus) el.focus({ preventScroll: true })
  }, [])

  const closeSheet = useCallback(() => setOpenProject(null), [])

  return (
    <>
      <StarfieldBackground scrollRef={scrollRef} />
      <TopBar onHome={() => goTo(0, true)} />
      <StationRail active={active} onGo={(i) => goTo(i, true)} />

      <div ref={scrollRef} className="mob-scroll" data-lenis-prevent data-ms-inert>
        <main>
          <Station i={0} setRef={setStationRef(0)} className="ms-st--hero">
            <Hero onWork={() => goTo(3, true)} />
          </Station>
          <Station i={1} setRef={setStationRef(1)}>
            <About />
          </Station>
          <Station i={2} setRef={setStationRef(2)}>
            <Skills />
          </Station>
          <Station i={3} setRef={setStationRef(3)}>
            <Work onOpen={setOpenProject} />
          </Station>
          <Station i={4} setRef={setStationRef(4)}>
            <OpenSource />
          </Station>
          <Station i={5} setRef={setStationRef(5)}>
            <Experience />
          </Station>
          <Station i={6} setRef={setStationRef(6)} className="ms-st--contact">
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
          position: relative;
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 92px max(20px, env(safe-area-inset-right)) 76px calc(44px + env(safe-area-inset-left));
          scroll-snap-align: start;
          color: rgb(var(--ink));
        }
        .ms-st:focus { outline: none; }
        .ms-inner { position: relative; width: 100%; max-width: 560px; }

        .ms-title-mask {
          overflow: hidden;
          padding-bottom: 0.12em;
          margin-bottom: -0.12em;
        }
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

        /* Square icon variant of the shared ghost button. */
        .btn.ms-icon {
          --btn-h: 44px;
          width: 44px;
          padding: 0;
          flex: none;
        }
        .btn.ms-icon svg { width: 15px; height: 15px; }

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
            --sky-top: color-mix(in srgb, rgb(var(--nebula-a)) 32%, rgb(var(--space-0)));
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
        }

        /* ── rail: a labelled progress spine ─────────────────────────────── */
        .ms-rail {
          --item-h: 44px;
          position: fixed;
          left: env(safe-area-inset-left);
          top: 50%;
          z-index: var(--z-chrome);
          width: 44px;
          transform: translateY(-50%);
        }
        .ms-rail ol { position: relative; list-style: none; margin: 0; padding: 0; }
        .ms-rail ol::before {
          content: '';
          position: absolute;
          left: 12px;
          top: calc(var(--item-h) / 2);
          bottom: calc(var(--item-h) / 2);
          width: 1px;
          background: rgb(var(--ink) / 0.16);
        }
        .ms-rail-btn {
          display: flex;
          align-items: center;
          width: 44px;
          height: var(--item-h);
          padding: 0 0 0 12px;
          border: 0;
          background: none;
          cursor: pointer;
        }
        .ms-rail-btn:focus-visible { outline-offset: -2px; }
        .ms-rail-tick {
          display: block;
          width: 7px;
          height: 1px;
          background: rgb(var(--ink-3));
          transform-origin: left center;
          transition: transform var(--dur-2) var(--ease-out), background-color var(--dur-2) var(--ease-out);
        }
        .ms-rail-btn:hover .ms-rail-tick { background: rgb(var(--ink)); }
        .ms-rail-btn[aria-current='step'] .ms-rail-tick {
          background: rgb(var(--accent));
          transform: scaleX(1.72) scaleY(2);
        }
        .ms-rail-label {
          position: absolute;
          left: 25px;
          top: 0;
          width: 16px;
          height: var(--item-h);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transform: translate3d(0, calc(var(--active, 0) * var(--item-h)), 0);
          transition: transform var(--dur-3) var(--ease-out);
        }
        .ms-rail-label span {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
          color: rgb(var(--ink));
          animation: ms-fade var(--dur-2) var(--ease-out) both;
        }
        @keyframes ms-fade { from { opacity: 0; } to { opacity: 1; } }
        @media (max-height: 520px) {
          .ms-rail { --item-h: 32px; top: calc(50% + 22px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ms-rail-label { transition: none; }
          .ms-rail-label span { animation: none; }
          .ms-rail-tick { transition: none; }
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
          justify-content: flex-start;
          padding-top: var(--top);
          overflow: hidden;
          overflow: clip;
        }
        .ms-hero-scene {
          position: relative;
          height: var(--scene-h);
          margin-left: calc(-44px - env(safe-area-inset-left));
          margin-right: calc(-1 * max(20px, env(safe-area-inset-right)));
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
          transition: transform 760ms var(--ease-out);
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
          transition: border-color var(--dur-1) var(--ease-out), background-color var(--dur-1) var(--ease-out);
        }
        .ms-intro-ctl::before { content: ''; position: absolute; inset: -5px -2px; }
        .ms-intro-ctl svg { width: 11px; height: 11px; flex: none; }
        .ms-intro-ctl--sound svg { width: 14px; height: 14px; }
        .ms-intro-card:hover .ms-intro-ctl,
        .ms-intro-ctl:hover { border-color: rgb(var(--ink) / 0.42); }
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
          width: max(250vw, 900px);
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
        .ms-hero-copy { position: relative; z-index: 3; margin-top: 22px; max-width: 560px; }
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

        /* ── 3 · work: the star chart ────────────────────────────────────── */
        .ms-chart-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-top: 32px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgb(var(--line));
        }
        .ms-chart-head h3 { font-size: 18px; color: rgb(var(--ink)); }
        .ms-chart-head .t-data { color: rgb(var(--ink-3)); }
        .ms-chart { position: relative; margin-top: 6px; }
        .ms-chart-path { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
        .ms-chart-path polyline {
          fill: none;
          stroke: rgb(var(--ink) / 0.22);
          stroke-width: 1;
          stroke-dasharray: 2 5;
          vector-effect: non-scaling-stroke;
        }
        .ms-node {
          position: absolute;
          left: 0;
          right: 0;
          height: ${ROW}px;
          display: block;
          padding: 0;
          border: 0;
          border-radius: 10px;
          background: none;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .ms-node:focus-visible { outline-offset: -2px; border-radius: 10px; }
        .ms-node-star {
          position: absolute;
          top: 50%;
          left: var(--x);
          width: 7px;
          height: 7px;
          margin: -3.5px 0 0 -3.5px;
          border-radius: 50%;
          background: rgb(var(--ink-2));
          transition: background-color var(--dur-1) var(--ease-out), transform var(--dur-2) var(--ease-out);
        }
        .ms-node--featured .ms-node-star {
          width: 11px;
          height: 11px;
          margin: -5.5px 0 0 -5.5px;
          background: rgb(var(--ink));
          box-shadow: 0 0 0 5px rgb(var(--space-0)), 0 0 0 6px rgb(var(--ink) / 0.3);
        }
        .ms-node--demo .ms-node-star {
          background: rgb(var(--space-0));
          box-shadow: inset 0 0 0 1.5px rgb(var(--ink-3));
        }
        .ms-node-text {
          position: absolute;
          left: 0;
          right: 30%;
          top: 50%;
          transform: translateY(-50%);
        }
        .ms-node-title {
          display: block;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.2;
          color: rgb(var(--ink));
          transition: color var(--dur-1) var(--ease-out);
        }
        .ms-node-meta {
          display: block;
          margin-top: 3px;
          font-size: 13px;
          line-height: 1.2;
          color: rgb(var(--ink-3));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ms-node:hover .ms-node-title,
        .ms-node:focus-visible .ms-node-title { color: rgb(var(--accent-text)); }
        .ms-node:hover .ms-node-star,
        .ms-node:focus-visible .ms-node-star { background: rgb(var(--accent)); transform: scale(1.25); }
        .ms-node:active .ms-node-star { transform: scale(0.9); }
        .ms-pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; }
        .ms-pager .t-data { color: rgb(var(--ink-2)); }
        .ms-pager .btn { gap: 8px; }
        .ms-pager .btn svg { width: 11px; height: 11px; }

        /* ── 5 · experience ──────────────────────────────────────────────── */
        .ms-tl { position: relative; list-style: none; margin-top: 32px; }
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
        @media (prefers-reduced-motion: reduce) {
          .ms-quote-item, .ms-quote-item.is-active { transition: none; }
        }

        /* ── 6 · contact ─────────────────────────────────────────────────── */
        .ms-st--contact { overflow: hidden; overflow: clip; padding-bottom: 104px; }
        .ms-st--contact .ms-inner { position: static; }
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
        .ms-email:hover,
        .ms-email:active { color: rgb(var(--accent-text)); text-decoration-color: currentColor; }
        .ms-links { list-style: none; margin-top: 30px; border-top: 1px solid rgb(var(--line)); }
        .ms-link {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 58px;
          border-bottom: 1px solid rgb(var(--line));
          color: rgb(var(--ink));
        }
        .ms-link svg { width: 17px; height: 17px; flex: none; color: rgb(var(--ink-2)); transition: color var(--dur-1) var(--ease-out); }
        .ms-link-label { font-size: 16px; font-weight: 600; }
        .ms-link-value { margin-left: auto; font-size: 14px; color: rgb(var(--ink-3)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        .ms-link-arrow { color: rgb(var(--ink-3)); transition: transform var(--dur-2) var(--ease-out), color var(--dur-1) var(--ease-out); }
        .ms-link:hover .ms-link-arrow,
        .ms-link:focus-visible .ms-link-arrow { color: rgb(var(--accent-text)); transform: translate(2px, -2px); }
        .ms-link:hover svg { color: rgb(var(--ink)); }
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

        /* ── project sheet (dialog) ──────────────────────────────────────── */
        .ms-sheet {
          position: fixed;
          inset: 0;
          z-index: var(--z-sheet);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          background: rgb(var(--space-0) / 0.66);
          animation: ms-fade var(--dur-2) var(--ease-out) both;
        }
        .ms-sheet[data-state='closing'] { animation: ms-fade-out var(--dur-2) var(--ease-out) both; }
        .ms-sheet-panel {
          position: relative;
          width: 100%;
          max-width: 640px;
          max-height: 88svh;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 10px 20px calc(28px + env(safe-area-inset-bottom));
          border-radius: 18px 18px 0 0;
          border: 1px solid rgb(var(--line));
          border-bottom: 0;
          background: rgb(var(--surface));
          box-shadow: 0 -24px 60px -20px rgb(var(--space-0) / 0.8);
          animation: ms-sheet-in 460ms var(--ease-out-expo) both;
        }
        .ms-sheet[data-state='closing'] .ms-sheet-panel { animation: ms-sheet-out var(--dur-2) var(--ease-out) both; }
        .ms-sheet-panel:focus { outline: none; }
        @keyframes ms-fade-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes ms-sheet-in { from { transform: translate3d(0, 100%, 0); } to { transform: none; } }
        @keyframes ms-sheet-out { from { transform: none; } to { transform: translate3d(0, 100%, 0); } }
        @media (prefers-reduced-motion: reduce) {
          .ms-sheet-panel,
          .ms-sheet[data-state='closing'] .ms-sheet-panel { animation: ms-fade var(--dur-2) linear both; }
          .ms-sheet[data-state='closing'] .ms-sheet-panel { animation-name: ms-fade-out; }
        }
        :root[data-theme='light'] .ms-sheet { background: rgb(var(--ink) / 0.32); }
        :root[data-theme='light'] .ms-sheet-panel { box-shadow: 0 -24px 60px -24px rgb(var(--ink) / 0.3); }
        .ms-sheet-grip {
          width: 36px;
          height: 4px;
          margin: 0 auto 12px;
          border-radius: 2px;
          background: rgb(var(--ink) / 0.22);
        }
        .ms-sheet-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .ms-sheet-meta { padding-top: 12px; font-size: 14px; color: rgb(var(--ink-3)); }
        .ms-sheet-meta .t-data { font-size: 13px; }
        .ms-sheet-title { margin-top: 6px; font-size: 26px; color: rgb(var(--ink)); }
        .ms-sheet-cover {
          position: relative;
          margin-top: 18px;
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
function Station({ i, setRef, className, children }: {
  i: number
  setRef: (el: HTMLElement | null) => void
  className?: string
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
    </section>
  )
}

function StationTitle({ i, children }: { i: number; children: ReactNode }) {
  return (
    <div className="ms-title-mask" data-mask>
      <h2 id={`${STATION_IDS[i]}-title`} className="t-title ms-title">{children}</h2>
    </div>
  )
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

function StationRail({ active, onGo }: { active: number; onGo: (i: number) => void }) {
  return (
    <nav className="ms-rail" aria-label="Sections" style={{ ['--active' as string]: active } as CSSProperties} data-ms-inert>
      <ol>
        {STATIONS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              className="ms-rail-btn"
              aria-label={label}
              aria-current={i === active ? 'step' : undefined}
              onClick={() => onGo(i)}
            >
              <span className="ms-rail-tick" />
            </button>
          </li>
        ))}
      </ol>
      <span className="ms-rail-label" aria-hidden="true">
        <span key={active}>{STATIONS[active]}</span>
      </span>
    </nav>
  )
}

// ── 0 · intro ───────────────────────────────────────────────────────────────
function Hero({ onWork }: { onWork: () => void }) {
  return (
    <>
      <div className="ms-hero-scene">
        <div className="ms-sunrise" aria-hidden="true" />
        <IntroCard />
      </div>
      <div className="ms-planet" aria-hidden="true">
        <div className="ms-planet-orb" />
      </div>

      <div className="ms-hero-copy">
        <div className="ms-title-mask" data-mask>
          <h1 id="intro-title" className="t-display ms-hero-name">Shah Fahad</h1>
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
// to the intro video; the pill becomes a mute toggle while it plays.
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
    } else {
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
              sizes="(max-width: 540px) 280px, 320px"
              className="ms-intro-media"
              style={{ objectFit: 'contain', objectPosition: 'bottom' }}
            />
          </span>
          <span className="ms-intro-face ms-intro-back">
            <video
              ref={videoRef}
              className="ms-intro-video ms-intro-media"
              poster="/videos/shah-intro-poster.png"
              playsInline
              preload="metadata"
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
    <>
      <StationTitle i={1}>I ship products people use.</StationTitle>
      <p className="t-lead ms-lead" data-reveal style={iv(1)}>
        8+ years turning ideas into shipped software, from Miletap&apos;s real-time video platform to
        DigitalHire&apos;s hiring system.
      </p>
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
    </>
  )
}

// ── 2 · skills ──────────────────────────────────────────────────────────────
function Skills() {
  return (
    <>
      <StationTitle i={2}>Eight years of craft.</StationTitle>
      <p className="t-lead ms-lead" data-reveal style={iv(1)}>
        React and Next.js on the web, Flutter on mobile, WebRTC and SignalR when it has to be live.
      </p>
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
    </>
  )
}

// ── 3 · work ────────────────────────────────────────────────────────────────
function Work({ onOpen }: { onOpen: (p: Project) => void }) {
  const [page, setPage] = useState(0)
  const prevRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const pages = WORK_GROUPS.length
  const group = WORK_GROUPS[page]
  const height = group.items.length * ROW
  const points = group.items
    .map((_, i) => `${STAR_X[i % STAR_X.length]},${i * ROW + ROW / 2}`)
    .join(' ')

  const go = (d: number) => {
    const np = Math.min(pages - 1, Math.max(0, page + d))
    setPage(np)
    // The pressed button may now be disabled; keep focus inside the pager.
    requestAnimationFrame(() => {
      const el = document.activeElement
      if (!el || el === document.body || (el as HTMLButtonElement).disabled) {
        ;(np === pages - 1 ? prevRef : nextRef).current?.focus()
      }
    })
  }

  return (
    <>
      <StationTitle i={3}>Selected work.</StationTitle>
      <p className="t-lead ms-lead" data-reveal style={iv(1)}>
        Shipped products and engineering demos. Tap a star for the story behind it.
      </p>

      <div className="ms-chart-head" data-reveal style={iv(2)}>
        <h3 className="t-subtitle" aria-live="polite">{group.label}</h3>
        <span className="t-data">{group.items.length} projects</span>
      </div>

      <div className="ms-chart" style={{ height }} data-reveal="group">
        <svg className="ms-chart-path" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <polyline key={page} points={points} />
        </svg>
        {group.items.map((p, i) => {
          const demo = DEMO_IDS.has(p.id)
          return (
            <button
              key={p.id}
              type="button"
              className={`ms-node ms-si${p.featured ? ' ms-node--featured' : ''}${demo ? ' ms-node--demo' : ''}`}
              style={{ top: i * ROW, ['--x' as string]: `${STAR_X[i % STAR_X.length]}%`, ['--i' as string]: i } as CSSProperties}
              aria-haspopup="dialog"
              onClick={() => onOpen(p)}
            >
              <span className="ms-node-star" aria-hidden="true" />
              <span className="ms-node-text">
                <span className="ms-node-title">{shortTitle(p)}</span>
                <span className="ms-node-meta">
                  {CATEGORY[p.category]} · <span className="t-data">{p.year}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <nav className="ms-pager" aria-label="Project groups">
        <button ref={prevRef} type="button" className="btn btn--ghost btn--sm" disabled={page === 0} onClick={() => go(-1)}>
          <FaChevronLeft aria-hidden /> Previous
        </button>
        <span className="t-data" aria-hidden="true">{page + 1} / {pages}</span>
        <button ref={nextRef} type="button" className="btn btn--ghost btn--sm" disabled={page === pages - 1} onClick={() => go(1)}>
          Next <FaChevronRight aria-hidden />
        </button>
      </nav>
    </>
  )
}

// ── 4 · open source ─────────────────────────────────────────────────────────
function OpenSource() {
  const merged = openSourceStats().merged
  return (
    <>
      <StationTitle i={4}>Merged upstream.</StationTitle>
      <p className="t-lead ms-lead" data-reveal style={iv(1)}>
        <span className="ms-em">{merged}</span> pull requests merged into Flutter and the Supabase Flutter SDK.
      </p>
      <div data-reveal style={iv(2)}>
        <FeaturedAchievement />
      </div>
    </>
  )
}

// ── 5 · experience ──────────────────────────────────────────────────────────
function Experience() {
  const [ti, setTi] = useState(0)
  const n = testimonials.length
  return (
    <>
      <StationTitle i={5}>Where I&apos;ve worked.</StationTitle>
      <p className="t-lead ms-lead" data-reveal style={iv(1)}>
        DigitalHire, Kistpay and Miletap, plus part-time work for E-Ocean and Entertech: frontend, real-time and
        mobile.
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
    </>
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
      <StationTitle i={6}>Let&apos;s build something.</StationTitle>
      <p className="t-lead ms-lead" data-reveal style={iv(1)}>
        Open to senior frontend and real-time roles, full-time or contract.
      </p>
      <a className="ms-email" href={`mailto:${EMAIL}`} data-reveal style={iv(2)}>{EMAIL}</a>
      <div className="ms-ctas" data-reveal style={iv(3)}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => window.dispatchEvent(new Event('contact-drawer-open'))}
        >
          Write to me
        </button>
        <a className="btn btn--ghost" href={CAL} target="_blank" rel="noopener noreferrer">
          Book a 15-min call
        </a>
      </div>
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
      <footer className="ms-footer">© 2026 Shah Fahad</footer>
      <div className="ms-home-planet" aria-hidden="true" />
    </>
  )
}

// ── project sheet: a real modal dialog ──────────────────────────────────────
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

function ProjectSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [closing, setClosing] = useState(false)
  const requestClose = useCallback(() => setClosing(true), [])

  // Exit: let the slide-down finish, then unmount.
  useEffect(() => {
    if (!closing) return
    const t = window.setTimeout(onClose, prefersReducedMotion() ? 120 : 280)
    return () => window.clearTimeout(t)
  }, [closing, onClose])

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

  const titleId = `sheet-title-${project.id}`
  return (
    <div className="ms-sheet" data-state={closing ? 'closing' : 'open'} onClick={requestClose}>
      <div
        ref={panelRef}
        className="ms-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
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

        <div className="ms-sheet-cover">
          <Image
            src={project.image}
            alt={`${shortTitle(project)} screenshot`}
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            style={{ objectFit: 'cover' }}
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
  )
}

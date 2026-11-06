// lib/tunnel.ts — state and data shared by the 3D scene and the DOM HUD.
//
// Lives outside components/r3f/TunnelScene.tsx so the HUD, FlipPhotoCard and
// IntroMiniPlayer can import it without pulling the whole scene module, and so
// station copy can change without touching the WebGL code. TunnelScene
// re-exports everything here for older imports.

import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Sound master store — single source of truth shared between the HUD SOUND
// button and the intro FlipPhotoCard. Module-level so it works across the
// React/R3F boundary without context plumbing.
// ─────────────────────────────────────────────────────────────────────────────
let _sound = false
const _soundListeners = new Set<(v: boolean) => void>()
export const soundStore = {
  get: () => _sound,
  set: (v: boolean) => {
    if (_sound === v) return
    _sound = v
    _soundListeners.forEach((cb) => cb(v))
  },
  subscribe: (cb: (v: boolean) => void) => {
    _soundListeners.add(cb)
    return () => { _soundListeners.delete(cb) }
  },
}

export function useSound(): [boolean, (v: boolean) => void] {
  const [s, setS] = useState(_sound)
  useEffect(() => soundStore.subscribe(setS), [])
  return [s, soundStore.set]
}

// ─────────────────────────────────────────────────────────────────────────────
// Intro audio level — how loud the intro video is right now, 0..1, smoothed.
// Written once per animation frame by the hero portrait (PortraitIntro) while
// the intro plays, decays to exactly 0 when it stops, and stays 0 when Web
// Audio is unavailable. Mirrored to window.__sfIntroLevel so the WebGL scene
// can read it per frame without importing anything. Not reactive on purpose:
// read it inside your own rAF / useFrame loop.
// ─────────────────────────────────────────────────────────────────────────────
let _introLevel = 0
export const introLevel = {
  get: () => _introLevel,
  set: (v: number) => {
    _introLevel = v > 0 ? (v < 1 ? v : 1) : 0
    if (typeof window !== 'undefined') {
      (window as unknown as { __sfIntroLevel?: number }).__sfIntroLevel = _introLevel
    }
  },
}

// Tiny util: hex string ("#RRGGBB") → rgba string with alpha.
// For WebGL / canvas-adjacent code only; DOM UI uses rgb(var(--token) / a).
export function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}


// ─────────────────────────────────────────────────────────────────────────────
// Stations — one per portfolio section. `t` is curve progress (0..1).
// Spread away from t=0/t=1 so camera has room to approach/leave each.
// ─────────────────────────────────────────────────────────────────────────────
export interface StationDef {
  id:          string
  label:       string                                // e.g. "00 · Intro" (Html overlay)
  num:         string                                // e.g. "00" (rail position)
  short:       string                                // rail + 3D wayfinding name, sentence case
  t:           number
  /** Station title. "\n" marks a deliberate line break (the HUD reveals each
      line out of its own mask); elsewhere it reads as a space. */
  heading:     string
  /** Lead paragraph. "{n}" is replaced by a live number where a station
      derives one from data (open source: merged PR count). */
  tagline:     string
  color:       string                                // 3D accent only (ember); DOM uses rgb(var(--accent))
  imageSrc?:   string
  cta?:        { text: string; href: string }
  // Secondary copy kept for the 3D scene and any future surface.
  subtitle:    string                                // one-line descriptor
  closer:      [string, string]                      // 2-line sign-off
  traitsLeft:  [string, string, string]
  traitsRight: [string, string, string]
}

export const STATIONS: StationDef[] = [
  {
    id:        'hero',
    label:     '00 · Intro',
    num:       '00',
    short:     'Intro',
    t:         0.04,
    heading:   'Shah\nFahad',
    tagline:   'Senior software engineer building real-time web and mobile products. React, Next.js, Flutter and WebRTC, from Karachi, Pakistan.',
    color:     '#fc9e47',
    imageSrc:  '/images/shah-fahad-sticker.png',
    cta:       { text: 'See the work', href: '#projects' },
    subtitle:    'Senior software engineer',
    closer:      ['Real-time web', 'and mobile products'],
    traitsLeft:  ['React', 'Next.js', 'TypeScript'],
    traitsRight: ['Flutter', 'WebRTC', 'SignalR'],
  },
  {
    id:        'about',
    label:     '01 · About',
    num:       '01',
    short:     'About',
    t:         0.20,
    heading:   'I ship products\npeople use.',
    tagline:   "8+ years turning ideas into shipped software, from Miletap's real-time video platform to DigitalHire's hiring system.",
    color:     '#fc9e47',
    subtitle:    '8+ years · DigitalHire · Kistpay · Miletap · Karachi, PK',
    closer:      ['Clean code, real performance,', 'interfaces that feel alive.'],
    traitsLeft:  ['DigitalHire', 'Kistpay', 'Miletap'],
    traitsRight: ['Karachi', 'Pakistan', 'Remote'],
  },
  {
    id:        'skills',
    label:     '02 · Skills',
    num:       '02',
    short:     'Skills',
    t:         0.35,
    heading:   'Eight years\nof craft.',
    tagline:   'React and Next.js on the web, Flutter on mobile, WebRTC and SignalR when it has to be live.',
    color:     '#fc9e47',
    subtitle:    'Frontend, mobile and real-time',
    closer:      ['Web, mobile', 'and real-time'],
    traitsLeft:  ['React', 'Next.js', 'TypeScript'],
    traitsRight: ['Flutter', 'WebRTC', 'SignalR'],
  },
  {
    id:        'projects',
    label:     '03 · Work',
    num:       '03',
    short:     'Work',
    t:         0.55,
    heading:   'Selected work.',
    tagline:   'Shipped products and engineering demos.',
    color:     '#fc9e47',
    cta:       { text: 'View case studies', href: '#projects' },
    subtitle:    'Shipped products and engineering demos',
    closer:      ['Shipped products', 'and engineering demos'],
    traitsLeft:  ['Real-time', 'WebRTC', 'SignalR'],
    traitsRight: ['React', 'Next.js', 'Flutter'],
  },
  {
    id:        'opensource',
    label:     '04 · Open source',
    num:       '04',
    short:     'Open source',
    t:         0.63,
    heading:   'Merged\nupstream.',
    tagline:   '{n} pull requests merged into Flutter and the Supabase Flutter SDK.',
    color:     '#fc9e47',
    cta:       { text: 'View pull requests', href: '/open-source' },
    subtitle:    'Flutter and the Supabase Flutter SDK',
    closer:      ['Merged pull requests', 'Flutter · Supabase'],
    traitsLeft:  ['Flutter', 'Dart', 'Supabase'],
    traitsRight: ['Merged', 'Tested', 'Reviewed'],
  },
  {
    id:        'experience',
    label:     '05 · Experience',
    num:       '05',
    short:     'Experience',
    t:         0.75,
    heading:   "Where I've\nworked.",
    tagline:   'DigitalHire, Kistpay and Miletap, plus part-time work for E-\u2060Ocean and Entertech: frontend, real-time and mobile.', // \u2060 keeps E-Ocean on one line
    color:     '#fc9e47',
    subtitle:    'Frontend, real-time and mobile',
    closer:      ['DigitalHire · Kistpay', 'Miletap'],
    traitsLeft:  ['Frontend', 'Real-time', 'Mobile'],
    traitsRight: ['Full-time', 'Contract', 'Remote'],
  },
  {
    id:        'contact',
    label:     '06 · Contact',
    num:       '06',
    short:     'Contact',
    t:         0.90,
    heading:   "Let's build\nsomething.",
    tagline:   'Open to senior frontend and real-time roles, full-time or contract.',
    color:     '#fc9e47',
    cta:       { text: 'Book a 15-min call', href: 'https://cal.com/shahfahad' },
    subtitle:    'hello@shahfahad.dev',
    closer:      ['Open to senior', 'frontend roles'],
    traitsLeft:  ['Full-time', 'Contract', 'Remote'],
    traitsRight: ['Frontend', 'Real-time', 'Mobile'],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Hook for React components OUTSIDE Canvas to read live scroll progress.
// Polls scrollRef via rAF, only setStates when meaningfully changed to keep
// re-renders cheap.
// ─────────────────────────────────────────────────────────────────────────────
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let last  = -1
    let rafId = 0
    const tick = () => {
      const w = window as unknown as {
        __scrollRef?: { current: number }
        __lenis?:     { scroll: number; limit: number }
      }
      // Source of truth: Lenis if available, else __scrollRef
      let cur = w.__scrollRef?.current ?? 0
      const lenis = w.__lenis
      if (lenis && lenis.limit > 0) cur = lenis.scroll / lenis.limit
      if (Math.abs(cur - last) > 0.003) {
        last = cur
        setProgress(cur)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return progress
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: returns the station whose `t` is nearest to current progress
// ─────────────────────────────────────────────────────────────────────────────
export function nearestStation(progress: number): StationDef {
  let best = STATIONS[0]
  let bestDist = Math.abs(progress - best.t)
  for (let i = 1; i < STATIONS.length; i++) {
    const d = Math.abs(progress - STATIONS[i].t)
    if (d < bestDist) { best = STATIONS[i]; bestDist = d }
  }
  return best
}

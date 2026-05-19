// app/page.tsx — Step 4 integration
//
// Desktop hover-capable browsers get the R3F tunnel as the primary portfolio
// experience. Mobile, touch and reduced-motion users fall back to the classic
// scrollable sections (preserves modal, hex game, contact form interactivity).
//
// Initial render = classic mode (server-rendered HTML, SEO friendly). A
// client-side matchMedia check then upgrades to tunnel mode on capable devices.

'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { About } from '@/components/sections/About'
import { Projects } from '@/components/sections/Projects'
import { Experience } from '@/components/sections/Experience'
import { Skills } from '@/components/sections/Skills'
import { Contact } from '@/components/sections/Contact'
import { JsonLd } from '@/components/seo/JsonLd'
import { profilePageSchema, projectsItemListSchema } from '@/lib/seo/jsonld'

// Lazy-load the heavy R3F bundle — only fetched when desktop mode is chosen.
const TunnelScene = dynamic(
  () => import('@/components/r3f/TunnelScene').then((m) => m.TunnelScene),
  { ssr: false },
)

type Mode = 'classic' | 'tunnel'

export default function Page() {
  // Default to classic for SSR + non-tunnel devices. Upgraded client-side.
  const [mode, setMode] = useState<Mode>('classic')

  useEffect(() => {
    const mql      = window.matchMedia('(min-width: 1024px) and (hover: hover)')
    const reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (mql.matches && !reduced) setMode('tunnel')

    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setMode('tunnel')
      } else {
        setMode('classic')
      }
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return (
    <>
      <JsonLd data={profilePageSchema()} />
      <JsonLd data={projectsItemListSchema()} />
      <Navbar />

      {mode === 'tunnel' ? <TunnelMode /> : <ClassicMode />}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tunnel mode — R3F scene + tall scroll spacer + invisible anchor targets so
// the existing Navbar `scrollIntoView('#about')` flow lands the camera at the
// right station.
// ─────────────────────────────────────────────────────────────────────────────
function TunnelMode() {
  // Anchor positions match the scroll-progress of each station inside
  // TunnelScene. Page total = 500vh; usable scroll = 400vh; so:
  //   topVh = station.t * 400
  // Tweaked slightly so each anchor lands the camera AT the station, not
  // before/after.
  const anchors = [
    { id: 'hero',       topVh: 16  },   // t≈0.04
    { id: 'about',      topVh: 88  },   // t≈0.22
    { id: 'projects',   topVh: 168 },   // t≈0.42
    { id: 'experience', topVh: 248 },   // t≈0.62
    { id: 'skills',     topVh: 304 },   // mid between experience & contact
    { id: 'contact',    topVh: 344 },   // t≈0.86
  ]

  return (
    <>
      <TunnelScene />

      {/* Scroll spacer — 500vh of scrollable height drives camera 0..1 along curve.
          pointerEvents:none so the tunnel underneath can still receive nothing
          (we don't want anything blocking; canvas itself has pointerEvents:none). */}
      <main
        style={{
          height: '500vh',
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        {anchors.map(({ id, topVh }) => (
          <div
            key={id}
            id={id}
            style={{
              position: 'absolute',
              top: `${topVh}vh`,
              left: 0, right: 0,
              height: 1,
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />
        ))}
      </main>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Classic mode — original portfolio sections, unchanged.
// ─────────────────────────────────────────────────────────────────────────────
function ClassicMode() {
  return (
    <>
      <main className="overflow-x-hidden w-full">
        <Hero />
        <About />
        <Projects />
        <Experience />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </>
  )
}

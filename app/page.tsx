// app/page.tsx — Step 9 integration
//
// Three rendering paths:
//   1. Loading: detect-gpu still running → minimal spinner
//   2. Tunnel (mid/high): R3F canvas with preset-scaled quality + HUD + toggle
//   3. Classic (low / mobile / reduced-motion): original DOM portfolio
//
// User can override the detected tier via the QualityToggle button — choice
// persists across reloads via localStorage.

'use client'

import { useEffect, useRef, useState } from 'react'
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

import { useQualityLevel } from '@/components/r3f/useQualityLevel'
import { QualityToggle } from '@/components/r3f/QualityToggle'
import { PRESETS, type QualityLevel } from '@/lib/quality'

const TunnelScene = dynamic(
  () => import('@/components/r3f/TunnelScene').then((m) => m.TunnelScene),
  { ssr: false },
)
const TunnelHUD = dynamic(
  () => import('@/components/r3f/TunnelHUD').then((m) => m.TunnelHUD),
  { ssr: false },
)

export default function Page() {
  const [eligible, setEligible] = useState<boolean | null>(null)
  const quality = useQualityLevel()

  // matchMedia check for hover-capable desktop. Re-evaluates on viewport change.
  useEffect(() => {
    const mql      = window.matchMedia('(min-width: 1024px) and (hover: hover)')
    const reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setEligible(mql.matches && !reduced)

    const onChange = (e: MediaQueryListEvent) => {
      const r = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setEligible(e.matches && !r)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // While device gate or detect-gpu is pending, show spinner.
  // SSR/initial render uses ClassicMode so HTML/SEO still ships.
  const stillResolving = eligible === null || (eligible && quality.loading)

  return (
    <>
      <JsonLd data={profilePageSchema()} />
      <JsonLd data={projectsItemListSchema()} />

      {stillResolving ? (
        <BootSpinner />
      ) : eligible && quality.level && PRESETS[quality.level].canvas ? (
        // Tunnel mode owns its own nav inside the HUD chrome — classic
        // Navbar would duplicate the top bar
        <TunnelMode level={quality.level} onLevelChange={quality.setOverride} reportLowFps={quality.reportLowFps} />
      ) : (
        <ClassicMode />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot spinner — minimal, doesn't trigger R3F bundle download
// ─────────────────────────────────────────────────────────────────────────────
function BootSpinner() {
  return (
    <div
      style={{
        position:  'fixed',
        inset:     0,
        display:   'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0A0B',
        zIndex:     5,
      }}
    >
      <div
        style={{
          width:      36,
          height:     36,
          borderRadius: '50%',
          border:     '2px solid rgba(94,234,212,0.18)',
          borderTopColor: '#5EEAD4',
          animation:  'tunnel-spin 0.8s linear infinite',
        }}
      />
      <style jsx>{`
        @keyframes tunnel-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TunnelMode — runs the canvas + monitors FPS for first 3s
// ─────────────────────────────────────────────────────────────────────────────
function TunnelMode({
  level, onLevelChange, reportLowFps,
}: {
  level:         QualityLevel
  onLevelChange: (level: QualityLevel | null) => void
  reportLowFps:  () => void
}) {
  // FPS sample for the first 3 seconds after mount. If avg < 30 → downgrade.
  const reportedRef = useRef(false)
  useEffect(() => {
    if (reportedRef.current) return
    let frames = 0
    let rafId  = 0
    const start = performance.now()

    const tick = (now: number) => {
      frames++
      const elapsed = now - start
      if (elapsed >= 3000) {
        const avg = (frames * 1000) / elapsed
        if (avg < 30 && !reportedRef.current) {
          reportedRef.current = true
          reportLowFps()
        }
        return
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [reportLowFps])

  const preset = PRESETS[level]

  // Anchors land the camera slightly BEFORE each station so its ring is
  // visible AHEAD in the centre of view. The offset is small enough that
  // nearestStation() still resolves to the clicked station (gap to adjacent
  // stations is ≥0.18, so an offset of 0.03 is well inside the slot).
  //
  //  Anchor progress = stationT − 0.03
  //  → camera is ~5.7 world units upstream of the station
  //  → station ring fills ~50% of vertical view (proximity ≈ 0.7)
  //  → drei Text label "0X · NAME" is also at full visibility
  //
  // The total scrollable distance is `main height − viewport height`
  // = 500vh − 100vh = 400vh.
  const SCROLLABLE_VH = 400
  const beforeT = (t: number) => Math.max(0, t - 0.03) * SCROLLABLE_VH

  const anchors = [
    { id: 'hero',       topVh: beforeT(0.04) },   //  4vh  (already at start)
    { id: 'about',      topVh: beforeT(0.22) },   //  76vh
    { id: 'projects',   topVh: beforeT(0.42) },   // 156vh
    { id: 'experience', topVh: beforeT(0.62) },   // 236vh
    { id: 'skills',     topVh: beforeT(0.74) },   // between exp & contact
    { id: 'contact',    topVh: beforeT(0.86) },   // 332vh
  ]

  return (
    <>
      <TunnelScene preset={preset} />
      <TunnelHUD />
      <QualityToggle level={level} onChange={(l) => onLevelChange(l)} />

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
// Classic mode — original portfolio sections (mobile, low-end, reduced-motion)
// ─────────────────────────────────────────────────────────────────────────────
function ClassicMode() {
  return (
    <>
      <Navbar />
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

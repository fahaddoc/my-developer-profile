'use client'

// AppShell — everything heavy lives here. ONLY mounts after the LoadingScreen
// completes. Imported via next/dynamic from app/page.tsx, so its bundle (and
// all the section/R3F deps it pulls in) does NOT download or hydrate during
// the intro animation. That keeps the loader's main thread clean.

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

import { useQualityLevel } from '@/components/r3f/useQualityLevel'
import { QualityToggle } from '@/components/r3f/QualityToggle'
import { TunnelAnchors, useTunnelLoop } from '@/components/r3f/TunnelScrollRails'
import { PRESETS, type QualityLevel } from '@/lib/quality'
import { EmberLight } from '@/components/ui/LoadingScreen'

const TunnelScene = dynamic(
  () => import('@/components/r3f/TunnelScene').then((m) => m.TunnelScene),
  { ssr: false },
)
const TunnelHUD = dynamic(
  () => import('@/components/r3f/TunnelHUD').then((m) => m.TunnelHUD),
  { ssr: false },
)
const MobileSpace = dynamic(() => import('@/components/mobile/MobileSpace'), { ssr: false })

export default function AppShell() {
  const [eligible, setEligible] = useState<boolean | null>(null)
  const quality = useQualityLevel(eligible === true)

  useEffect(() => {
    // Manual override for previewing either experience on any device:
    // ?view=mobile forces the MobileSpace path, ?view=tunnel forces the 3D one.
    const forced = new URLSearchParams(window.location.search).get('view')
    if (forced === 'mobile') { setEligible(false); return }
    if (forced === 'tunnel') { setEligible(true); return }

    const mql     = window.matchMedia('(min-width: 1024px) and (hover: hover)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setEligible(mql.matches && !reduced)

    const onChange = (e: MediaQueryListEvent) => {
      const r = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setEligible(e.matches && !r)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const stillResolving = eligible === null || (eligible && quality.loading)

  if (stillResolving) return <BootSpinner />
  if (eligible && quality.level && PRESETS[quality.level].canvas) {
    return (
      <TunnelMode
        level={quality.level}
        onLevelChange={quality.setOverride}
        reportLowFps={quality.reportLowFps}
      />
    )
  }
  return <ClassicMode />
}

// BootSpinner — covers the gap while eligibility / GPU tier resolve. It is
// the loader's last frame held: the same space and the same ember point in
// the same place, now breathing gently (EmberLight variant="idle"), so the
// intro hands off without a cut. Theme-aware via tokens; static under reduced
// motion.
function BootSpinner() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        position:   'fixed',
        inset:      0,
        background: 'rgb(var(--space-0))',
        zIndex:     5,
        overflow:   'hidden',
      }}
    >
      <EmberLight variant="idle" />
      <span className="sr-only">Loading the portfolio…</span>
    </div>
  )
}

function TunnelMode({
  level, onLevelChange, reportLowFps,
}: {
  level:         QualityLevel
  onLevelChange: (level: QualityLevel | null) => void
  reportLowFps:  () => void
}) {
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

  useTunnelLoop()

  const preset = PRESETS[level]

  return (
    <>
      <TunnelScene preset={preset} />
      <TunnelHUD />
      <QualityToggle level={level} onChange={(l) => onLevelChange(l)} />
      <main
        style={{
          height:        '500vh',
          position:      'relative',
          zIndex:        1,
          pointerEvents: 'none',
        }}
      >
        <TunnelAnchors />
      </main>
    </>
  )
}

function ClassicMode() {
  // Mobile / touch / reduced-capability — the rebuilt "space" experience that
  // matches the desktop tunnel identity (starfield, station rail, planets,
  // mini-nebula hero, project constellation). Replaces the old neon sections.
  return <MobileSpace />
}

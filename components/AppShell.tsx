'use client'

// AppShell — everything heavy lives here. Imported via next/dynamic from
// app/page.tsx, it mounts on the first frame UNDERNEATH the LoadingScreen
// overlay, so its chunks download, hydrate and (desktop) compile the WebGL
// scene while the title card plays.
//
// One BootFrame "veil" (the loader's held last frame: space + the ember
// point) stays mounted at a fixed place in this tree from AppShell's first
// render until the first real frame is on screen:
//   - tunnel: the scene has drawn its first frame and the HUD is mounted;
//   - classic: MobileSpace has mounted.
// It covers eligibility + GPU tier, the experience's chunk, and the scene's
// first draw (an undrawn alpha:false canvas would show black), sitting above
// the canvas and below the HUD. Then it fades out (280ms) and
// signalAppReady() lets the loader card crossfade away.

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

import { useQualityLevel } from '@/components/r3f/useQualityLevel'
import { QualityToggle } from '@/components/r3f/QualityToggle'
import { TunnelAnchors, useTunnelLoop } from '@/components/r3f/TunnelScrollRails'
import { PRESETS, type QualityLevel } from '@/lib/quality'
import {
  BOOT_FADE_MS,
  BootFrame,
  SCENE_READY_EVENT,
  signalAppReady,
  warmAppChunks,
} from '@/components/ui/LoadingScreen'

type MountedProps = { onMounted: () => void }

// No loading fallbacks below on purpose: the veil already covers the screen
// (a second BootFrame would stack its bloom on the veil's and brighten it).
const TunnelScene = dynamic(
  () => import('@/components/r3f/TunnelScene').then((m) => m.TunnelScene),
  { ssr: false, loading: () => null },
)
// The HUD and MobileSpace report their own mount, so the handoff waits for them.
const TunnelHUD = dynamic(
  () => import('@/components/r3f/TunnelHUD').then((m) => {
    const HUD = m.TunnelHUD
    return function TunnelHUDMounted({ onMounted }: MountedProps) {
      useEffect(() => { onMounted() }, [onMounted])
      return <HUD />
    }
  }),
  { ssr: false, loading: () => null },
)
const MobileSpace = dynamic(
  () => import('@/components/mobile/MobileSpace').then((m) => {
    const Space = m.default
    return function MobileSpaceMounted({ onMounted }: MountedProps) {
      useEffect(() => { onMounted() }, [onMounted])
      return <Space />
    }
  }),
  { ssr: false, loading: () => null },
)

/** If the scene never announces its first frame, call it drawn this long
 *  after its canvas exists. The loader caps its own wait anyway. */
const SCENE_FALLBACK_MS = 900

export default function AppShell() {
  const [eligible, setEligible] = useState<boolean | null>(null)
  const quality = useQualityLevel(eligible === true)
  const [firstFrame, setFirstFrame] = useState(false)

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

  // Start the experience's chunks as soon as the path is known, in parallel
  // with GPU detection (no-op if the loader already warmed them).
  useEffect(() => {
    if (eligible === null) return
    warmAppChunks(eligible ? 'tunnel' : 'mobile')
  }, [eligible])

  const onFirstFrame = useCallback(() => {
    setFirstFrame(true)
    signalAppReady()
  }, [])

  const stillResolving = eligible === null || (eligible && quality.loading)

  let experience: React.ReactNode = null
  if (!stillResolving) {
    experience = eligible && quality.level && PRESETS[quality.level].canvas
      ? (
        <TunnelMode
          level={quality.level}
          onLevelChange={quality.setOverride}
          reportLowFps={quality.reportLowFps}
          onFirstFrame={onFirstFrame}
        />
      )
      : <ClassicMode onFirstFrame={onFirstFrame} />
  }

  return (
    <>
      {experience}
      <BootVeil done={firstFrame} />
    </>
  )
}

/** The held boot frame; fades out once the first real frame is up. Always
 *  rendered at the same place in the tree, so its bloom never restarts. */
function BootVeil({ done }: { done: boolean }) {
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (!done) return
    const t = window.setTimeout(() => setGone(true), BOOT_FADE_MS + 40)
    return () => window.clearTimeout(t)
  }, [done])
  if (gone) return null
  return <BootFrame leaving={done} />
}

function TunnelMode({
  level, onLevelChange, reportLowFps, onFirstFrame,
}: {
  level:         QualityLevel
  onLevelChange: (level: QualityLevel | null) => void
  reportLowFps:  () => void
  onFirstFrame:  () => void
}) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [sceneDrawn, setSceneDrawn] = useState(false)
  const [hudMounted, setHudMounted] = useState(false)
  const onHudMounted = useCallback(() => setHudMounted(true), [])

  // The scene's first rendered frame: the scene fires SCENE_READY_EVENT after
  // it; if it never does, assume it a short while after its canvas exists.
  useEffect(() => {
    let done = false
    let raf = 0
    let timer = 0
    const cleanup = () => {
      window.removeEventListener(SCENE_READY_EVENT, finish)
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
    function finish() {
      if (done) return
      done = true
      cleanup()
      setSceneDrawn(true)
    }
    window.addEventListener(SCENE_READY_EVENT, finish)
    const poll = () => {
      if (sceneRef.current?.querySelector('canvas')) {
        timer = window.setTimeout(finish, SCENE_FALLBACK_MS)
        return
      }
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return cleanup
  }, [])

  const ready = sceneDrawn && hudMounted
  useEffect(() => { if (ready) onFirstFrame() }, [ready, onFirstFrame])

  // FPS sample over the first 3s after the first frame (shader compile and
  // the loader overlap excluded, so a compile hitch is not read as a slow GPU).
  const reportedRef = useRef(false)
  useEffect(() => {
    if (!ready || reportedRef.current) return
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
  }, [ready, reportLowFps])

  useTunnelLoop()

  const preset = PRESETS[level]

  return (
    <>
      {/* display: contents — only here so the readiness probe can find the
          scene's canvas; TunnelScene positions itself (fixed). */}
      <div ref={sceneRef} style={{ display: 'contents' }}>
        <TunnelScene preset={preset} />
      </div>
      <TunnelHUD onMounted={onHudMounted} />
      <QualityToggle level={level} onChange={(l) => onLevelChange(l)} />
      {/* The scroll track. Not a landmark: the HUD stage is <main>. */}
      <div
        aria-hidden="true"
        style={{
          height:        '500vh',
          position:      'relative',
          zIndex:        1,
          pointerEvents: 'none',
        }}
      >
        <TunnelAnchors />
      </div>
    </>
  )
}

function ClassicMode({ onFirstFrame }: { onFirstFrame: () => void }) {
  // Mobile / touch / reduced-capability — the rebuilt "space" experience that
  // matches the desktop tunnel identity (starfield, station rail, planets,
  // horizon hero, project constellation). Ready once it has mounted and
  // painted.
  const onMounted = useCallback(() => {
    requestAnimationFrame(() => onFirstFrame())
  }, [onFirstFrame])
  return <MobileSpace onMounted={onMounted} />
}

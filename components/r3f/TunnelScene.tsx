'use client'

// TunnelScene — Step 1: pure WebGL tunnel + scroll-driven camera fly-through.
//
// Architecture:
//  • CatmullRomCurve3 defines a winding 3D path through space
//  • TubeGeometry extrudes a tube along that path → the visible tunnel walls
//  • A vanilla scroll listener writes scrollProgress (0..1) to a mutable ref
//    (GSAP ScrollTrigger added as a thin wrapper so Lenis/native scroll
//    both feed the same ref)
//  • useFrame reads ref each tick, samples the curve at progress, places
//    the camera there and orients it down-path
//
// Step 1 deliberately keeps this minimal — no HTML overlays, no textures,
// no fancy materials. Just verify the camera-on-curve mechanism works.

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Shared scroll progress — read each frame inside R3F.
// Plain object ref so it works across the React/R3F boundary without context.
const scrollRef = { current: 0 }

// ─────────────────────────────────────────────────────────────────────────────
// Curve definition — control points the camera will fly through.
// Z decreases (camera flies into -Z direction by default in Three.js).
// X/Y wobble gives the tunnel "bends" so the fly-through feels dynamic.
// ─────────────────────────────────────────────────────────────────────────────
const CURVE_POINTS: [number, number, number][] = [
  [   0,   0,    0 ],
  [   3,   1,  -15 ],
  [  -2,  -2,  -30 ],
  [   4,   3,  -50 ],
  [  -3,   1,  -70 ],
  [   2,  -3,  -90 ],
  [  -4,   2, -110 ],
  [   1,   0, -130 ],
  [   0,   2, -150 ],
  [  -2,  -1, -170 ],
  [   0,   0, -190 ],
]

// ─────────────────────────────────────────────────────────────────────────────
// Tunnel: TubeGeometry along the curve, glowing wireframe
// ─────────────────────────────────────────────────────────────────────────────
function Tunnel({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  // Solid translucent tube + wireframe overlay for the "glowing scaffold" look
  const tubeGeometry = useMemo(
    () => new THREE.TubeGeometry(curve, 600, 2.2, 32, false),
    [curve],
  )

  return (
    <>
      {/* Inner solid skin — very faint, just enough to occlude things behind */}
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          color="#0A0A12"
          side={THREE.BackSide}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Outer wireframe — the glowing structural lines */}
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          color="#FFB547"
          wireframe
          side={THREE.BackSide}
          transparent
          opacity={0.55}
        />
      </mesh>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CameraRig: reads scrollRef each frame, places camera along curve
// ─────────────────────────────────────────────────────────────────────────────
function CameraRig({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  // Reusable Vector3s — avoid allocating each frame
  const posVec    = useMemo(() => new THREE.Vector3(), [])
  const lookVec   = useMemo(() => new THREE.Vector3(), [])
  // Smoothed progress so the camera doesn't jitter on raw scroll delta
  const smoothRef = useRef(0)

  useFrame(({ camera }) => {
    // Lerp toward raw scroll progress for a softer motion feel
    smoothRef.current += (scrollRef.current - smoothRef.current) * 0.12

    const t  = Math.min(0.999, Math.max(0, smoothRef.current))
    const tNext = Math.min(0.9999, t + 0.005)

    curve.getPointAt(t,     posVec)
    curve.getPointAt(tNext, lookVec)

    camera.position.copy(posVec)
    camera.lookAt(lookVec)
  })

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component — Canvas + scroll wiring
// ─────────────────────────────────────────────────────────────────────────────
export function TunnelScene() {
  // Build curve once
  const curve = useMemo(() => new THREE.CatmullRomCurve3(
    CURVE_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'catmullrom',
    0.5,
  ), [])

  // Wire scroll → scrollRef.current using GSAP ScrollTrigger.
  // ScrollTrigger plays nice with Lenis (already wired in SmoothScroll provider)
  // and falls back to native scroll otherwise.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const st = ScrollTrigger.create({
      trigger: document.body,
      start:   'top top',
      end:     'bottom bottom',
      scrub:   0,
      onUpdate: (self) => {
        scrollRef.current = self.progress
      },
    })

    // In case Lenis isn't running, also listen to native scroll
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max > 0) scrollRef.current = window.scrollY / max
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      st.kill()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset:    0,
        zIndex:   0,
        pointerEvents: 'none',
        background: '#05050A',
      }}
    >
      <Canvas
        camera={{ fov: 70, near: 0.05, far: 400, position: [0, 0, 0] }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Background fog — distant tube fades into the void */}
        <fog attach="fog" args={['#05050A', 8, 60]} />

        {/* Ambient + small key light so the wireframe has subtle variation */}
        <ambientLight intensity={0.4} />
        <pointLight position={[0, 0, -5]} intensity={1.5} color="#FFB547" />

        <Tunnel curve={curve} />
        <CameraRig curve={curve} />
      </Canvas>
    </div>
  )
}

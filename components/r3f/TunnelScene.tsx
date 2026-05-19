'use client'

// TunnelScene — Step 2: tunnel + scroll-driven camera + station markers.
//
// New in Step 2:
//  • STATIONS array — 5 points along the curve where portfolio sections land
//  • Station component renders a glowing ring + floating label at each point
//  • Ring orientation follows the curve tangent (perpendicular to flight path)
//  • Proximity-based opacity boost — ring/label brighten as camera approaches
//  • Exported useScrollProgress + STATIONS so the HUD can subscribe
//
// Step 2 still skips: HTML content overlays (Step 3), mobile fallback,
// integration with main portfolio.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Shared scroll progress — read each frame inside R3F, also subscribed via the
// useScrollProgress hook below for HUD/UI updates outside the canvas.
const scrollRef = { current: 0 }

// ─────────────────────────────────────────────────────────────────────────────
// Curve definition
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
// Stations — one per portfolio section. `t` is curve progress (0..1).
// Spread away from t=0/t=1 so camera has room to approach/leave each.
// ─────────────────────────────────────────────────────────────────────────────
export interface StationDef {
  id:    string
  label: string
  t:     number
}

export const STATIONS: StationDef[] = [
  { id: 'hero',       label: '00 · INTRO',      t: 0.04 },
  { id: 'about',      label: '01 · ABOUT',      t: 0.22 },
  { id: 'projects',   label: '02 · PROJECTS',   t: 0.42 },
  { id: 'experience', label: '03 · EXPERIENCE', t: 0.62 },
  { id: 'contact',    label: '04 · CONTACT',    t: 0.86 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Hook for React components OUTSIDE Canvas to read live scroll progress.
// Polls scrollRef via rAF, only setStates when meaningfully changed to keep
// re-renders cheap.
// ─────────────────────────────────────────────────────────────────────────────
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let rafId = 0
    let last  = -1

    const tick = () => {
      rafId = requestAnimationFrame(tick)
      const cur = scrollRef.current
      // 0.5% threshold — visible change without churning React
      if (Math.abs(cur - last) > 0.005) {
        last = cur
        setProgress(cur)
      }
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

// ─────────────────────────────────────────────────────────────────────────────
// Tunnel: TubeGeometry along the curve
// ─────────────────────────────────────────────────────────────────────────────
function Tunnel({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const tubeGeometry = useMemo(
    () => new THREE.TubeGeometry(curve, 600, 2.2, 32, false),
    [curve],
  )

  return (
    <>
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          color="#0A0A12"
          side={THREE.BackSide}
          transparent
          opacity={0.9}
        />
      </mesh>

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
// Station: ring + label at a curve point, oriented along the tangent.
// Proximity-based brightness: brightest when camera is at `t`, fades with
// |scrollRef - t|.
// ─────────────────────────────────────────────────────────────────────────────
function Station({
  curve, t, label,
}: {
  curve: THREE.CatmullRomCurve3
  t:     number
  label: string
}) {
  const groupRef    = useRef<THREE.Group>(null)
  const ringMatRef  = useRef<THREE.MeshBasicMaterial>(null)
  const dotMatRef   = useRef<THREE.MeshBasicMaterial>(null)
  // drei Text uses an internal material slot but we can grab the mesh
  // and tweak material opacity in useFrame too — store via ref-callback
  const textMatRef  = useRef<THREE.Material | null>(null)

  // Place + orient the group once on mount (curve is stable after memo)
  useEffect(() => {
    if (!groupRef.current) return
    const pos     = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    curve.getPointAt(t, pos)
    curve.getTangentAt(t, tangent)

    groupRef.current.position.copy(pos)
    // Aim group's local +Z down the path. lookAt expects a target point.
    groupRef.current.lookAt(pos.clone().add(tangent))
  }, [curve, t])

  // Proximity scrubbing — opacity & label scale lerp toward "active" when
  // camera is near this station.
  useFrame(() => {
    const dist      = Math.abs(scrollRef.current - t)
    // Within 0.06 of station = full strength; beyond 0.15 = baseline.
    const proximity = Math.max(0, 1 - dist / 0.10)
    const ringOp    = 0.18 + proximity * 0.82
    const textOp    = 0.25 + proximity * 0.75

    if (ringMatRef.current) ringMatRef.current.opacity = ringOp
    if (dotMatRef.current)  dotMatRef.current.opacity  = ringOp
    if (textMatRef.current) (textMatRef.current as THREE.MeshBasicMaterial).opacity = textOp

    // Slight scale breath on active station for organic feel
    if (groupRef.current) {
      const breath = 1 + proximity * 0.06
      groupRef.current.scale.setScalar(breath)
    }
  })

  return (
    <group ref={groupRef}>
      {/* Primary ring — perpendicular to the tunnel axis at this point */}
      <mesh>
        <torusGeometry args={[2.35, 0.06, 10, 96]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color="#FFB547"
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Secondary inner ring — slightly smaller, dimmer, gives depth */}
      <mesh>
        <torusGeometry args={[2.10, 0.025, 8, 64]} />
        <meshBasicMaterial
          color="#FFE6B4"
          transparent
          opacity={0.25}
          toneMapped={false}
        />
      </mesh>

      {/* Four marker dots around the ring (3, 6, 9, 12 o'clock) */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
        <mesh
          key={i}
          position={[Math.cos(angle) * 2.35, Math.sin(angle) * 2.35, 0]}
        >
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial
            ref={i === 0 ? dotMatRef : undefined}
            color="#FFFAE6"
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Floating label above the ring (in local frame: +Y, slight +Z behind) */}
      <Text
        position={[0, 1.55, 0.3]}
        fontSize={0.32}
        color="#FFB547"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        outlineColor="#1A0E00"
        outlineWidth={0.012}
        onUpdate={(self) => {
          // grab text material once it mounts so useFrame can scrub opacity
          if (!textMatRef.current && self.material) {
            textMatRef.current = self.material as THREE.Material
            ;(self.material as THREE.MeshBasicMaterial).transparent = true
          }
        }}
      >
        {label}
      </Text>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CameraRig: reads scrollRef each frame, places camera along curve
// ─────────────────────────────────────────────────────────────────────────────
function CameraRig({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const posVec    = useMemo(() => new THREE.Vector3(), [])
  const lookVec   = useMemo(() => new THREE.Vector3(), [])
  const smoothRef = useRef(0)

  useFrame(({ camera }) => {
    smoothRef.current += (scrollRef.current - smoothRef.current) * 0.12

    const t     = Math.min(0.999,  Math.max(0, smoothRef.current))
    const tNext = Math.min(0.9999, t + 0.005)

    curve.getPointAt(t,     posVec)
    curve.getPointAt(tNext, lookVec)

    camera.position.copy(posVec)
    camera.lookAt(lookVec)
  })

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component — Canvas + scroll wiring + tunnel + stations
// ─────────────────────────────────────────────────────────────────────────────
export function TunnelScene() {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(
    CURVE_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'catmullrom',
    0.5,
  ), [])

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
        <fog attach="fog" args={['#05050A', 8, 60]} />

        <ambientLight intensity={0.4} />
        <pointLight position={[0, 0, -5]} intensity={1.5} color="#FFB547" />

        <Tunnel curve={curve} />

        {STATIONS.map((s) => (
          <Station key={s.id} curve={curve} t={s.t} label={s.label} />
        ))}

        <CameraRig curve={curve} />
      </Canvas>
    </div>
  )
}

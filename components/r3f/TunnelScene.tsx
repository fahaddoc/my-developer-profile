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

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
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
  id:      string
  label:   string
  t:       number
  heading: string
  tagline: string
  cta?:    { text: string; href: string }
}

export const STATIONS: StationDef[] = [
  {
    id:      'hero',
    label:   '00 · INTRO',
    t:       0.04,
    heading: 'Shah Fahad',
    tagline: 'Senior Software Engineer — React, Next.js, Flutter, WebRTC. Real-time experiences from Karachi, Pakistan.',
  },
  {
    id:      'about',
    label:   '01 · ABOUT',
    t:       0.22,
    heading: 'Turning ideas into shipped products',
    tagline: '6+ years · 4 companies · 9+ projects · 25+ clients. From MILETAP\'s real-time video platform to DigitalHire\'s hiring system.',
  },
  {
    id:      'projects',
    label:   '02 · PROJECTS',
    t:       0.42,
    heading: 'Featured work',
    tagline: 'Konnect.im video conferencing · DigitalHire SaaS · WhatsApp ChatBot Simulator · Agent Shah 3D portfolio game.',
    cta:     { text: 'view case studies →', href: '#projects' },
  },
  {
    id:      'experience',
    label:   '03 · EXPERIENCE',
    t:       0.62,
    heading: 'Professional journey',
    tagline: 'DigitalHire (current) · MILETAP · E-Ocean · freelance & contract — frontend, real-time, mobile.',
  },
  {
    id:      'contact',
    label:   '04 · CONTACT',
    t:       0.86,
    heading: "Let's build something",
    tagline: 'hello@shahfahad.dev · open to senior frontend & real-time roles, full-time and contract.',
    cta:     { text: 'book a 15-min call →', href: 'https://cal.com/shahfahad' },
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
  curve, station, htmlContent,
}: {
  curve:       THREE.CatmullRomCurve3
  station:     StationDef
  htmlContent: ReactNode
}) {
  const { t, label } = station

  const groupRef     = useRef<THREE.Group>(null)
  const ringMatRef   = useRef<THREE.MeshBasicMaterial>(null)
  const dotMatRef    = useRef<THREE.MeshBasicMaterial>(null)
  const textMatRef   = useRef<THREE.Material | null>(null)
  // HTML content div — opacity scrubbed each frame
  const htmlDivRef   = useRef<HTMLDivElement>(null)

  // Place + orient the group once on mount.
  // We want the station to FACE the approaching camera. Camera travels along
  // +tangent, so it approaches from -tangent side. Pointing the group's
  // forward at `pos - tangent` makes its readable face (where Text/Html sit)
  // turn toward the camera.
  useEffect(() => {
    if (!groupRef.current) return
    const pos     = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    curve.getPointAt(t, pos)
    curve.getTangentAt(t, tangent)

    groupRef.current.position.copy(pos)
    groupRef.current.lookAt(pos.clone().sub(tangent))
  }, [curve, t])

  // Proximity scrubbing
  useFrame(() => {
    const dist      = Math.abs(scrollRef.current - t)
    const proximity = Math.max(0, 1 - dist / 0.10)
    const ringOp    = 0.18 + proximity * 0.82
    const textOp    = 0.25 + proximity * 0.75
    // HTML fades sharper than ring — only fully visible when very close
    const htmlOp    = Math.pow(proximity, 1.6)

    if (ringMatRef.current) ringMatRef.current.opacity = ringOp
    if (dotMatRef.current)  dotMatRef.current.opacity  = ringOp
    if (textMatRef.current) (textMatRef.current as THREE.MeshBasicMaterial).opacity = textOp
    if (htmlDivRef.current) htmlDivRef.current.style.opacity = htmlOp.toFixed(3)

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
          if (!textMatRef.current && self.material) {
            textMatRef.current = self.material as THREE.Material
            ;(self.material as THREE.MeshBasicMaterial).transparent = true
          }
        }}
      >
        {label}
      </Text>

      {/* HTML content overlay — projected in 3D space, transform mode follows
          group orientation, distanceFactor scales naturally with camera approach.
          Slightly off-axis so it doesn't sit dead-centre in the ring. */}
      <Html
        transform
        position={[0, -0.4, -0.05]}
        distanceFactor={5.5}
        zIndexRange={[10, 0]}
        pointerEvents="none"
        center
      >
        <div
          ref={htmlDivRef}
          style={{
            opacity: 0,
            transition: 'opacity 120ms linear',
            width: 460,
            color: '#F5F5F7',
            fontFamily: 'var(--font-body), ui-sans-serif, system-ui, sans-serif',
            textAlign: 'center',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {htmlContent}
        </div>
      </Html>
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
          <Station
            key={s.id}
            curve={curve}
            station={s}
            htmlContent={<StationContent station={s} />}
          />
        ))}

        <CameraRig curve={curve} />
      </Canvas>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StationContent — the actual HTML projected at each station.
// Lives outside the Canvas tree but is rendered INTO it via drei <Html>.
// Uses inline styles so it doesn't depend on Tailwind being available inside
// the CSS3D context.
// ─────────────────────────────────────────────────────────────────────────────
function StationContent({ station }: { station: StationDef }) {
  return (
    <>
      <div
        style={{
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize:    13,
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
          color:       '#FFB547',
          marginBottom: 18,
          textShadow:  '0 0 12px rgba(255,181,71,0.5)',
        }}
      >
        {station.label}
      </div>

      <h2
        style={{
          fontFamily: 'var(--font-display), ui-sans-serif, system-ui, sans-serif',
          fontSize:    44,
          fontWeight:  800,
          lineHeight:  1.08,
          color:       '#F5F5F7',
          margin:      '0 0 18px',
          letterSpacing: '-0.01em',
        }}
      >
        {station.heading}
      </h2>

      <p
        style={{
          fontFamily: 'var(--font-body), ui-sans-serif, system-ui, sans-serif',
          fontSize:    16,
          lineHeight:  1.55,
          color:       '#C5C5CC',
          margin:      0,
          maxWidth:    420,
          marginLeft:  'auto',
          marginRight: 'auto',
        }}
      >
        {station.tagline}
      </p>

      {station.cta && (
        <div
          style={{
            marginTop:   22,
            fontFamily:  'var(--font-mono), ui-monospace, monospace',
            fontSize:    12,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color:       '#FFB547',
            display:     'inline-block',
            padding:     '10px 18px',
            border:      '1px solid rgba(255,181,71,0.4)',
            borderRadius: 4,
            textShadow:  '0 0 8px rgba(255,181,71,0.55)',
          }}
        >
          {station.cta.text}
        </div>
      )}
    </>
  )
}

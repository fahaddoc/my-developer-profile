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

import { useEffect, useLayoutEffect, useMemo, useRef, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects } from '@/data/projects'
import { type QualityPreset, PRESETS } from '@/lib/quality'

// Shared scroll progress — read each frame inside R3F, also subscribed via the
// useScrollProgress hook below for HUD/UI updates outside the canvas.
const scrollRef = { current: 0 }

// Tiny util: hex string ("#RRGGBB") → rgba string with alpha.
// Used by StationContent so glow shadows match each station's accent.
export function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

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
  id:          string
  label:       string                                // e.g. "00 · INTRO" (Html overlay)
  num:         string                                // e.g. "00" (top nav badge)
  short:       string                                // e.g. "INTRO" (top nav label)
  t:           number
  heading:     string
  tagline:     string
  color:       string                                // primary accent (hex)
  imageSrc?:   string
  cta?:        { text: string; href: string }
  // HUD chrome — station-aware overlay text
  subtitle:    string                                // bottom-left, under station number
  closer:      [string, string]                      // bottom-right, 2 lines
  traitsLeft:  [string, string, string]              // mid-left side callout
  traitsRight: [string, string, string]              // mid-right side callout
}

export const STATIONS: StationDef[] = [
  {
    id:        'hero',
    label:     '00 · INTRO',
    num:       '00',
    short:     'INTRO',
    t:         0.04,
    heading:   'Shah Fahad',
    tagline:   'Senior Software Engineer — React, Next.js, Flutter, WebRTC. Real-time experiences from Karachi, Pakistan.',
    color:     '#FFB547',
    imageSrc:  '/images/shah-fahad-sticker.png',
    subtitle:    'WELCOME TO MY TUNNEL',
    closer:      ['LET\'S BUILD', 'SOMETHING AMAZING'],
    traitsLeft:  ['PASSIONATE', 'ABOUT BUILDING', 'DIGITAL EXPERIENCES'],
    traitsRight: ['CLEAN CODE', 'PERFORMANCE', 'INNOVATION'],
  },
  {
    id:        'about',
    label:     '01 · ABOUT',
    num:       '01',
    short:     'ABOUT',
    t:         0.22,
    heading:   'Turning ideas into shipped products',
    tagline:   '6+ years · 4 companies · 9+ projects · 25+ clients. From MILETAP\'s real-time video platform to DigitalHire\'s hiring system.',
    color:     '#FFCB75',
    subtitle:    'FROM IDEAS TO PRODUCTS',
    closer:      ['6 YEARS', 'SHIPPING REAL-TIME'],
    traitsLeft:  ['DETAIL', 'CRAFT', 'CONSISTENCY'],
    traitsRight: ['SCALE', 'PERFORMANCE', 'ARCHITECTURE'],
  },
  {
    id:        'projects',
    label:     '02 · PROJECTS',
    num:       '02',
    short:     'PROJECTS',
    t:         0.42,
    heading:   'Featured work',
    tagline:   'Konnect.im video conferencing · DigitalHire SaaS · WhatsApp ChatBot Simulator · Agent Shah 3D portfolio game.',
    color:     '#FF9D45',
    cta:       { text: 'view case studies →', href: '#projects' },
    subtitle:    'FEATURED CASE STUDIES',
    closer:      ['10+ PROJECTS', 'LIVE IN PRODUCTION'],
    traitsLeft:  ['REAL-TIME', 'WEBRTC', 'SIGNALR'],
    traitsRight: ['REACT', 'NEXT.JS', 'FLUTTER'],
  },
  {
    id:        'experience',
    label:     '03 · EXPERIENCE',
    num:       '03',
    short:     'EXPERIENCE',
    t:         0.62,
    heading:   'Professional journey',
    tagline:   'DigitalHire (current) · MILETAP · E-Ocean · freelance & contract — frontend, real-time, mobile.',
    color:     '#E8A04A',
    subtitle:    'PROFESSIONAL JOURNEY',
    closer:      ['4 COMPANIES', '25+ CLIENTS'],
    traitsLeft:  ['STARTUPS', 'ENTERPRISE', 'AGENCIES'],
    traitsRight: ['SENIOR', 'CONTRACT', 'PRINCIPAL'],
  },
  {
    id:        'contact',
    label:     '04 · CONTACT',
    num:       '04',
    short:     'CONTACT',
    t:         0.86,
    heading:   "Let's build something",
    tagline:   'hello@shahfahad.dev · open to senior frontend & real-time roles, full-time and contract.',
    color:     '#FFD580',
    cta:       { text: 'book a 15-min call →', href: 'https://cal.com/shahfahad' },
    subtitle:    'LET\'S TALK',
    closer:      ['OPEN FOR', 'NEW ROLES'],
    traitsLeft:  ['RESPONSIVE', 'CLEAR', 'DIRECT'],
    traitsRight: ['REMOTE', 'HYBRID', 'ONSITE'],
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
// Tunnel: dark inner skin + concentric cross-section rings along the curve.
// Replaces the old TubeGeometry wireframe lattice (square cells) with proper
// circular rings perpendicular to the path — reads as a real tunnel with
// frames spaced into the distance. Rings rendered as a single InstancedMesh
// for one draw call regardless of count.
// ─────────────────────────────────────────────────────────────────────────────
function Tunnel({
  curve, ringCount,
}: {
  curve:     THREE.CatmullRomCurve3
  ringCount: number
}) {
  // Inner skin sits just inside the rings (radius 2.18 vs ring radius 2.20)
  // so no z-fighting. Provides occlusion + deep void inside the tunnel.
  const skinGeometry = useMemo(
    () => new THREE.TubeGeometry(curve, 240, 3.18, 36, false),
    [curve],
  )

  // Shared torus geometry — single buffer, many transforms via InstancedMesh.
  // Bigger ring (3.2) so the tunnel feels properly cavernous instead of cramped.
  const ringGeometry = useMemo(
    () => new THREE.TorusGeometry(3.2, 0.022, 8, 96),
    [],
  )

  const instRef = useRef<THREE.InstancedMesh>(null)

  // Set one transform matrix per ring on layout commit.
  // Each ring sits at curve.getPointAt(t), with its disc normal aligned to
  // the local tangent — so the ring is exactly the cross-section of the tube.
  useLayoutEffect(() => {
    if (!instRef.current) return
    const dummy = new THREE.Object3D()
    const pos   = new THREE.Vector3()
    const tan   = new THREE.Vector3()
    const tgt   = new THREE.Vector3()

    for (let i = 0; i <= ringCount; i++) {
      const t = i / ringCount
      curve.getPointAt(t, pos)
      curve.getTangentAt(t, tan)
      tgt.copy(pos).add(tan)

      dummy.position.copy(pos)
      dummy.lookAt(tgt)
      dummy.updateMatrix()
      instRef.current.setMatrixAt(i, dummy.matrix)
    }
    instRef.current.instanceMatrix.needsUpdate = true
  }, [curve, ringCount])

  return (
    <>
      {/* Inner skin — occlusion + deep void */}
      <mesh geometry={skinGeometry}>
        <meshBasicMaterial
          color="#0A0A12"
          side={THREE.BackSide}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Cross-section rings — single instanced draw call */}
      <instancedMesh
        ref={instRef}
        args={[ringGeometry, undefined, ringCount + 1]}
      >
        <meshBasicMaterial
          color="#FFB547"
          transparent
          opacity={0.78}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Station: ring + label at a curve point, oriented along the tangent.
// Proximity-based brightness: brightest when camera is at `t`, fades with
// |scrollRef - t|.
// ─────────────────────────────────────────────────────────────────────────────
function Station({
  curve, station,
}: {
  curve:   THREE.CatmullRomCurve3
  station: StationDef
}) {
  const { t, label } = station

  const groupRef     = useRef<THREE.Group>(null)
  const ringMatRef   = useRef<THREE.MeshBasicMaterial>(null)
  const dotMatRef    = useRef<THREE.MeshBasicMaterial>(null)
  const textMatRef   = useRef<THREE.Material | null>(null)

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

  // Proximity scrubbing — ring + dot + label fade with camera approach
  useFrame(() => {
    const dist      = Math.abs(scrollRef.current - t)
    const proximity = Math.max(0, 1 - dist / 0.10)
    const ringOp    = 0.18 + proximity * 0.82
    const textOp    = 0.25 + proximity * 0.75

    if (ringMatRef.current) ringMatRef.current.opacity = ringOp
    if (dotMatRef.current)  dotMatRef.current.opacity  = ringOp
    if (textMatRef.current) (textMatRef.current as THREE.MeshBasicMaterial).opacity = textOp

    if (groupRef.current) {
      const breath = 1 + proximity * 0.06
      groupRef.current.scale.setScalar(breath)
    }
  })

  return (
    <group ref={groupRef}>
      {/* Primary ring — sits just outside the main tunnel rings to read as
          a thicker accent at the station */}
      <mesh>
        <torusGeometry args={[3.35, 0.09, 10, 120]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={station.color}
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Secondary inner ring — smaller, dimmer, gives depth */}
      <mesh>
        <torusGeometry args={[2.95, 0.035, 8, 96]} />
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
          position={[Math.cos(angle) * 3.35, Math.sin(angle) * 3.35, 0]}
        >
          <sphereGeometry args={[0.12, 12, 12]} />
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
        position={[0, 2.35, 0.3]}
        fontSize={0.32}
        color={station.color}
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

      {/* Station content (calling card, stats, timeline, etc) is now rendered
          as flat HUD chrome via TunnelHUD <StationOverlay>, NOT in 3D space.
          Keeps the tunnel centre clear and prevents content from intersecting
          the rings as the camera passes through. */}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Particles — dust motes scattered along the tunnel volume.
// Generated once: sample points along the curve, jitter inside the tube radius,
// render as instanced points. Adds depth perception during fly-through.
// Subtle vertical bob driven by useFrame for "alive" feel.
// ─────────────────────────────────────────────────────────────────────────────
function Particles({
  curve, count = 320, bob = true,
}: {
  curve: THREE.CatmullRomCurve3
  count?: number
  bob?:   boolean
}) {
  // Geometry: BufferGeometry with `count` random points along + around the curve
  const { geometry, basePositions } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const bases     = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const t = Math.random()
      const p = curve.getPointAt(t)

      // Random offset inside the tube radius (~3 units, with margin)
      const angle  = Math.random() * Math.PI * 2
      const radius = 0.5 + Math.random() * 2.5

      // Need orthonormal basis at curve point for in-plane offset
      // Cheap approximation: use world XY plane (works because tunnel
      // doesn't pitch much, mostly varies in X/Y around Z)
      const offsetX = Math.cos(angle) * radius
      const offsetY = Math.sin(angle) * radius

      const x = p.x + offsetX
      const y = p.y + offsetY
      const z = p.z

      positions[i * 3 + 0] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      bases[i * 3 + 0] = x
      bases[i * 3 + 1] = y
      bases[i * 3 + 2] = z
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry: geo, basePositions: bases }
  }, [curve, count])

  const pointsRef = useRef<THREE.Points>(null)

  // Soft vertical bob to make particles feel alive — phase per particle
  // so they don't all bob in sync. Skipped entirely on low quality.
  useFrame(({ clock }) => {
    if (!bob || !pointsRef.current) return
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
    const t = clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const phase = i * 0.37
      positions[i * 3 + 1] = basePositions[i * 3 + 1] + Math.sin(t * 0.4 + phase) * 0.08
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.06}
        color="#FFE6B4"
        sizeAttenuation
        transparent
        opacity={0.65}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ProjectTiles — featured project thumbnails arranged around the PROJECTS
// station ring. Each tile is a textured plane facing the approaching camera.
// All tiles share proximity-based opacity scrub so they only appear near the
// station and bloom into view as camera approaches.
// ─────────────────────────────────────────────────────────────────────────────
function ProjectTiles({
  curve, stationT, bob = true,
}: {
  curve:    THREE.CatmullRomCurve3
  stationT: number
  bob?:     boolean
}) {
  // 9 projects across 3 orbital rings (3 per ring). Featured first.
  const pool = useMemo(() => {
    const sorted = [...projects].sort(
      (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false),
    )
    return sorted.slice(0, 9)
  }, [])

  const textures = useTexture(pool.map((p) => p.image))

  const groupRef = useRef<THREE.Group>(null)
  const sunRef   = useRef<THREE.MeshBasicMaterial>(null)
  const sunGlowRef = useRef<THREE.MeshBasicMaterial>(null)
  const ringMatsRef = useRef<(THREE.MeshBasicMaterial | null)[]>([])

  // Three orbital rings — each its own group so we can rotate them at
  // different angular velocities (inner = fastest, outer = slowest).
  const ringRefs = useRef<(THREE.Group | null)[]>([null, null, null])

  // Per-orbital-ring radii (in world units inside the tunnel; tunnel r=3.2)
  const RING_RADII  = [1.20, 1.95, 2.65]
  const RING_SPEEDS = [0.18, 0.10, -0.06]  // outer reverses for visual interest
  const TILE_SCALES = [0.55, 0.72, 0.85]   // inner smaller, outer larger

  const matsRef       = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const borderMatsRef = useRef<(THREE.MeshBasicMaterial | null)[]>([])

  // Place + orient group at the projects station
  useEffect(() => {
    if (!groupRef.current) return
    const pos     = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    curve.getPointAt(stationT, pos)
    curve.getTangentAt(stationT, tangent)
    groupRef.current.position.copy(pos)
    groupRef.current.lookAt(pos.clone().sub(tangent))
  }, [curve, stationT])

  useFrame(({ camera }, dt) => {
    const dist      = Math.abs(scrollRef.current - stationT)
    const proximity = Math.max(0, 1 - dist / 0.13)
    const opacity   = Math.pow(proximity, 1.4)

    matsRef.current.forEach((m) => { if (m) m.opacity = opacity })
    borderMatsRef.current.forEach((m) => { if (m) m.opacity = opacity * 0.85 })
    ringMatsRef.current.forEach((m) => { if (m) m.opacity = opacity * 0.18 })
    if (sunRef.current)     sunRef.current.opacity     = opacity
    if (sunGlowRef.current) sunGlowRef.current.opacity = opacity * 0.55

    // Rotate each orbital ring at its own speed
    if (bob) {
      ringRefs.current.forEach((g, i) => {
        if (g) g.rotation.z += dt * RING_SPEEDS[i]
      })
    }

    // Billboard each tile to face camera (tiles stay readable while orbit spins)
    if (groupRef.current) {
      groupRef.current.traverse((obj) => {
        if (obj.userData?.tile) {
          obj.lookAt(camera.position)
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      {/* Solar system pushed DOWN-PATH in the group's local frame so the
          camera approaches it from a distance instead of flying through it.
          Group's -Z = downstream direction (away from upstream-facing camera).
          Offset z=-4 keeps the sun + tiles visible as camera nears stationT
          and gracefully falls behind once camera passes through. */}
      <group position={[0, 0, -4]}>
      {/* ─── Central sun (the focus of the scene) ───────────────────────── */}
      {/* Outer halo — very faint, large, blooms heavily for that solar corona */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial
          ref={sunGlowRef}
          color="#FFB547"
          transparent
          opacity={0}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Inner core — bright cream sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.7, 48, 48]} />
        <meshBasicMaterial
          ref={sunRef}
          color="#FFE6B4"
          transparent
          opacity={0}
          toneMapped={false}
        />
      </mesh>

      {/* ─── Faint orbital path rings (visual anchors) ──────────────────── */}
      {RING_RADII.map((r, i) => (
        <mesh key={`path-${i}`} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.005, 4, 96]} />
          <meshBasicMaterial
            ref={(m) => { ringMatsRef.current[i] = m }}
            color="#FFB547"
            transparent
            opacity={0}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* ─── 3 orbital rings, 3 tiles each ─────────────────────────────── */}
      {[0, 1, 2].map((ringIdx) => (
        <group
          key={`ring-${ringIdx}`}
          ref={(g) => { ringRefs.current[ringIdx] = g }}
        >
          {pool.slice(ringIdx * 3, ringIdx * 3 + 3).map((p, slot) => {
            const i = ringIdx * 3 + slot
            const angle = (slot / 3) * Math.PI * 2 + (ringIdx * Math.PI / 5)
            const radius = RING_RADII[ringIdx]
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            const scl = TILE_SCALES[ringIdx]
            const tileW = 1.05 * scl
            const tileH = 0.66 * scl

            return (
              <group
                key={p.id}
                position={[x, y, 0]}
                userData={{ tile: true }}
              >
                {/* Coloured border behind image */}
                <mesh position={[0, 0, -0.01]}>
                  <planeGeometry args={[tileW * 1.06, tileH * 1.10]} />
                  <meshBasicMaterial
                    ref={(m) => { borderMatsRef.current[i] = m }}
                    color={p.color}
                    transparent
                    opacity={0}
                    toneMapped={false}
                  />
                </mesh>
                {/* Project thumbnail */}
                <mesh>
                  <planeGeometry args={[tileW, tileH]} />
                  <meshBasicMaterial
                    ref={(m) => { matsRef.current[i] = m }}
                    map={textures[i]}
                    transparent
                    opacity={0}
                    toneMapped={false}
                  />
                </mesh>
                {/* Title caption */}
                <Text
                  position={[0, -tileH * 0.72, 0]}
                  fontSize={0.06}
                  color={p.color}
                  anchorX="center"
                  anchorY="middle"
                  letterSpacing={0.1}
                  maxWidth={tileW * 1.15}
                  outlineColor="#0A0A0A"
                  outlineWidth={0.003}
                >
                  {p.title.toUpperCase()}
                </Text>
              </group>
            )
          })}
        </group>
      ))}
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CameraRig: places camera along curve and adds a SUBTLE bank into turns.
// Default up = world +Y so the world stays right-side-up. A small roll around
// the forward axis is added based on how much the tangent is turning in the
// horizontal plane — like an aircraft leaning into a curve. ±~10° max.
// ─────────────────────────────────────────────────────────────────────────────
function CameraRig({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const posVec       = useMemo(() => new THREE.Vector3(),     [])
  const lookVec      = useMemo(() => new THREE.Vector3(),     [])
  const tanNow       = useMemo(() => new THREE.Vector3(),     [])
  const tanAhead     = useMemo(() => new THREE.Vector3(),     [])
  const forwardVec   = useMemo(() => new THREE.Vector3(),     [])
  const upVec        = useMemo(() => new THREE.Vector3(0,1,0),[])
  const rollQuat     = useMemo(() => new THREE.Quaternion(),  [])
  const smoothRef    = useRef(0)
  const smoothRollRef = useRef(0)

  useFrame(({ camera }) => {
    smoothRef.current += (scrollRef.current - smoothRef.current) * 0.12

    const t     = Math.min(0.999,  Math.max(0, smoothRef.current))
    const tNext = Math.min(0.9999, t + 0.005)

    curve.getPointAt(t,      posVec)
    curve.getPointAt(tNext,  lookVec)
    curve.getTangentAt(t,    tanNow)
    curve.getTangentAt(Math.min(0.999, t + 0.02), tanAhead)

    // Lean angle from horizontal tangent change. Positive X-delta = curve
    // bending right → roll right.
    const deltaX     = tanAhead.x - tanNow.x
    const targetRoll = THREE.MathUtils.clamp(deltaX * 6, -0.18, 0.18)
    smoothRollRef.current += (targetRoll - smoothRollRef.current) * 0.05

    // Build up vector: world +Y rotated by smoothRoll around forward axis
    forwardVec.copy(lookVec).sub(posVec).normalize()
    upVec.set(0, 1, 0)
    rollQuat.setFromAxisAngle(forwardVec, smoothRollRef.current)
    upVec.applyQuaternion(rollQuat)

    camera.up.copy(upVec)
    camera.position.copy(posVec)
    camera.lookAt(lookVec)
  })

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component — Canvas + scroll wiring + tunnel + stations
// ─────────────────────────────────────────────────────────────────────────────
export function TunnelScene({ preset = PRESETS.high }: { preset?: QualityPreset } = {}) {
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

        <Tunnel curve={curve} ringCount={preset.tubeSegments} />
        <Particles curve={curve} count={preset.particleCount} bob={preset.tileBob} />

        {STATIONS.map((s) => (
          <Station key={s.id} curve={curve} station={s} />
        ))}

        <Suspense fallback={null}>
          <ProjectTiles
            curve={curve}
            stationT={STATIONS.find((s) => s.id === 'projects')!.t}
            bob={preset.tileBob}
          />
        </Suspense>

        <CameraRig curve={curve} />

        {/* Post-processing only on mid/high quality */}
        {preset.bloom && (
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={preset.bloomIntensity}
              luminanceThreshold={0.25}
              luminanceSmoothing={0.4}
              mipmapBlur
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}


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

import { useEffect, useLayoutEffect, useMemo, useRef, useState, Suspense, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Html, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects, experience } from '@/data/projects'
import { type QualityPreset, PRESETS } from '@/lib/quality'

// Shared scroll progress — read each frame inside R3F, also subscribed via the
// useScrollProgress hook below for HUD/UI updates outside the canvas.
const scrollRef = { current: 0 }

// Tiny util: hex string ("#RRGGBB") → rgba string with alpha.
// Used by StationContent so glow shadows match each station's accent.
function hexAlpha(hex: string, alpha: number): string {
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
    () => new THREE.TorusGeometry(3.2, 0.018, 8, 96),
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
          opacity={0.55}
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

      {/* HTML content overlay — projected in 3D space, transform mode follows
          group orientation, distanceFactor scales naturally with camera approach.
          Slightly off-axis so it doesn't sit dead-centre in the ring. */}
      <Html
        transform
        position={[0, -0.45, -0.05]}
        distanceFactor={5.0}
        zIndexRange={[10, 0]}
        pointerEvents="none"
        center
      >
        <div
          ref={htmlDivRef}
          style={{
            opacity: 0,
            transition: 'opacity 120ms linear',
            width: 540,
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
  const featured = useMemo(
    () => projects.filter((p) => p.featured).slice(0, 3),
    [],
  )

  // Pre-load all featured textures (Suspense will block until ready)
  const textures = useTexture(featured.map((p) => p.image))

  const groupRef = useRef<THREE.Group>(null)
  const matsRef  = useRef<THREE.MeshBasicMaterial[]>([])
  const borderMatsRef = useRef<THREE.MeshBasicMaterial[]>([])
  const linkRefs       = useRef<HTMLAnchorElement[]>([])

  // Place + orient group at the projects station — same convention as the
  // Station component (faces upstream so tiles face the approaching camera).
  useEffect(() => {
    if (!groupRef.current) return
    const pos     = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    curve.getPointAt(stationT, pos)
    curve.getTangentAt(stationT, tangent)
    groupRef.current.position.copy(pos)
    groupRef.current.lookAt(pos.clone().sub(tangent))
  }, [curve, stationT])

  // Proximity scrub — tiles fade in faster than ring/label so they "rise" out
  // of nowhere as user nears the projects station, then fade as they leave
  useFrame((_, dt) => {
    const dist      = Math.abs(scrollRef.current - stationT)
    const proximity = Math.max(0, 1 - dist / 0.13)
    const opacity   = Math.pow(proximity, 1.4)

    matsRef.current.forEach((m) => {
      if (m) m.opacity = opacity
    })
    borderMatsRef.current.forEach((m) => {
      if (m) m.opacity = opacity * 0.85
    })
    // Sharper proximity gate on the clickable VIEW link so it only appears
    // when user is actually at the station and not earlier/later
    const linkOp = Math.pow(proximity, 2.2)
    linkRefs.current.forEach((a) => {
      if (a) {
        a.style.opacity = linkOp.toFixed(3)
        // disable clicks when link is mostly transparent
        a.style.pointerEvents = linkOp > 0.4 ? 'auto' : 'none'
      }
    })

    // Subtle Y-bob per tile for organic floating (skipped on low quality)
    if (bob && groupRef.current) {
      groupRef.current.children.forEach((tile, i) => {
        const phase = i * 1.7
        const t = performance.now() * 0.001
        tile.position.y = tile.userData.baseY + Math.sin(t * 0.7 + phase) * 0.06
      })
    }

    // dt unused; keeping arg name for clarity
    void dt
  })

  return (
    <group ref={groupRef}>
      {featured.map((p, i) => {
        // 3 tiles evenly spaced around the ring (top, lower-left, lower-right)
        const angle  = (i / featured.length) * Math.PI * 2 + Math.PI / 2  // start top
        const radius = 2.55
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius

        return (
          <group
            key={p.id}
            position={[x, y, 0.4]}
            userData={{ baseY: y }}
          >
            {/* Coloured border plane — slightly larger, behind the image */}
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[1.32, 0.86]} />
              <meshBasicMaterial
                ref={(m) => { if (m) borderMatsRef.current[i] = m }}
                color={p.color}
                transparent
                opacity={0}
                toneMapped={false}
              />
            </mesh>

            {/* The thumbnail image */}
            <mesh>
              <planeGeometry args={[1.25, 0.78]} />
              <meshBasicMaterial
                ref={(m) => { if (m) matsRef.current[i] = m }}
                map={textures[i]}
                transparent
                opacity={0}
                toneMapped={false}
              />
            </mesh>

            {/* Tiny label below the tile */}
            <Text
              position={[0, -0.55, 0]}
              fontSize={0.085}
              color={p.color}
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.1}
              maxWidth={1.3}
              outlineColor="#0A0A0A"
              outlineWidth={0.004}
            >
              {p.title.toUpperCase()}
            </Text>

            {/* Clickable case-study link — only interactive when near station */}
            <Html
              transform
              position={[0, -0.75, 0.05]}
              distanceFactor={5.0}
              pointerEvents="auto"
              center
            >
              <a
                ref={(el) => { if (el) linkRefs.current[i] = el }}
                href={`/projects/${p.id}`}
                style={{
                  display:       'inline-block',
                  padding:       '5px 12px',
                  fontFamily:    'var(--font-mono), ui-monospace, monospace',
                  fontSize:      9,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  fontWeight:    700,
                  color:         p.color,
                  background:    'rgba(10,8,4,0.65)',
                  border:        `1px solid ${p.color}aa`,
                  borderRadius:  3,
                  textDecoration: 'none',
                  textShadow:    `0 0 6px ${p.color}88`,
                  boxShadow:     `0 0 14px ${p.color}33`,
                  whiteSpace:    'nowrap',
                  opacity:       0,
                  transition:    'transform 180ms, box-shadow 180ms',
                  pointerEvents: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08)'
                  e.currentTarget.style.boxShadow = `0 0 22px ${p.color}77`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = `0 0 14px ${p.color}33`
                }}
              >
                view case →
              </a>
            </Html>
          </group>
        )
      })}
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
          <Station
            key={s.id}
            curve={curve}
            station={s}
            htmlContent={<StationContent station={s} />}
          />
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

// ─────────────────────────────────────────────────────────────────────────────
// StationContent — the actual HTML projected at each station.
// Lives outside the Canvas tree but is rendered INTO it via drei <Html>.
// Uses inline styles so it doesn't depend on Tailwind being available inside
// the CSS3D context.
// ─────────────────────────────────────────────────────────────────────────────
function StationContent({ station }: { station: StationDef }) {
  // Each station gets its own bespoke layout to mirror its section's purpose.
  switch (station.id) {
    case 'hero':       return <HeroIntroCard  station={station} />
    case 'about':      return <AboutCard      station={station} />
    case 'projects':   return <ProjectsCard   station={station} />
    case 'experience': return <ExperienceCard station={station} />
    case 'contact':    return <ContactCard    station={station} />
  }
  return <DefaultCard station={station} />
}

// Fallback layout — kept for safety if a new station ever lands without a card
function DefaultCard({ station }: { station: StationDef }) {
  return (
    <>
      <div style={LabelStyle(station.color)}>{station.label}</div>
      <h2 style={HeadingStyle}>{station.heading}</h2>
      <p style={TaglineStyle}>{station.tagline}</p>
    </>
  )
}

// ── Shared style tokens (kept as objects so per-card style stays terse) ─────
const LabelStyle = (color: string) => ({
  fontFamily:    'var(--font-mono), ui-monospace, monospace',
  fontSize:      12,
  letterSpacing: '0.32em',
  textTransform: 'uppercase' as const,
  color,
  marginBottom:  16,
  textShadow:    `0 0 12px ${hexAlpha(color, 0.5)}`,
})

const HeadingStyle = {
  fontFamily:    'var(--font-display), ui-sans-serif, system-ui, sans-serif',
  fontSize:      40,
  fontWeight:    800 as const,
  lineHeight:    1.1,
  color:         '#F5F5F7',
  margin:        '0 0 16px',
  letterSpacing: '-0.01em',
}

const TaglineStyle = {
  fontFamily: 'var(--font-body), ui-sans-serif, system-ui, sans-serif',
  fontSize:   15,
  lineHeight: 1.55,
  color:      '#C5C5CC',
  margin:     0,
  maxWidth:   460,
  marginLeft:  'auto',
  marginRight: 'auto',
}

const CtaStyle = (color: string) => ({
  marginTop:     20,
  fontFamily:    'var(--font-mono), ui-monospace, monospace',
  fontSize:      11,
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color,
  display:       'inline-block',
  padding:       '10px 18px',
  border:        `1px solid ${hexAlpha(color, 0.4)}`,
  borderRadius:  4,
  textShadow:    `0 0 8px ${hexAlpha(color, 0.55)}`,
})

// ─────────────────────────────────────────────────────────────────────────────
// HeroIntroCard — the calling-card layout for the INTRO station.
// Circular portrait with neon ring, big two-tone "Shah Fahad" name,
// role line, tech stack, tagline with accent-coloured location.
// ─────────────────────────────────────────────────────────────────────────────
function HeroIntroCard({ station }: { station: StationDef }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={station.imageSrc}
        alt="Shah Fahad"
        style={{
          width:        180,
          height:       180,
          objectFit:    'contain',
          margin:       '0 auto 24px',
          display:      'block',
          filter:       `drop-shadow(0 0 18px ${hexAlpha(station.color, 0.6)}) drop-shadow(0 0 6px ${hexAlpha(station.color, 0.4)})`,
          userSelect:   'none',
          pointerEvents: 'none',
        }}
      />

      {/* Big two-tone name */}
      <h1
        style={{
          fontFamily: 'var(--font-display), ui-sans-serif, system-ui, sans-serif',
          fontSize:    72,
          fontWeight:  800,
          lineHeight:  1,
          margin:      '0 0 12px',
          letterSpacing: '-0.02em',
        }}
      >
        <span style={{ color: '#F5F5F7' }}>Shah</span>
        <span style={{ color: '#F5F5F7' }}> </span>
        <span style={{
          color: station.color,
          textShadow: `0 0 16px ${hexAlpha(station.color, 0.5)}`,
        }}>
          Fahad
        </span>
      </h1>

      {/* Role */}
      <p
        style={{
          fontFamily: 'var(--font-body), ui-sans-serif, system-ui, sans-serif',
          fontSize:    18,
          margin:      '0 0 22px',
          color:       'rgba(245,245,247,0.7)',
          letterSpacing: '0.01em',
        }}
      >
        Senior Software Engineer
      </p>

      {/* Tech stack */}
      <p
        style={{
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize:    13,
          margin:      '0 0 14px',
          color:       '#F5F5F7',
          letterSpacing: '0.06em',
        }}
      >
        React · Next.js · Flutter · WebRTC
      </p>

      {/* Tagline with accent location */}
      <p
        style={{
          fontFamily: 'var(--font-body), ui-sans-serif, system-ui, sans-serif',
          fontSize:    14,
          margin:      0,
          color:       'rgba(245,245,247,0.6)',
        }}
      >
        Real-time experiences from{' '}
        <span style={{
          color: station.color,
          textShadow: `0 0 8px ${hexAlpha(station.color, 0.5)}`,
        }}>
          Karachi, Pakistan.
        </span>
      </p>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AboutCard — 4-stat grid + bio + tech badges
// ─────────────────────────────────────────────────────────────────────────────
function AboutCard({ station }: { station: StationDef }) {
  const stats = [
    { value: '6+',  label: 'YEARS'     },
    { value: '4',   label: 'COMPANIES' },
    { value: '9+',  label: 'PROJECTS'  },
    { value: '25+', label: 'CLIENTS'   },
  ]
  const badges = ['React', 'Next.js', 'TypeScript', 'Flutter', 'WebRTC', 'SignalR']
  return (
    <>
      <div style={LabelStyle(station.color)}>{station.label}</div>
      <h2 style={HeadingStyle}>{station.heading}</h2>

      {/* 4-stat grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8, margin: '20px auto 22px', maxWidth: 440,
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            padding: '12px 4px',
            borderTop: `1px solid ${hexAlpha(station.color, 0.35)}`,
          }}>
            <div style={{
              fontFamily: 'var(--font-display), system-ui, sans-serif',
              fontSize:   30, fontWeight: 800, color: '#F5F5F7',
              lineHeight: 1, letterSpacing: '-0.02em',
            }}>{s.value}</div>
            <div style={{
              marginTop: 4,
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 9, letterSpacing: '0.28em',
              color: 'rgba(245,245,247,0.55)',
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      <p style={{ ...TaglineStyle, fontSize: 14, marginBottom: 18 }}>
        From MILETAP&apos;s real-time video platform to DigitalHire&apos;s hiring system.
        Every line of code taught me something I couldn&apos;t find in a tutorial.
      </p>

      {/* Tech badges */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        maxWidth: 460, margin: '0 auto',
      }}>
        {badges.map((b) => (
          <span key={b} style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'rgba(245,245,247,0.7)',
            padding: '4px 10px',
            border: `1px solid ${hexAlpha(station.color, 0.28)}`,
            borderRadius: 3,
          }}>{b}</span>
        ))}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ProjectsCard — minimal heading + tagline; the 3D ProjectTiles around the
// station ring carry the actual project visuals.
// ─────────────────────────────────────────────────────────────────────────────
function ProjectsCard({ station }: { station: StationDef }) {
  return (
    <>
      <div style={LabelStyle(station.color)}>{station.label}</div>
      <h2 style={HeadingStyle}>{station.heading}</h2>
      <p style={{ ...TaglineStyle, marginBottom: 14, maxWidth: 420 }}>
        Real-time, video, mobile, AI — production code across SaaS, agencies and freelance.
      </p>
      <p style={{
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: hexAlpha(station.color, 0.65),
        margin: 0,
      }}>
        ↑ tap any thumbnail
      </p>
      {station.cta && (
        <div style={{ ...CtaStyle(station.color), marginTop: 18 }}>
          {station.cta.text}
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExperienceCard — compact timeline list with company / role / period
// ─────────────────────────────────────────────────────────────────────────────
function ExperienceCard({ station }: { station: StationDef }) {
  // Reduce to top 3 entries so card stays compact
  const entries = experience.slice(0, 3)
  return (
    <>
      <div style={LabelStyle(station.color)}>{station.label}</div>
      <h2 style={{ ...HeadingStyle, fontSize: 36, marginBottom: 22 }}>{station.heading}</h2>

      <ul style={{
        listStyle: 'none', padding: 0, margin: '0 auto',
        maxWidth: 480, textAlign: 'left',
      }}>
        {entries.map((e) => (
          <li key={e.id} style={{
            padding: '12px 0',
            borderTop: `1px solid ${hexAlpha(station.color, 0.22)}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16,
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase',
                color: station.color,
                marginBottom: 4,
              }}>{e.company}</div>
              <div style={{
                fontFamily: 'var(--font-display), system-ui, sans-serif',
                fontSize: 16, fontWeight: 700, color: '#F5F5F7',
              }}>{e.role}</div>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 10, letterSpacing: '0.16em',
              color: 'rgba(245,245,247,0.55)',
              whiteSpace: 'nowrap',
            }}>
              {e.period}{e.current && ' · NOW'}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactCard — channels + dual CTA
// ─────────────────────────────────────────────────────────────────────────────
function ContactCard({ station }: { station: StationDef }) {
  return (
    <>
      <div style={LabelStyle(station.color)}>{station.label}</div>
      <h2 style={HeadingStyle}>{station.heading}</h2>

      <div style={{
        margin: '16px auto 22px', maxWidth: 380,
        display: 'flex', flexDirection: 'column', gap: 6,
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 13, letterSpacing: '0.08em',
      }}>
        <span style={{ color: '#F5F5F7' }}>hello@shahfahad.dev</span>
        <span style={{ color: 'rgba(245,245,247,0.6)' }}>+92 304 2186009</span>
        <span style={{ color: 'rgba(245,245,247,0.6)' }}>Karachi, Pakistan</span>
      </div>

      <div style={{
        display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap',
      }}>
        <span style={CtaStyle(station.color)}>book a 15-min call →</span>
        <span style={{
          ...CtaStyle(station.color),
          color: '#F5F5F7',
          border: '1px solid rgba(245,245,247,0.25)',
          textShadow: 'none',
        }}>
          hello@shahfahad.dev →
        </span>
      </div>
    </>
  )
}

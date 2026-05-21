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

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Html, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects } from '@/data/projects'
import { type QualityPreset, PRESETS } from '@/lib/quality'
import { FlipPhotoCard } from '@/components/r3f/FlipPhotoCard'

// Shared scroll progress — read each frame inside R3F, also subscribed via the
// useScrollProgress hook below for HUD/UI updates outside the canvas.
//
// dynamic() imports give chunks their own module copy, so simple imports of
// `scrollRef` across HUD/scene weren't seeing each other. We funnel everything
// through window: __scrollRef is the live ref, and a custom 'tunnel-progress'
// event fires whenever it changes so React components in any bundle re-render.
const TUNNEL_EVENT = 'tunnel-progress'
const scrollRef = { current: 0 }
function publishProgress(p: number) {
  scrollRef.current = p
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TUNNEL_EVENT, { detail: p }))
  }
}
if (typeof window !== 'undefined') {
  (window as unknown as { __scrollRef?: typeof scrollRef }).__scrollRef = scrollRef
}

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
    color:     '#5EEAD4',
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
    color:     '#5EEAD4',
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
    color:     '#5EEAD4',
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
    color:     '#5EEAD4',
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
    color:     '#5EEAD4',
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
  const skinGeometry = useMemo(
    () => new THREE.TubeGeometry(curve, 240, 3.18, 36, false),
    [curve],
  )

  // Replace solid TorusGeometry rings with a "string-of-lights" look:
  // each ring becomes DOTS_PER_RING points around the tube circumference,
  // with thin amber lines connecting adjacent dots in the same ring.
  // Constellation aesthetic — matches the user's reference image.
  const DOTS_PER_RING = 18
  const RING_RADIUS   = 3.2

  const { dotsGeometry, lineGeometry } = useMemo(() => {
    const frames    = curve.computeFrenetFrames(ringCount, false)
    const dots      = new Float32Array((ringCount + 1) * DOTS_PER_RING * 3)
    const linePairs: number[] = []
    const pos       = new THREE.Vector3()

    for (let r = 0; r <= ringCount; r++) {
      const t        = r / ringCount
      const normal   = frames.normals[r]   || frames.normals[0]
      const binormal = frames.binormals[r] || frames.binormals[0]
      curve.getPointAt(t, pos)

      const ringStart = r * DOTS_PER_RING

      for (let d = 0; d < DOTS_PER_RING; d++) {
        const angle = (d / DOTS_PER_RING) * Math.PI * 2
        const cos   = Math.cos(angle) * RING_RADIUS
        const sin   = Math.sin(angle) * RING_RADIUS

        const px = pos.x + normal.x * cos + binormal.x * sin
        const py = pos.y + normal.y * cos + binormal.y * sin
        const pz = pos.z + normal.z * cos + binormal.z * sin

        const idx = (ringStart + d) * 3
        dots[idx]     = px
        dots[idx + 1] = py
        dots[idx + 2] = pz
      }

      // Connect adjacent dots in this ring with line segments (closed loop)
      for (let d = 0; d < DOTS_PER_RING; d++) {
        const a = (ringStart + d) * 3
        const b = (ringStart + ((d + 1) % DOTS_PER_RING)) * 3
        linePairs.push(
          dots[a], dots[a + 1], dots[a + 2],
          dots[b], dots[b + 1], dots[b + 2],
        )
      }
    }

    const dg = new THREE.BufferGeometry()
    dg.setAttribute('position', new THREE.BufferAttribute(dots, 3))

    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePairs), 3))

    return { dotsGeometry: dg, lineGeometry: lg }
  }, [curve, ringCount])

  const dotTexture = useMemo(() => getSparkleTexture(), [])

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

      {/* Ring dots — string-of-lights pattern around each ring perimeter */}
      <points geometry={dotsGeometry}>
        <pointsMaterial
          size={0.16}
          color="#5EEAD4"
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          map={dotTexture ?? undefined}
          alphaTest={0.02}
        />
      </points>

      {/* Thin lines stitching adjacent dots in each ring */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial
          color="#5EEAD4"
          transparent
          opacity={0.35}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
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
          color="#C6F8EE"
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
            color="#E5FFF8"
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Floating label above the ring — sequence number stripped (just the
          short name, e.g. INTRO / ABOUT). Troika colorRanges paints the
          second character white while the rest stays in the station accent. */}
      <Text
        position={[0, 2.35, 0.3]}
        fontSize={0.32}
        color={station.color}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        outlineColor="#1A0E00"
        outlineWidth={0.012}
        // @ts-expect-error — drei passes unknown props through to troika-three-text
        colorRanges={{ 0: station.color, 1: '#FFFFFF', 2: station.color }}
        onUpdate={(self) => {
          if (!textMatRef.current && self.material) {
            textMatRef.current = self.material as THREE.Material
            ;(self.material as THREE.MeshBasicMaterial).transparent = true
          }
        }}
      >
        {station.short}
      </Text>

      {/* Station content (calling card, stats, timeline, etc) is now rendered
          as flat HUD chrome via TunnelHUD <StationOverlay>, NOT in 3D space.
          Keeps the tunnel centre clear and prevents content from intersecting
          the rings as the camera passes through. */}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkle texture — soft radial gradient on a canvas, painted once and
// re-used by the Particles material. Turns the default square gl.POINTS sprite
// into a soft round star with falloff. Cached at module scope.
// ─────────────────────────────────────────────────────────────────────────────
let _sparkleTexture: THREE.Texture | null = null
function getSparkleTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  if (_sparkleTexture) return _sparkleTexture
  const c   = document.createElement('canvas')
  c.width   = 128
  c.height  = 128
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0,    'rgba(240, 255, 250, 1)')
  grad.addColorStop(0.15, 'rgba(180, 245, 235, 0.9)')
  grad.addColorStop(0.5,  'rgba(94, 234, 212, 0.35)')
  grad.addColorStop(1,    'rgba(94, 234, 212, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  _sparkleTexture = tex
  return tex
}

// ─────────────────────────────────────────────────────────────────────────────
// Particles — sparkling stars scattered through the tunnel volume.
// Per-particle position, base size, and phase (for twinkle) are stored on the
// geometry. A small shader varies point size + alpha by time on the GPU so
// every star pulses with its own rhythm.
// ─────────────────────────────────────────────────────────────────────────────
function Particles({
  curve, count = 320, bob = true,
}: {
  curve: THREE.CatmullRomCurve3
  count?: number
  bob?:   boolean
}) {
  // Stars no longer bob — constellation lines need stable endpoints.
  void bob

  const { geometry, lineGeometry } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes     = new Float32Array(count)
    const phases    = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const t = Math.random()
      const p = curve.getPointAt(t)

      const angle  = Math.random() * Math.PI * 2
      const radius = 0.5 + Math.random() * 2.5
      const offsetX = Math.cos(angle) * radius
      const offsetY = Math.sin(angle) * radius

      positions[i * 3 + 0] = p.x + offsetX
      positions[i * 3 + 1] = p.y + offsetY
      positions[i * 3 + 2] = p.z

      // Smaller dots (was 0.14–0.36) so the constellation reads as points,
      // not the previous stretched diamonds.
      sizes[i]  = 0.08 + Math.random() * 0.10
      phases[i] = Math.random() * Math.PI * 2
    }

    // Find pairs of nearby stars and connect them — sparse constellation
    // strands. Threshold tuned so most stars get 1–3 connections; pure noise.
    const CONNECT  = 1.4
    const MAX_PER  = 3   // cap connections per star to avoid hub explosions
    const pairs: number[] = []
    const degree   = new Int32Array(count)
    for (let i = 0; i < count; i++) {
      if (degree[i] >= MAX_PER) continue
      const x1 = positions[i * 3]
      const y1 = positions[i * 3 + 1]
      const z1 = positions[i * 3 + 2]
      for (let j = i + 1; j < count; j++) {
        if (degree[j] >= MAX_PER) continue
        const x2 = positions[j * 3]
        const y2 = positions[j * 3 + 1]
        const z2 = positions[j * 3 + 2]
        const d  = Math.hypot(x1 - x2, y1 - y2, z1 - z2)
        if (d > 0 && d < CONNECT) {
          pairs.push(x1, y1, z1, x2, y2, z2)
          degree[i]++; degree[j]++
          if (degree[i] >= MAX_PER) break
        }
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1))

    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pairs), 3))

    return { geometry: geo, lineGeometry: lineGeo }
  }, [curve, count])

  const pointsRef = useRef<THREE.Points>(null)
  const matRef    = useRef<THREE.ShaderMaterial>(null)
  const texture   = useMemo(() => getSparkleTexture(), [])

  // Drive twinkle uniform only — positions are static so the constellation
  // line endpoints stay glued to the dots.
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <>
      <points ref={pointsRef} geometry={geometry}>
        <shaderMaterial
          ref={matRef}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          uniforms={{
            uTime:    { value: 0 },
            uMap:     { value: texture },
            uPxScale: { value: 600 },
          }}
          vertexShader={`
            attribute float aSize;
            attribute float aPhase;
            uniform float uTime;
            uniform float uPxScale;
            varying float vAlpha;
            void main() {
              float tw = 0.5 + 0.5 * sin(uTime * 2.0 + aPhase);
              vAlpha = 0.55 + 0.45 * tw;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_Position = projectionMatrix * mvPosition;
              float size = aSize * (0.8 + 0.6 * tw);
              gl_PointSize = size * uPxScale / -mvPosition.z;
            }
          `}
          fragmentShader={`
            uniform sampler2D uMap;
            varying float vAlpha;
            void main() {
              vec4 tex = texture2D(uMap, gl_PointCoord);
              if (tex.a < 0.02) discard;
              gl_FragColor = vec4(tex.rgb, tex.a * vAlpha);
            }
          `}
        />
      </points>

      {/* Constellation strands — thin lines between nearby stars */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial
          color="#5EEAD4"
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </>
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
  const router    = useRouter()

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

  // Track which tile is hovered (-1 = none). Reused vectors so the hover
  // animation doesn't allocate per frame.
  const hoveredRef    = useRef<number>(-1)
  const lastScrollRef = useRef<number>(0)
  const tmpDir        = useMemo(() => new THREE.Vector3(), [])
  const tmpWorld      = useMemo(() => new THREE.Vector3(), [])
  const tmpLocal      = useMemo(() => new THREE.Vector3(), [])
  const REST_ORIGIN   = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  // Per-tile scale lerp state (rest=1, hovered ~1.8)
  const scaleRef = useRef<number[]>(Array.from({ length: 9 }, () => 1))

  useFrame(({ camera }, dt) => {
    const dist      = Math.abs(scrollRef.current - stationT)
    const proximity = Math.max(0, 1 - dist / 0.13)
    const opacity   = Math.pow(proximity, 1.4)

    matsRef.current.forEach((m) => { if (m) m.opacity = opacity })
    borderMatsRef.current.forEach((m) => { if (m) m.opacity = opacity * 0.85 })
    ringMatsRef.current.forEach((m) => { if (m) m.opacity = opacity * 0.18 })
    if (sunRef.current)     sunRef.current.opacity     = opacity
    if (sunGlowRef.current) sunGlowRef.current.opacity = opacity * 0.55

    // Pause orbital rings while a tile is hovered so it doesn't drift away
    const anyHover = hoveredRef.current !== -1
    if (bob && !anyHover) {
      ringRefs.current.forEach((g, i) => {
        if (g) g.rotation.z += dt * RING_SPEEDS[i]
      })
    }

    // Release the hovered tile when the user starts scrolling — don't trap
    // a sticky tile in their face if they want to keep moving.
    if (Math.abs(scrollRef.current - lastScrollRef.current) > 0.0008) {
      if (hoveredRef.current !== -1) {
        hoveredRef.current = -1
        if (typeof document !== 'undefined') document.body.style.cursor = ''
      }
    }
    lastScrollRef.current = scrollRef.current

    // Hover lerp is applied to an INNER group ('animTile') while the OUTER
    // tile group + its hitbox stay static. That way the hitbox always lives
    // at the rest position so the cursor doesn't oscillate over/out as the
    // visible card glides toward the camera.
    if (groupRef.current) {
      camera.getWorldDirection(tmpDir)
      const STICK_DIST = 2.6

      let tileIdx = 0
      groupRef.current.traverse((obj) => {
        if (!obj.userData?.animTile) return
        const isHover = hoveredRef.current === tileIdx

        if (isHover && obj.parent) {
          tmpWorld.copy(camera.position).addScaledVector(tmpDir, STICK_DIST)
          tmpLocal.copy(tmpWorld)
          obj.parent.worldToLocal(tmpLocal)
          obj.position.lerp(tmpLocal, 0.16)
        } else {
          // rest position relative to outer group is the origin
          obj.position.lerp(REST_ORIGIN, 0.14)
        }

        const target = isHover ? 1.8 : 1
        const cur    = scaleRef.current[tileIdx] ?? 1
        const next   = cur + (target - cur) * 0.16
        scaleRef.current[tileIdx] = next
        obj.scale.setScalar(next)

        obj.lookAt(camera.position)
        tileIdx++
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
          color="#5EEAD4"
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
          color="#C6F8EE"
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
            color="#5EEAD4"
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
            // Hover lerp acts on local Z (we read baseZ from userData and
            // add the lerp delta). Label position + fontSize are compensated
            // by `/ scl` so they read at consistent world-space size + offset
            // across all three rings.
            const TILE_BASE_W = 1.05
            const TILE_BASE_H = 0.66

            // Split the project title at the em-dash so we can render the
            // primary name big + the sub-description small under it.
            //   "Konnect.im — Video Conferencing" → name="Konnect.im", sub="VIDEO CONFERENCING"
            const dashIdx = p.title.indexOf(' — ')
            const name    = (dashIdx > 0 ? p.title.slice(0, dashIdx)   : p.title).trim()
            const sub     = (dashIdx > 0 ? p.title.slice(dashIdx + 3)  : p.tagline ?? '').trim()

            return (
              <group
                key={p.id}
                position={[x, y, 0]}
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/projects/${p.id}`)
                }}
              >
                {/* Static invisible hitbox — bigger than the visible tile so
                    a small cursor drift doesn't drop the hover. Lives on the
                    outer (un-animated) group, so the visible card can lerp
                    forward without the cursor losing the target. */}
                <mesh
                  position={[0, 0, 0]}
                  onPointerOver={(e) => {
                    e.stopPropagation()
                    hoveredRef.current = i
                    if (typeof document !== 'undefined') document.body.style.cursor = 'pointer'
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation()
                    if (hoveredRef.current === i) hoveredRef.current = -1
                    if (typeof document !== 'undefined') document.body.style.cursor = ''
                  }}
                >
                  <planeGeometry args={[TILE_BASE_W * 1.6 * scl, TILE_BASE_H * 2.2 * scl]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>

                {/* Animated inner group — useFrame lerps THIS for the
                    fly-to-camera effect. Static hitbox above is unaffected. */}
                <group userData={{ animTile: true }}>
                {/* Per-ring scale on inner group so the outer group's local Z
                    (used for hover lerp) stays in world units. */}
                <group scale={scl}>
                  {/* Soft back halo — coloured glow behind the thumbnail */}
                  <mesh position={[0, 0, -0.02]}>
                    <planeGeometry args={[TILE_BASE_W * 1.45, TILE_BASE_H * 1.55]} />
                    <meshBasicMaterial
                      ref={(m) => { borderMatsRef.current[i] = m }}
                      color={p.color}
                      transparent
                      opacity={0}
                      depthWrite={false}
                      toneMapped={false}
                      blending={THREE.AdditiveBlending}
                    />
                  </mesh>
                  {/* Project thumbnail */}
                  <mesh>
                    <planeGeometry args={[TILE_BASE_W, TILE_BASE_H]} />
                    <meshBasicMaterial
                      ref={(m) => { matsRef.current[i] = m }}
                      map={textures[i]}
                      transparent
                      opacity={0}
                      toneMapped={false}
                    />
                  </mesh>
                </group>

                {/* Title block — outside scaled group so positions/sizes are
                    world-uniform across all three rings. Tight gap right
                    under the tile so name/tile read as one unit. */}
                {/* Project name — display, white-cream, bold */}
                <Text
                  position={[0, -(TILE_BASE_H * 0.5 * scl) - 0.04, 0]}
                  fontSize={0.10}
                  color="#F5F5F7"
                  anchorX="center"
                  anchorY="top"
                  letterSpacing={-0.005}
                  maxWidth={1.7}
                  outlineColor="#0A0A0A"
                  outlineWidth={0.004}
                >
                  {name}
                </Text>
                {/* Sub-description — mono, brand color, small caps */}
                {sub && (
                  <Text
                    position={[0, -(TILE_BASE_H * 0.5 * scl) - 0.17, 0]}
                    fontSize={0.046}
                    color={p.color}
                    anchorX="center"
                    anchorY="top"
                    letterSpacing={0.22}
                    maxWidth={1.8}
                    outlineColor="#0A0A0A"
                    outlineWidth={0.003}
                  >
                    {sub.toUpperCase()}
                  </Text>
                )}
                </group>
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
// HeroPortrait3D — flip photo/video card placed at the INTRO station centre.
// Mirrors the solar-system pattern at PROJECTS: drei <Html transform> sits
// in 3D space, offset down-path so camera approaches it instead of passing
// through. Proximity-scrubbed opacity wakes it up only near the station.
// ─────────────────────────────────────────────────────────────────────────────
function HeroPortrait3D({
  curve, stationT, accent,
}: {
  curve:    THREE.CatmullRomCurve3
  stationT: number
  accent:   string
}) {
  const groupRef = useRef<THREE.Group>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!groupRef.current) return
    const pos     = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    curve.getPointAt(stationT, pos)
    curve.getTangentAt(stationT, tangent)
    groupRef.current.position.copy(pos)
    groupRef.current.lookAt(pos.clone().sub(tangent))
  }, [curve, stationT])

  useFrame(() => {
    const dist      = Math.abs(scrollRef.current - stationT)
    const proximity = Math.max(0, 1 - dist / 0.13)
    if (wrapRef.current) wrapRef.current.style.opacity = Math.pow(proximity, 1.3).toFixed(3)
  })

  return (
    <group ref={groupRef}>
      {/* Offset downstream so camera approaches the card head-on instead of
          passing through it (same z=-4 trick as the solar system). */}
      <group position={[0, 0, -4]}>
        <Html
          transform
          position={[0, 0, 0]}
          distanceFactor={4.2}
          pointerEvents="auto"
          center
        >
          <div ref={wrapRef} style={{ opacity: 0, transition: 'opacity 140ms linear' }}>
            <FlipPhotoCard accent={accent} width={260} />
          </div>
        </Html>
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SocialsEnd3D — social links + sign-off panel placed at the end of the tunnel,
// past the CONTACT station. Mirrors HeroPortrait3D's pattern: anchor sits on
// the curve with a forward offset so camera approaches it head-on.
// ─────────────────────────────────────────────────────────────────────────────
function SocialsEnd3D({
  curve, accent,
}: {
  curve:  THREE.CatmullRomCurve3
  accent: string
}) {
  const groupRef = useRef<THREE.Group>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const STATION_T = 0.96

  useEffect(() => {
    if (!groupRef.current) return
    const pos     = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    curve.getPointAt(STATION_T, pos)
    curve.getTangentAt(STATION_T, tangent)
    groupRef.current.position.copy(pos)
    groupRef.current.lookAt(pos.clone().sub(tangent))
  }, [curve])

  useFrame(() => {
    // Fade in past CONTACT (t=0.86), full strength at STATION_T.
    const dist      = Math.abs(scrollRef.current - STATION_T)
    const proximity = Math.max(0, 1 - dist / 0.12)
    if (wrapRef.current) wrapRef.current.style.opacity = Math.pow(proximity, 1.2).toFixed(3)
  })

  const linkBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 56, height: 56, borderRadius: '50%',
    border: `1px solid ${hexAlpha(accent, 0.45)}`,
    background: hexAlpha(accent, 0.06),
    color: accent,
    textDecoration: 'none',
    transition: 'background 220ms, border-color 220ms, transform 220ms',
    boxShadow: `0 0 18px ${hexAlpha(accent, 0.18)}`,
  }

  return (
    <group ref={groupRef}>
      <group position={[0, 0, -3]}>
        <Html
          transform
          position={[0, 0, 0]}
          distanceFactor={3.6}
          pointerEvents="auto"
          center
        >
          <div
            ref={wrapRef}
            style={{
              opacity: 0,
              transition: 'opacity 140ms linear',
              textAlign: 'center',
              userSelect: 'none',
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              width: 380,
            }}
          >
            <div style={{
              fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase',
              color: accent, marginBottom: 16,
              textShadow: `0 0 10px ${hexAlpha(accent, 0.6)}`,
            }}>
              END OF LINE
            </div>
            <div style={{
              fontFamily: 'var(--font-display), ui-sans-serif, system-ui, sans-serif',
              fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em',
              color: '#F5F5F7', marginBottom: 28, lineHeight: 1.05,
            }}>
              LET&apos;S STAY<br />IN <span style={{ color: accent, textShadow: `0 0 18px ${hexAlpha(accent, 0.5)}` }}>TOUCH</span>
            </div>
            <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginBottom: 26 }}>
              <a href="https://github.com/fahaddoc"             target="_blank" rel="noopener noreferrer" aria-label="GitHub"   style={linkBase}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              </a>
              <a href="https://www.linkedin.com/in/fahaddoc600" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={linkBase}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="mailto:hello@shahfahad.dev"              aria-label="Email"    style={linkBase}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
              </a>
            </div>
            <div style={{
              fontSize: 9, letterSpacing: '0.35em', textTransform: 'uppercase',
              color: 'rgba(245,245,247,0.45)',
            }}>
              KEEP SCROLLING TO LOOP ↻
            </div>
          </div>
        </Html>
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
  // Remount the Canvas (fresh WebGL context) when the GPU drops the context.
  // We cap retries so a hard GPU failure doesn't loop forever.
  const [canvasKey, setCanvasKey] = useState(0)
  const retriesRef = useRef(0)

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
        publishProgress(self.progress)
      },
    })

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max > 0) publishProgress(window.scrollY / max)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // Also subscribe directly to Lenis so programmatic scrolls
    // (lenis.scrollTo with immediate:true) update progress immediately even
    // when the native 'scroll' event lags or doesn't fire.
    const w = window as unknown as {
      __lenis?: { on?: (ev: string, cb: (e: { scroll: number; limit: number }) => void) => void; off?: (ev: string, cb: unknown) => void }
    }
    const onLenis = (e: { scroll: number; limit: number }) => {
      if (e.limit > 0) publishProgress(e.scroll / e.limit)
    }
    w.__lenis?.on?.('scroll', onLenis)

    return () => {
      st.kill()
      window.removeEventListener('scroll', onScroll)
      w.__lenis?.off?.('scroll', onLenis)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset:    0,
        zIndex:   0,
        // Canvas needs pointer events so mesh onPointerEnter / onClick on the
        // project tiles can fire. HUD chrome sits on top in higher z-index and
        // still receives clicks because it sets pointerEvents:auto on itself.
        pointerEvents: 'auto',
        background: '#05050A',
      }}
    >
      <Canvas
        key={canvasKey}
        camera={{ fov: 70, near: 0.05, far: 400, position: [0, 0, 0] }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          // When the GPU drops the context, remount the canvas instead of
          // reloading the page (page reloads can loop on persistent issues).
          // Cap at 3 retries.
          const handler = (e: Event) => {
            e.preventDefault()
            if (retriesRef.current < 3) {
              retriesRef.current += 1
              setTimeout(() => setCanvasKey((k) => k + 1), 200)
            }
          }
          gl.domElement.addEventListener('webglcontextlost', handler)
        }}
      >
        <fog attach="fog" args={['#05050A', 8, 60]} />

        <ambientLight intensity={0.4} />
        <pointLight position={[0, 0, -5]} intensity={1.5} color="#5EEAD4" />

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

        {/* Flip photo/video card at the INTRO station centre */}
        <HeroPortrait3D
          curve={curve}
          stationT={STATIONS.find((s) => s.id === 'hero')!.t}
          accent={STATIONS.find((s) => s.id === 'hero')!.color}
        />

        {/* Socials sign-off at the end of the tunnel */}
        <SocialsEnd3D
          curve={curve}
          accent={STATIONS.find((s) => s.id === 'contact')!.color}
        />

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


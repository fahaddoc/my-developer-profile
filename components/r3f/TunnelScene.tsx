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
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects } from '@/data/projects'
import { type QualityPreset, PRESETS } from '@/lib/quality'
import { FlipPhotoCard } from '@/components/r3f/FlipPhotoCard'
import { NebulaBackground } from '@/components/r3f/NebulaBackground'
import { SkillsOrbit } from '@/components/r3f/SkillsOrbit'

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
    color:     '#a3b48d',
    imageSrc:  '/images/shah-fahad-sticker.png',
    subtitle:    'WELCOME TO MY SPACE',
    closer:      ['LET\'S BUILD', 'SOMETHING AMAZING'],
    traitsLeft:  ['PASSIONATE', 'ABOUT BUILDING', 'DIGITAL EXPERIENCES'],
    traitsRight: ['CLEAN CODE', 'PERFORMANCE', 'INNOVATION'],
  },
  {
    id:        'about',
    label:     '01 · ABOUT',
    num:       '01',
    short:     'ABOUT',
    t:         0.20,
    heading:   'Turning ideas into shipped products',
    tagline:   '6+ years · 4 companies · 9+ projects · 25+ clients. From MILETAP\'s real-time video platform to DigitalHire\'s hiring system.',
    color:     '#a3b48d',
    subtitle:    'FROM IDEAS TO PRODUCTS',
    closer:      ['6 YEARS', 'SHIPPING REAL-TIME'],
    traitsLeft:  ['DETAIL', 'CRAFT', 'CONSISTENCY'],
    traitsRight: ['SCALE', 'PERFORMANCE', 'ARCHITECTURE'],
  },
  {
    id:        'skills',
    label:     '02 · SKILLS',
    num:       '02',
    short:     'SKILLS',
    t:         0.35,
    heading:   'Tech I work with',
    tagline:   'Frontend, mobile, real-time, backend, 3D / creative, tooling. Specialised in React + Next.js + Flutter + WebRTC.',
    color:     '#a3b48d',
    subtitle:    'TECHNOLOGIES I WORK WITH',
    closer:      ['DEEP SPECIALTY', 'BROAD COVERAGE'],
    traitsLeft:  ['REACT', 'NEXT.JS', 'TYPESCRIPT'],
    traitsRight: ['FLUTTER', 'WEBRTC', 'THREE.JS'],
  },
  {
    id:        'projects',
    label:     '03 · PROJECTS',
    num:       '03',
    short:     'PROJECTS',
    t:         0.55,
    heading:   'Featured work',
    tagline:   'Konnect.im video conferencing · DigitalHire SaaS · WhatsApp ChatBot Simulator · Agent Shah 3D portfolio game.',
    color:     '#a3b48d',
    cta:       { text: 'view case studies →', href: '#projects' },
    subtitle:    'FEATURED CASE STUDIES',
    closer:      ['10+ PROJECTS', 'LIVE IN PRODUCTION'],
    traitsLeft:  ['REAL-TIME', 'WEBRTC', 'SIGNALR'],
    traitsRight: ['REACT', 'NEXT.JS', 'FLUTTER'],
  },
  {
    id:        'experience',
    label:     '04 · EXPERIENCE',
    num:       '04',
    short:     'EXPERIENCE',
    t:         0.75,
    heading:   'Professional journey',
    tagline:   'DigitalHire (current) · MILETAP · E-Ocean · freelance & contract — frontend, real-time, mobile.',
    color:     '#a3b48d',
    subtitle:    'PROFESSIONAL JOURNEY',
    closer:      ['4 COMPANIES', '25+ CLIENTS'],
    traitsLeft:  ['STARTUPS', 'ENTERPRISE', 'AGENCIES'],
    traitsRight: ['SENIOR', 'CONTRACT', 'PRINCIPAL'],
  },
  {
    id:        'contact',
    label:     '05 · CONTACT',
    num:       '05',
    short:     'CONTACT',
    t:         0.90,
    heading:   "Let's build something",
    tagline:   'hello@shahfahad.dev · open to senior frontend & real-time roles, full-time and contract.',
    color:     '#a3b48d',
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
  curve, ringCount, dotColor = '#a3b48d',
}: {
  curve:     THREE.CatmullRomCurve3
  ringCount: number
  dotColor?: string
}) {
  // (Previously we drew a dark TubeGeometry inner skin for occlusion. With
  // fog + canvas background color the void reads fine — saved ~6k vertices
  // and a draw call per frame.)

  // Static dotted constellation rings — geometry built ONCE in useMemo and
  // never touched again per frame. No shader animation, no buffer mutations,
  // no requestAnimationFrame work beyond what R3F already does. This is the
  // cheapest tunnel decoration we've tried.
  const DOTS_PER_RING = 14
  const RING_RADIUS   = 3.2

  // All tunnel ring decorations dropped — connector lines AND constellation
  // dots. Both formed a visible tube structure across sections that competed
  // with the nebula. Now the tunnel is purely a camera path; Station rings
  // (proximity-faded) + Nebula + ProjectTiles carry the visuals.
  void curve
  void ringCount
  void dotColor
  void DOTS_PER_RING
  void RING_RADIUS
  return null
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

  const groupRef        = useRef<THREE.Group>(null)
  const labelRef        = useRef<HTMLDivElement>(null)
  const planetOpacityRef = useRef(0)

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

  // Planets stay visible throughout the tunnel at their true color — no
  // hiding or alpha fade. The station label still fades with approach so it
  // only "lights up" when nearby.
  useFrame(() => {
    const dist      = Math.abs(scrollRef.current - t)
    const proximity = Math.max(0, 1 - dist / 0.10)

    planetOpacityRef.current = 1
    if (labelRef.current) labelRef.current.style.opacity = String(proximity * 0.95)

    if (groupRef.current) {
      if (!groupRef.current.visible) groupRef.current.visible = true
      const breath = 1 + proximity * 0.04
      groupRef.current.scale.setScalar(breath)
    }
  })

  return (
    <group ref={groupRef}>
      {/* Each station's "circle" is now a unique planet — water world,
          rocky mars, gas giant w/ ring, ice neptune, dust pink. Configs in
          the PLANETS map above. */}
      <Planet stationId={station.id} opacityRef={planetOpacityRef} />

      {/* Floating label above the planet — rendered as a CSS3D Html plane so we
          get exact per-letter coloring (troika colorRanges is unreliable via
          drei): the SECOND letter is white, every other letter is the site's
          primary accent. Tilts with the station group like the old 3D text. */}
      <Html
        position={[0, 2.35, 0.3]}
        center
        transform
        scale={0.34}
        zIndexRange={[18, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          ref={labelRef}
          className="station-heading"
          style={{
            fontFamily: 'var(--font-display), ui-sans-serif, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 72,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            opacity: 0,
          }}
        >
          {[...station.short].map((ch, i) => (
            <span key={i} style={{
              color: i === 1 ? '#FFFFFF' : station.color,
              textShadow: `0 0 22px ${station.color}99, 0 2px 10px rgba(0,0,0,0.5)`,
            }}>{ch}</span>
          ))}
        </div>
      </Html>

      {/* Station content (calling card, stats, timeline, etc) is now rendered
          as flat HUD chrome via TunnelHUD <StationOverlay>, NOT in 3D space.
          Keeps the tunnel centre clear and prevents content from intersecting
          the rings as the camera passes through. */}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Planet — sphere mesh with a parameterized shader. Each station gets its own
// configured Planet (color + surface pattern). Replaces the dual torus rings
// + marker dots that used to mark each station. Renders OFFSET from the curve
// path so the camera flies past it rather than through it.
// ─────────────────────────────────────────────────────────────────────────────
interface PlanetConfig {
  colorDeep:    string
  colorMid:     string
  colorBright:  string
  bands:        number     // 0 = no horizontal bands, 1 = strong gas-giant bands
  noiseScale:   number
  rimStrength:  number
  polarCap?:    number     // 0 = none, 1 = strong ice caps at poles (Earth-like)
  cloudCover?:  number     // 0 = none, 1 = full clouds (Earth-like)
  radius:       number
  offset:       [number, number, number]   // local position in station group
  spinSpeed:    number     // rad/sec on Y axis
  ringTilt?:    number     // optional planetary ring tilt in radians (Saturn-style)
}

const PLANETS: Record<string, PlanetConfig> = {
  hero: {       // aqua water world
    colorDeep:   '#06334a',
    colorMid:    '#0e89a3',
    colorBright: '#a8f0f0',
    bands:       0.10,
    noiseScale:  3.5,
    rimStrength: 0.45,
    radius:      1.45,
    offset:      [-1.7,  0.4, -2.3],
    spinSpeed:   0.10,
  },
  about: {      // mars-like rocky
    colorDeep:   '#3a1408',
    colorMid:    '#c25a26',
    colorBright: '#f0a468',
    bands:       0.0,
    noiseScale:  6.0,
    rimStrength: 0.30,
    radius:      1.35,
    offset:      [ 1.8, -0.4, -1.9],
    spinSpeed:   0.06,
  },
  skills: {     // cyan crystalline core — small dense orb
    colorDeep:   '#031826',
    colorMid:    '#0d7a8a',
    colorBright: '#9fd8d2',
    bands:       0.0,
    noiseScale:  5.0,
    rimStrength: 0.45,
    radius:      1.15,
    offset:      [-1.6,  0.4, -2.2],
    spinSpeed:   0.08,
  },
  projects: {   // violet gas giant w/ tilted ring
    colorDeep:   '#28084a',
    colorMid:    '#7a3fc8',
    colorBright: '#e8caff',
    bands:       0.85,
    noiseScale:  3.0,
    rimStrength: 0.55,
    radius:      1.55,
    offset:      [-1.6,  0.5, -2.5],
    spinSpeed:   0.08,
    ringTilt:    0.45,
  },
  experience: { // ice giant — neptune
    colorDeep:   '#0a2240',
    colorMid:    '#3a7fb8',
    colorBright: '#d4ecff',
    bands:       0.30,
    noiseScale:  4.5,
    rimStrength: 0.50,
    radius:      1.40,
    offset:      [ 1.7,  0.4, -2.1],
    spinSpeed:   0.07,
  },
  contact: {    // Earth — blue oceans, green continents, white clouds, polar caps
    colorDeep:   '#062a5a',   // deep ocean
    colorMid:    '#1a6fb8',   // surface ocean blue
    colorBright: '#3e9c54',   // continental green
    bands:       0.0,
    noiseScale:  4.2,
    rimStrength: 0.55,        // atmospheric blue rim glow
    polarCap:    0.85,
    cloudCover:  0.55,
    radius:      1.45,
    offset:      [-1.6, -0.4, -2.2],
    spinSpeed:   0.06,
  },
}

function Planet({ stationId, opacityRef }: {
  stationId: string
  opacityRef: { current: number }
}) {
  const cfg = PLANETS[stationId] ?? PLANETS.hero
  const meshRef = useRef<THREE.Mesh>(null)

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:        { value: 0 },
      uOpacity:     { value: 0 },
      uColorDeep:   { value: new THREE.Color(cfg.colorDeep)   },
      uColorMid:    { value: new THREE.Color(cfg.colorMid)    },
      uColorBright: { value: new THREE.Color(cfg.colorBright) },
      uBands:       { value: cfg.bands },
      uNoiseScale:  { value: cfg.noiseScale },
      uRimStrength: { value: cfg.rimStrength },
      uPolarCap:    { value: cfg.polarCap   ?? 0 },
      uCloudCover:  { value: cfg.cloudCover ?? 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vLocalPos;
      varying vec3 vLocalNormal;
      varying vec3 vNormalView;
      varying float vLatitude;
      void main() {
        vLocalPos = position;
        vLocalNormal = normalize(normal);
        vLatitude = position.y;            // -radius..+radius, no seam
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3  uColorDeep;
      uniform vec3  uColorMid;
      uniform vec3  uColorBright;
      uniform float uBands;
      uniform float uNoiseScale;
      uniform float uRimStrength;
      uniform float uPolarCap;
      uniform float uCloudCover;
      varying vec3 vLocalPos;
      varying vec3 vLocalNormal;
      varying vec3 vNormalView;
      varying float vLatitude;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0; float amp = 0.55;
        for (int i = 0; i < 4; i++) { v += amp * noise(p); p *= 2.05; amp *= 0.5; }
        return v;
      }

      // Triplanar fbm at a given scale + uv offset — used for surface + clouds
      float triplanar(vec3 p, vec3 absN, float total) {
        float n1 = fbm(p.xy);
        float n2 = fbm(p.yz * 1.2);
        float n3 = fbm(p.xz * 1.4);
        return (n1 * absN.z + n2 * absN.x + n3 * absN.y) / total;
      }

      void main() {
        vec3 absN = pow(abs(vLocalNormal), vec3(2.0));
        float total = absN.x + absN.y + absN.z + 1e-5;

        // Surface fbm
        vec3 p = vLocalPos * uNoiseScale + vec3(uTime * 0.02, 0.0, uTime * 0.014);
        float surface = triplanar(p, absN, total);

        // Bands — latitude with noise distortion
        float bandPattern = 0.5 + 0.5 * sin(vLatitude * 7.0 + surface * 3.5);
        float pattern = mix(surface, bandPattern, uBands);

        vec3 col = mix(uColorDeep, uColorMid, smoothstep(0.25, 0.7, pattern));
        col = mix(col, uColorBright, smoothstep(0.65, 0.92, pattern) * 0.55);

        // Polar ice caps — brighten near the poles (high |latitude| component).
        // Driven by the y component of the LOCAL normal so the cap rotates
        // with the sphere properly.
        float polarMask = smoothstep(0.78, 0.96, abs(vLocalNormal.y));
        col = mix(col, vec3(0.92, 0.96, 1.0), polarMask * uPolarCap);

        // Cloud layer — second fbm at different scale, scrolls faster than
        // surface so clouds drift over the planet.
        if (uCloudCover > 0.01) {
          vec3 cp = vLocalPos * uNoiseScale * 0.65 + vec3(uTime * 0.05, 0.0, uTime * 0.03);
          float cloud = triplanar(cp, absN, total);
          cloud = smoothstep(0.52, 0.85, cloud);
          col = mix(col, vec3(1.0), cloud * uCloudCover * 0.75);
        }

        // Fresnel rim — soft glow at silhouette
        float rim = pow(1.0 - max(0.0, vNormalView.z), 2.0);
        col += uColorBright * rim * uRimStrength;

        gl_FragColor = vec4(col, uOpacity);
      }
    `,
    transparent: true,
    toneMapped: false,
  }), [cfg])

  useEffect(() => () => mat.dispose(), [mat])

  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt
    mat.uniforms.uOpacity.value = opacityRef.current
    if (meshRef.current) meshRef.current.rotation.y += dt * cfg.spinSpeed
  })

  return (
    <group position={cfg.offset}>
      <mesh ref={meshRef} material={mat}>
        <sphereGeometry args={[cfg.radius, 32, 24]} />
      </mesh>
      {/* Optional planetary ring (Saturn-like) */}
      {cfg.ringTilt !== undefined && (
        <mesh rotation={[Math.PI / 2 + cfg.ringTilt, 0, 0]}>
          <ringGeometry args={[cfg.radius * 1.4, cfg.radius * 2.0, 64]} />
          <PlanetRingMaterial color={cfg.colorBright} opacityRef={opacityRef} />
        </mesh>
      )}
    </group>
  )
}

// Tiny helper for Saturn-style ring (single material, fades with planet)
function PlanetRingMaterial({ color, opacityRef }: { color: string; opacityRef: { current: number } }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (matRef.current) matRef.current.opacity = opacityRef.current * 0.55
  })
  return (
    <meshBasicMaterial
      ref={matRef}
      color={color}
      transparent
      opacity={0}
      side={THREE.DoubleSide}
      depthWrite={false}
      toneMapped={false}
    />
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

  // Static plain points — geometry built once, no per-frame work, no custom
  // shader, no constellation lines (dropped the O(n²) line-pair search and
  // the second BufferGeometry). All saved CPU / GPU time.
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const t = Math.random()
      const p = curve.getPointAt(t)
      const angle  = Math.random() * Math.PI * 2
      const radius = 0.5 + Math.random() * 2.5
      positions[i * 3 + 0] = p.x + Math.cos(angle) * radius
      positions[i * 3 + 1] = p.y + Math.sin(angle) * radius
      positions[i * 3 + 2] = p.z
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [curve, count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const texture = useMemo(() => getSparkleTexture(), [])

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.12}
        sizeAttenuation
        color="#a3b48d"
        map={texture ?? undefined}
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        alphaTest={0.02}
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
// Category → SVG icon for the project card. Falls back to a monitor icon for
// any category not explicitly mapped.
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  web: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 21h8m-4-3v3" />
    </svg>
  ),
  mobile: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  ),
  realtime: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m16 10 6-3v10l-6-3z" />
    </svg>
  ),
}

// Project-id overrides so the icon hints at the actual product type, not just
// the abstract category bucket. Anything missing falls back to CATEGORY_ICON.
const PROJECT_ICON_OVERRIDE: Record<string, React.ReactNode> = {
  'agent-shah-3d': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="11" rx="3" />
      <path d="M8 13h2m1-2v4m4-2h2" />
      <circle cx="17" cy="12" r=".8" fill="currentColor" stroke="none" />
      <circle cx="17" cy="15" r=".8" fill="currentColor" stroke="none" />
    </svg>
  ),
  'eocean': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 0 1-4.36-.99L3 20l1.04-3.91A7.7 7.7 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  'kistpay': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18M7 14l4-4 3 3 6-7" />
    </svg>
  ),
  'reapagro': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19h16M6 19V10m4 9V6m4 13v-8m4 8V8" />
    </svg>
  ),
  'screening': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M6 8h4M6 12h2m6-4h4m-4 4h4M6 16h12" />
    </svg>
  ),
  'leavesystem': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M16 3v4M8 3v4m-4 6h16" />
    </svg>
  ),
  'opd': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M12 8v6m-3-3h6" />
    </svg>
  ),
  'khawateen': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  ),
}

function iconFor(p: { id: string; category: string }): React.ReactNode {
  return PROJECT_ICON_OVERRIDE[p.id] ?? CATEGORY_ICON[p.category] ?? CATEGORY_ICON.web
}

// SkillsAnchor — places its children EXACTLY where the SKILLS planet sits
// (station offset [-1.6, 0.4, -2.2] from PLANETS.skills), so icons orbit
// around the visible cyan orb rather than floating in empty space.
function SkillsAnchor({
  curve, stationT, children,
}: {
  curve:    THREE.CatmullRomCurve3
  stationT: number
  children: React.ReactNode
}) {
  const groupRef = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!groupRef.current) return
    const pos     = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    curve.getPointAt(stationT, pos)
    curve.getTangentAt(stationT, tangent)
    groupRef.current.position.copy(pos)
    groupRef.current.lookAt(pos.clone().sub(tangent))
  }, [curve, stationT])
  return (
    <group ref={groupRef}>
      {/* matches PLANETS.skills.offset so orbit centers on the planet */}
      <group position={[-1.6, 0.4, -2.2]}>{children}</group>
    </group>
  )
}

function ProjectTiles({
  curve, stationT,
}: {
  curve:    THREE.CatmullRomCurve3
  stationT: number
  bob?:     boolean
}) {
  // 9 projects, featured first
  const pool = useMemo(() => {
    const sorted = [...projects].sort(
      (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false),
    )
    return sorted.slice(0, 9)
  }, [])

  // ── Architecture per spec ─────────────────────────────────────────────
  // groupRef     — station root (positioned + oriented along the curve)
  // orbitRingRef — the ring; rotates around Y axis
  // cardGroups[] — per-card Three.Group at angle on the ring (billboarded)
  // cardEls[]    — DOM div refs for CSS scale/opacity/glow updates
  const groupRef     = useRef<THREE.Group>(null)
  const orbitRingRef = useRef<THREE.Group>(null)
  const cardGroups   = useRef<(THREE.Group | null)[]>([])
  const cardEls      = useRef<(HTMLDivElement | null)[]>([])

  const ORBIT_RADIUS = 4.5
  const AUTO_SPIN    = 0.003        // rad / frame (spec)
  const TWO_PI       = Math.PI * 2

  // Drag + state
  const isDraggingRef = useRef(false)
  const startXRef     = useRef(0)
  const lastXRef      = useRef(0)
  const movedRef      = useRef(0)
  const tweeningRef   = useRef(false)
  const hoveredRef    = useRef<number>(-1)
  const activeIdxRef  = useRef(0)
  const tmpVec        = useMemo(() => new THREE.Vector3(), [])

  // Anchor station root on the curve
  useEffect(() => {
    if (!groupRef.current) return
    const pos     = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    curve.getPointAt(stationT, pos)
    curve.getTangentAt(stationT, tangent)
    groupRef.current.position.copy(pos)
    groupRef.current.lookAt(pos.clone().sub(tangent))
  }, [curve, stationT])

  // Global drag listeners
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - lastXRef.current
      lastXRef.current = e.clientX
      movedRef.current += Math.abs(dx)
      if (orbitRingRef.current) orbitRingRef.current.rotation.y += dx * 0.01
    }
    const onUp = () => { isDraggingRef.current = false }
    window.addEventListener('pointermove',   onMove)
    window.addEventListener('pointerup',     onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove',   onMove)
      window.removeEventListener('pointerup',     onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  useFrame(({ camera }) => {
    // Proximity fade
    const dist        = Math.abs(scrollRef.current - stationT)
    const proximity   = Math.max(0, 1 - dist / 0.08)
    const baseOpacity = Math.pow(proximity, 2.4)
    const interactive = baseOpacity > 0.35

    // Auto rotation — stops while dragging / tweening
    if (orbitRingRef.current && !isDraggingRef.current && !tweeningRef.current) {
      orbitRingRef.current.rotation.y += AUTO_SPIN
    }

    // Each card faces camera + compute world Z for active detection
    let bestIdx = 0
    let bestZ   = -Infinity
    const cardZs = cardGroups.current.map(g => {
      if (!g) return -Infinity
      g.lookAt(camera.position)
      g.getWorldPosition(tmpVec)
      return tmpVec.z
    })
    for (let i = 0; i < cardZs.length; i++) {
      if (cardZs[i] > bestZ) { bestZ = cardZs[i]; bestIdx = i }
    }
    activeIdxRef.current = bestIdx

    // CSS state per card
    for (let i = 0; i < cardEls.current.length; i++) {
      const el = cardEls.current[i]
      if (!el) continue
      const isActive  = i === bestIdx
      const isHovered = i === hoveredRef.current
      // Depth fade: front of orbit fully visible, back of orbit hidden
      const depthT      = Math.max(0, Math.min(1, (cardZs[i] - (bestZ - 2 * ORBIT_RADIUS)) / (2 * ORBIT_RADIUS)))
      const depthFade   = Math.pow(depthT, 2.2)
      const cardOpacity = baseOpacity * depthFade
      let scale = isActive ? 1.04 : 0.92
      if (isHovered) scale = 1.08
      el.style.transform = `scale(${scale})`
      el.style.opacity   = cardOpacity.toFixed(3)
      el.style.boxShadow = isActive
        ? `
          inset 0 1px 0 rgba(255,255,255,0.26),
          inset 0 -1px 0 rgba(0,0,0,0.36),
          0 16px 40px rgba(0,0,0,0.60),
          0 0 56px ${hexAlpha(pool[i].color, 0.65)}
        `
        : `
          inset 0 1px 0 rgba(255,255,255,0.18),
          inset 0 -1px 0 rgba(0,0,0,0.34),
          0 10px 28px rgba(0,0,0,0.55),
          0 0 28px ${hexAlpha(pool[i].color, 0.28)}
        `
      el.style.borderColor   = isActive ? pool[i].color : hexAlpha(pool[i].color, 0.50)
      el.style.zIndex        = isActive ? '20' : String(Math.round(cardZs[i] * 10) + 100)
      el.style.pointerEvents = interactive && cardOpacity > 0.35 ? 'auto' : 'none'
    }

    // Hover Z-push — translate hovered card's parent group +0.3 toward camera
    // (local +Z after lookAt = away from camera, so push along -Z, but lookAt
    // orients local -Z toward camera, so toward camera = -Z. Apply via
    // translateZ negative on the inner mesh? Easier: use card group's
    // position has been set on ring; can't displace without breaking orbit.
    // We instead push the inner Html wrapper via local translateZ on a child
    // group below.)
  })

  // Pointer handlers on each card div
  const onCardPointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true
    movedRef.current      = 0
    startXRef.current     = e.clientX
    lastXRef.current      = e.clientX
    tweeningRef.current   = false
  }
  const onCardClick = (idx: number) => {
    if (movedRef.current > 6) return    // drag, not click
    if (idx === activeIdxRef.current) {
      window.dispatchEvent(new CustomEvent('project-drawer-open', { detail: pool[idx].id }))
      return
    }
    // Tween ring so this card lands closest to camera. Active = max world Z.
    // World Z is maximised when the card sits along ring's +Z axis (in world
    // after group orientation). Card at angle θ on ring has local position
    // (cos θ, 0, sin θ). After ringRotation y = R applied, world (in group
    // local) becomes ... we just need (θ + R) such that sin(θ + R) is +1
    // (since group is oriented so group-local +Z points toward camera).
    // Wait: group lookAt(pos - tangent) → group's -Z points to camera. So
    // closest to camera = group-local -Z = sin negative. So we want sin(θ+R)
    // minimal = -1 → θ + R = -π/2 → R = -π/2 - θ.
    const baseAngle = (idx / pool.length) * TWO_PI
    const target = -Math.PI / 2 - baseAngle
    const ring = orbitRingRef.current
    if (!ring) return
    const cur = ring.rotation.y
    let diff = ((target - cur + Math.PI) % TWO_PI) - Math.PI
    if (diff < -Math.PI) diff += TWO_PI
    const finalAngle = cur + diff
    tweeningRef.current = true
    gsap.to(ring.rotation, {
      y: finalAngle,
      duration: 0.7,
      ease: 'power3.out',
      onComplete: () => { tweeningRef.current = false },
    })
  }

  return (
    <group ref={groupRef}>
      <group position={[0, 0, -4]}>
        {/* orbitRing — single Y-axis ring at planet centre */}
        <group ref={orbitRingRef}>
          {pool.map((p, i) => {
            const angle = (i / pool.length) * TWO_PI
            const x = Math.cos(angle) * ORBIT_RADIUS
            const z = Math.sin(angle) * ORBIT_RADIUS

            const dashIdx = p.title.indexOf(' — ')
            const name    = (dashIdx > 0 ? p.title.slice(0, dashIdx)   : p.title).trim()
            const sub     = (dashIdx > 0 ? p.title.slice(dashIdx + 3)  : p.tagline ?? '').trim()
            const tags    = (p.tech ?? []).slice(0, 2)
            const number  = String(i + 1).padStart(2, '0')

            return (
              <group
                key={p.id}
                ref={(g) => { cardGroups.current[i] = g }}
                position={[x, 0, z]}
              >
                <Html
                  transform
                  pointerEvents="auto"
                  distanceFactor={6.5}
                  center
                  zIndexRange={[100, 0]}
                >
                  <div
                    ref={(el) => { cardEls.current[i] = el }}
                    onPointerDown={onCardPointerDown}
                    onMouseEnter={() => { hoveredRef.current = i }}
                    onMouseLeave={() => { if (hoveredRef.current === i) hoveredRef.current = -1 }}
                    onClick={(e) => { e.stopPropagation(); onCardClick(i) }}
                    style={{
                      opacity: 0,
                      pointerEvents: 'none',
                      transformOrigin: 'center',
                      transition: 'transform 260ms cubic-bezier(0.16,1,0.3,1), box-shadow 240ms ease-out, opacity 160ms linear, border-color 200ms',
                      width: 115,
                      padding: '12px 12px 10px',
                      borderRadius: 20,
                      border: `1.5px solid ${hexAlpha(p.color, 0.55)}`,
                      // Dark glass fill — skills station has a dark backdrop so
                      // its white-sheen cards naturally read as dark glass; the
                      // projects station sits in front of the bright cyan
                      // nebula, so projects need an explicit dark fill to LOOK
                      // filled like skills do.
                      background: `
                        linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 100%),
                        linear-gradient(180deg, rgb(14,18,32) 0%, rgb(8,10,20) 100%)
                      `,
                      backdropFilter: 'blur(14px) saturate(160%)',
                      WebkitBackdropFilter: 'blur(14px) saturate(160%)',
                      boxShadow: `
                        inset 0 1px 0 rgba(255,255,255,0.18),
                        inset 0 -1px 0 rgba(0,0,0,0.34),
                        0 10px 28px rgba(0,0,0,0.55),
                        0 0 28px ${hexAlpha(p.color, 0.28)}
                      `,
                      fontFamily: 'var(--font-display), ui-sans-serif, system-ui, sans-serif',
                      color: 'rgb(var(--text-primary))',
                      userSelect: 'none',
                      cursor: 'grab',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      {/* Icon chip — glass capsule */}
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        border: `1.2px solid ${hexAlpha(p.color, 0.65)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: p.color,
                        background: `linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))`,
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        boxShadow: `
                          inset 0 1px 0 rgba(255,255,255,0.18),
                          0 0 10px ${hexAlpha(p.color, 0.40)}
                        `,
                        filter: `drop-shadow(0 0 4px ${hexAlpha(p.color, 0.4)})`,
                      }}>
                        <span style={{ transform: 'scale(0.62)', display: 'inline-flex' }}>{iconFor(p)}</span>
                      </div>
                      <div style={{ textAlign: 'right', lineHeight: 1 }}>
                        <div style={{
                          fontFamily: 'var(--font-mono), ui-monospace, monospace',
                          fontSize: 8, fontWeight: 700,
                          letterSpacing: '0.16em', color: p.color,
                          textShadow: `0 0 6px ${hexAlpha(p.color, 0.55)}`,
                        }}>{number}</div>
                        <div style={{
                          width: 3, height: 3, borderRadius: '50%',
                          background: p.color, marginLeft: 'auto', marginTop: 3,
                          boxShadow: `0 0 5px ${p.color}`,
                        }} />
                      </div>
                    </div>

                    <div style={{
                      fontWeight: 700, fontSize: 11.5,
                      letterSpacing: '-0.01em', lineHeight: 1.18,
                      marginBottom: 2,
                      color: '#ffffff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.45)',
                    }}>{name}</div>
                    <div style={{
                      fontSize: 8.5, fontWeight: 400,
                      color: 'rgba(255,255,255,0.65)',
                      lineHeight: 1.3,
                      minHeight: 11,
                    }}>{sub}</div>

                    {tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 7, flexWrap: 'wrap' }}>
                        {tags.map((t) => (
                          <span key={t} style={{
                            fontFamily: 'var(--font-mono), ui-monospace, monospace',
                            fontSize: 7, padding: '2px 6px',
                            borderRadius: 999,
                            border: `1px solid ${hexAlpha(p.color, 0.45)}`,
                            color: 'rgba(255,255,255,0.88)',
                            letterSpacing: '0.05em',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 6px ${hexAlpha(p.color, 0.18)}`,
                          }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Html>
              </group>
            )
          })}
        </group>
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
    const proximity = Math.max(0, 1 - dist / 0.07)
    if (wrapRef.current) wrapRef.current.style.opacity = Math.pow(proximity, 2.4).toFixed(3)
  })

  return (
    <group ref={groupRef}>
      {/* Offset to the right + downstream so camera approaches the card
          head-on, with the figure sitting on the right side of the view. */}
      <group position={[2.4, 0, -4]}>
        <Html
          transform
          position={[0, 0, 0]}
          distanceFactor={3.4}
          pointerEvents="auto"
          center
        >
          <div ref={wrapRef} style={{ opacity: 0, transition: 'opacity 140ms linear' }}>
            <FlipPhotoCard accent={accent} width={380} />
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
    const proximity = Math.max(0, 1 - dist / 0.07)
    if (wrapRef.current) wrapRef.current.style.opacity = Math.pow(proximity, 2.4).toFixed(3)
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
    pointerEvents: 'auto',
  }

  return (
    <group ref={groupRef}>
      <group position={[0, 0, -3]}>
        <Html
          transform
          position={[0, 0, 0]}
          distanceFactor={3.6}
          pointerEvents="none"
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
              pointerEvents: 'none',
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
              color: 'rgb(var(--text-primary))', marginBottom: 28, lineHeight: 1.05,
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
              color: 'rgb(var(--text-primary) / 0.45)',
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
// ProximityGate — only mounts its children when the camera is within
// `threshold` of `stationT`. Heavy nodes (drei <Html>, large geometries) cost
// memory + DOM even when fully transparent, so unmounting them when the user
// is at the other end of the tunnel keeps the page light.
// ─────────────────────────────────────────────────────────────────────────────
function ProximityGate({
  stationT, threshold = 0.18, children,
}: {
  stationT: number
  threshold?: number
  children: React.ReactNode
}) {
  const [near, setNear] = useState(false)
  useFrame(() => {
    const isNear = Math.abs(scrollRef.current - stationT) < threshold
    if (isNear !== near) setNear(isNear)
  })
  return near ? <>{children}</> : null
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component — Canvas + scroll wiring + tunnel + stations
// ─────────────────────────────────────────────────────────────────────────────
// RenderDriver — with the Canvas in frameloop="demand", this is the ONLY thing
// that pumps frames. It caps rendering to ~36fps (the scene is slow/ambient, so
// 60fps just heats the GPU) and fully PAUSES when the tab is hidden — no wasted
// GPU/CPU while the page is in a background tab. All scene animations are
// time-based (delta / clock.elapsedTime), so a lower frame rate stays correct.
function RenderDriver({ fps = 36 }: { fps?: number }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let raf = 0
    let last = 0
    const minDelta = 1000 / fps
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (typeof document !== 'undefined' && document.hidden) return
      if (t - last < minDelta) return
      last = t
      invalidate()
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [invalidate, fps])
  return null
}

export function TunnelScene({ preset = PRESETS.high }: { preset?: QualityPreset } = {}) {
  // Remount the Canvas (fresh WebGL context) when the GPU drops the context.
  // We cap retries so a hard GPU failure doesn't loop forever.
  const [canvasKey, setCanvasKey] = useState(0)
  const retriesRef = useRef(0)

  // Read theme so the canvas bg + fog + lights flip with it.
  const [isLight, setIsLight] = useState(false)
  useEffect(() => {
    const sync = () => {
      const t = document.documentElement.getAttribute('data-theme')
      setIsLight(t === 'light')
    }
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  const bgColor    = isLight ? '#f1f5f9' : '#0d0e12'
  const fogColor   = bgColor
  const dotColor   = isLight ? '#0e7490' : '#a3b48d'
  const ambientI   = isLight ? 0.9      : 0.4
  const pointLightI = isLight ? 0.6     : 1.5

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
        background: bgColor,
        transition: 'background 220ms',
      }}
    >
      <Canvas
        // NOTE: do NOT put isLight in this key. The bg/fog/lights are reactive
        // props and NebulaBackground rebuilds its material on isLight via
        // useMemo, so the theme flips in place. Keying on isLight forced a full
        // Canvas unmount+remount (WebGL context teardown + whole-scene rebuild)
        // on every toggle → a multi-hundred-ms main-thread block = the "jerk".
        key={canvasKey}
        // On-demand: RenderDriver pumps frames at a capped FPS and stops when
        // the tab is hidden (huge heat/battery saver vs the default 'always').
        frameloop="demand"
        camera={{ fov: 70, near: 0.05, far: 400, position: [0, 0, 0] }}
        // DPR locked to 1. Retina 2× would 4× the framebuffer pixel count for
        // marginal gain on a glowy scene. Single biggest GPU-memory win.
        dpr={1}
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
        <RenderDriver fps={36} />

        {/* Scene clear color — WebGL would otherwise paint black over the
            themed wrap div on every frame. */}
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[fogColor, 12, 120]} />

        <ambientLight intensity={ambientI} />
        <pointLight position={[0, 0, -5]} intensity={pointLightI} color={dotColor} />

        {/* Cosmic nebula + stars wrap the camera — paints first so the rest
            of the scene sits on top. */}
        <NebulaBackground isLight={isLight} accent={dotColor} />

        <Tunnel curve={curve} ringCount={preset.tubeSegments} dotColor={dotColor} />

        {STATIONS.map((s) => (
          <Station key={s.id} curve={curve} station={s} />
        ))}

        {/* ProjectTiles renders 9 drei <Html> cards = 9 DOM nodes in CSS3D.
            Only mount when the camera is near the projects station. */}
        {/* Skills station — orbital ring of skill-group cards */}
        <ProximityGate stationT={STATIONS.find((s) => s.id === 'skills')!.t} threshold={0.20}>
          <Suspense fallback={null}>
            <SkillsAnchor curve={curve} stationT={STATIONS.find((s) => s.id === 'skills')!.t}>
              <SkillsOrbit stationT={STATIONS.find((s) => s.id === 'skills')!.t} />
            </SkillsAnchor>
          </Suspense>
        </ProximityGate>

        {/* Projects grid now renders as a flat right-side HUD panel inside
            TunnelHUD <ProjectsSideGrid>. Uniform card sizes, CSS grid layout
            — replaces the previous 3D orbital ring around the planet. */}

        {/* Hero portrait now lives as a fixed-position DOM element inside
            TunnelHUD (right side, mirroring the left-side hero text). The
            3D <HeroPortrait3D> was removed so the card behaves like a
            sticky HUD overlay instead of a 3D object the camera passes by. */}

        {/* Socials sign-off at the very end of the tunnel (t≈0.96) */}
        <ProximityGate stationT={0.96} threshold={0.16}>
          <SocialsEnd3D
            curve={curve}
            accent={STATIONS.find((s) => s.id === 'contact')!.color}
          />
        </ProximityGate>

        <CameraRig curve={curve} />

        {/* Bloom disabled — EffectComposer + Bloom allocates 5–8 viewport-
            sized framebuffers and adds a postprocess pass per frame. With
            additive sprites + emissive colors the scene already glows enough.
            Saved ~80–120 MB GPU memory + ~25% per-frame GPU time. */}
      </Canvas>
    </div>
  )
}


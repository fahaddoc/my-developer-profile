'use client'

/* ------------------------------------------------------------------ *
 *  /lab — Premium tunnel direction previews (live 3D)                 *
 *  Four non-cyberpunk aesthetics for the R3F tunnel, each a real      *
 *  mini-scene: gradient void + stars + lit planets + cinematic        *
 *  post-processing (subtle bloom · vignette · film grain).            *
 *  Isolated/lean so 4 canvases can sit on one page.                   *
 * ------------------------------------------------------------------ */

import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'

const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], display: 'swap' })

/* ------------------------------------------------------------------ *
 *  Direction configs                                                  *
 * ------------------------------------------------------------------ */
type Planet = { pos: [number, number, number]; r: number; color: string; rough: number; metal: number }
type Dir = {
  id: string; n: string; name: string; tag: string
  void: string; neb: [string, string, string]; accent: string
  sun: string; sunPos: [number, number, number]
  fill: string
  planets: Planet[]
  bloomThr: number; bloomInt: number
  fog: [number, number]; grain: number
  aurora?: boolean; sunSphere?: boolean
  swatches: string[]
}

const DIRECTIONS: Dir[] = [
  {
    id: 'deep-field', n: '01', name: 'Deep Field', tag: 'Planetarium · astrophotography',
    void: '#070a14', neb: ['#070a14', '#12233f', '#284a66'], accent: '#7fd4cf',
    sun: '#c2d4e8', sunPos: [4, 3, 3], fill: '#3a5d7a',
    planets: [
      { pos: [1.5, -0.2, 0], r: 1.05, color: '#5e7088', rough: 0.85, metal: 0.05 },
      { pos: [-2.6, 1.2, -5], r: 0.5, color: '#3a4a60', rough: 0.9, metal: 0 },
    ],
    bloomThr: 0.7, bloomInt: 0.35, fog: [13, 42], grain: 0.045,
    swatches: ['#070a14', '#284a66', '#7fd4cf', '#c2d4e8'],
  },
  {
    id: 'aurora', n: '02', name: 'Aurora Atelier', tag: 'Luxe warm-cool aurora',
    void: '#0c0a12', neb: ['#0c0a12', '#241a32', '#3f2a52'], accent: '#d8c08a',
    sun: '#ecdcb8', sunPos: [3, 2, 4], fill: '#7a5cc0',
    planets: [
      { pos: [1.5, -0.1, 0], r: 1.05, color: '#e9e4ee', rough: 0.25, metal: 0.12 },
      { pos: [-2.6, 1.1, -5], r: 0.55, color: '#bda9d6', rough: 0.4, metal: 0.05 },
    ],
    bloomThr: 0.5, bloomInt: 0.6, fog: [13, 44], grain: 0.05, aurora: true,
    swatches: ['#0c0a12', '#a78bfa', '#5eead4', '#d8c08a'],
  },
  {
    id: 'gallery', n: '03', name: 'Gallery in Space', tag: 'Editorial mono · one accent',
    void: '#0d0e12', neb: ['#0d0e12', '#191b20', '#2a2e34'], accent: '#a3b48d',
    sun: '#eeeee8', sunPos: [3, 4, 2], fill: '#5a5e58',
    planets: [
      { pos: [1.5, -0.1, 0], r: 1.1, color: '#cfcfc7', rough: 0.95, metal: 0 },
      { pos: [-2.6, 1.25, -5], r: 0.5, color: '#9a9a93', rough: 0.95, metal: 0 },
    ],
    bloomThr: 0.85, bloomInt: 0.16, fog: [15, 46], grain: 0.055,
    swatches: ['#0d0e12', '#cfcfc7', '#a3b48d', '#d8d8d2'],
  },
  {
    id: 'golden', n: '04', name: 'Golden Hour', tag: 'Warm cinematic',
    void: '#0a0806', neb: ['#0a0806', '#2c1808', '#502c12'], accent: '#e8a35f',
    sun: '#ffcf87', sunPos: [-4, 1.5, 2.5], fill: '#a05a2a',
    planets: [
      { pos: [1.5, -0.2, 0], r: 1.05, color: '#caa07a', rough: 0.7, metal: 0.06 },
      { pos: [-2.5, 1.0, -5], r: 0.55, color: '#9a6e4a', rough: 0.8, metal: 0 },
    ],
    bloomThr: 0.55, bloomInt: 0.7, fog: [13, 40], grain: 0.055, sunSphere: true,
    swatches: ['#0a0806', '#e8a35f', '#caa07a', '#ffe9c8'],
  },
]

/* ------------------------------------------------------------------ *
 *  Gradient void backdrop                                             *
 * ------------------------------------------------------------------ */
function NebulaBackdrop({ colors }: { colors: [string, string, string] }) {
  const uniforms = useMemo(
    () => ({
      uDeep: { value: new THREE.Color(colors[0]) },
      uMid: { value: new THREE.Color(colors[1]) },
      uBright: { value: new THREE.Color(colors[2]) },
    }),
    [colors],
  )
  return (
    <mesh scale={[60, 60, 60]}>
      <sphereGeometry args={[1, 32, 24]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vPos;
          void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `}
        fragmentShader={`
          uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uBright;
          varying vec3 vPos;
          void main() {
            vec3 d = normalize(vPos);
            float t = d.y * 0.5 + 0.5;
            // a soft off-axis glow centre for nebula depth
            float glow = pow(max(0.0, 1.0 - distance(d.xy, vec2(0.35, 0.18))), 2.2);
            vec3 c = mix(uDeep, uMid, smoothstep(0.0, 0.65, t));
            c = mix(c, uBright, smoothstep(0.5, 1.0, t) * 0.5 + glow * 0.45);
            gl_FragColor = vec4(c, 1.0);
          }
        `}
      />
    </mesh>
  )
}

function Planet({ pos, r, color, rough, metal }: Planet) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.06 })
  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[r, 48, 48]} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
    </mesh>
  )
}

function AuroraLights() {
  const a = useRef<THREE.PointLight>(null)
  const b = useRef<THREE.PointLight>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (a.current) { a.current.position.x = Math.sin(t * 0.3) * 3; a.current.position.y = 1.5 + Math.cos(t * 0.22) * 0.8 }
    if (b.current) { b.current.position.x = Math.cos(t * 0.26) * 3.2; b.current.position.y = -1 + Math.sin(t * 0.3) * 0.7 }
  })
  return (
    <>
      <pointLight ref={a} color="#5eead4" intensity={0.7} distance={12} position={[2, 2, 1]} />
      <pointLight ref={b} color="#a78bfa" intensity={0.6} distance={12} position={[-2, -1, 1]} />
    </>
  )
}

function Scene({ cfg }: { cfg: Dir }) {
  const grp = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (grp.current) grp.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.08) * 0.12
  })
  return (
    <>
      <color attach="background" args={[cfg.void]} />
      <fog attach="fog" args={[cfg.void, cfg.fog[0], cfg.fog[1]]} />
      <NebulaBackdrop colors={cfg.neb} />
      <Stars radius={42} depth={32} count={750} factor={2.2} saturation={0} fade speed={0.3} />

      <ambientLight intensity={0.18} />
      <directionalLight position={cfg.sunPos} intensity={1.3} color={cfg.sun} />
      <pointLight position={[-3, -2, 3]} intensity={0.45} color={cfg.fill} />
      {cfg.aurora && <AuroraLights />}

      <group ref={grp}>
        {cfg.planets.map((p, i) => <Planet key={i} {...p} />)}
      </group>

      {cfg.sunSphere && (
        <mesh position={cfg.sunPos}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshBasicMaterial color={cfg.sun} />
        </mesh>
      )}

      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={cfg.bloomThr} intensity={cfg.bloomInt} />
        <Vignette offset={0.24} darkness={0.72} eskil={false} />
        <Noise premultiply opacity={cfg.grain} />
      </EffectComposer>
    </>
  )
}

/* ------------------------------------------------------------------ *
 *  Preview tile                                                       *
 * ------------------------------------------------------------------ */
function Preview({ cfg }: { cfg: Dir }) {
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: '16 / 10', backgroundColor: cfg.void, border: '1px solid rgba(255,255,255,0.09)' }}>
      <Canvas dpr={1} camera={{ position: [0, 0, 6], fov: 50 }} gl={{ antialias: true }} style={{ position: 'absolute', inset: 0 }}>
        <Suspense fallback={null}><Scene cfg={cfg} /></Suspense>
      </Canvas>

      {/* overlay HUD — clean, NO neon glow */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 sm:p-7">
        <div>
          <div className={`${mono.className} text-[11px]`} style={{ color: cfg.accent, letterSpacing: '0.24em' }}>{cfg.n}</div>
          <h3 className={`${grotesk.className} mt-2 text-[22px] font-medium`} style={{ color: '#f4f4f5', letterSpacing: '-0.01em' }}>{cfg.name}</h3>
          <p className={`${grotesk.className} mt-1 text-[12.5px] font-normal`} style={{ color: 'rgba(255,255,255,0.55)' }}>{cfg.tag}</p>
        </div>
        <div className="flex items-center gap-2">
          {cfg.swatches.map((s) => (
            <span key={s} className="h-4 w-4 rounded-full" style={{ background: s, boxShadow: '0 0 0 1px rgba(255,255,255,0.18)' }} />
          ))}
        </div>
      </div>
      {/* hairline corner ticks (editorial, not glow) */}
      <span aria-hidden className="absolute left-3 top-3 h-3 w-3 border-l border-t" style={{ borderColor: 'rgba(255,255,255,0.25)' }} />
      <span aria-hidden className="absolute bottom-3 right-3 h-3 w-3 border-b border-r" style={{ borderColor: 'rgba(255,255,255,0.25)' }} />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 *  Page                                                               *
 * ------------------------------------------------------------------ */
export default function LabPage() {
  return (
    <main className={grotesk.className} style={{ backgroundColor: '#08090c', color: '#f4f4f5', minHeight: '100vh' }}>
      <div className="mx-auto max-w-[1400px] px-6 py-16 sm:px-10">
        <header className="mb-10">
          <div className={`${mono.className} text-[11px] uppercase`} style={{ color: '#7fd4cf', letterSpacing: '0.26em' }}>
            Tunnel Lab · Premium directions (live 3D)
          </div>
          <h1 className="mt-5 text-[clamp(2.2rem,5vw,46px)] font-bold tracking-tight" style={{ lineHeight: 1.02 }}>
            Four ways the tunnel could feel.
          </h1>
          <p className="mt-4 max-w-[44rem] text-[15px] font-light leading-[1.7]" style={{ color: '#9ca0ab' }}>
            Each tile is a real mini-scene — gradient void, stars, lit planets and cinematic
            post-processing (subtle bloom · vignette · film grain). No cyberpunk neon, no glow halos.
            Hover-free, just look. Pick a number and I&apos;ll build it into the real tunnel.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {DIRECTIONS.map((c) => <Preview key={c.id} cfg={c} />)}
        </div>

        <footer className="mt-10 text-center">
          <span className={`${mono.className} text-[11px] uppercase`} style={{ color: '#52525b', letterSpacing: '0.24em' }}>
            01 Deep Field · 02 Aurora Atelier · 03 Gallery in Space · 04 Golden Hour
          </span>
        </footer>
      </div>
    </main>
  )
}

// app/tunnel-lights/page.tsx — sandbox for tunnel lighting concepts.
// Round 5: full-environment vibes — warp speed, equalizer, HUD targeting,
// cube grid pulse, data center LEDs, bioluminescent jellies.

'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

type Variant =
  | 'warp-speed'
  | 'equalizer'
  | 'hud-targeting'
  | 'cube-grid-wave'
  | 'data-center'
  | 'bioluminescent'

const VARIANTS: Array<{ id: Variant; title: string; blurb: string }> = [
  { id: 'warp-speed',     title: '1 · Hyperspace warp',  blurb: 'Star Wars / Star Trek warp — stretched star lines blasting past the camera.' },
  { id: 'equalizer',      title: '2 · Audio equalizer',  blurb: 'Vertical bars wrapping the tunnel circumference, dancing to a fake audio waveform.' },
  { id: 'hud-targeting',  title: '3 · HUD targeting',    blurb: 'Fighter-jet HUD: cross-hair reticles, brackets, range markers floating in tunnel depth.' },
  { id: 'cube-grid-wave', title: '4 · Cube grid pulse',  blurb: '3D lattice of wireframe cubes — a pulse wave sweeps through, lighting them up in sequence.' },
  { id: 'data-center',    title: '5 · Data center LEDs', blurb: 'Stacked LED strips along the tunnel walls blinking like server-rack status lights.' },
  { id: 'bioluminescent', title: '6 · Bioluminescent',   blurb: 'Soft glowing organic blobs drift slowly — deep-sea jellyfish vibe, calm and dreamy.' },
]

const TUBE_LENGTH = 60
const TUBE_RADIUS = 3.2
const ACCENT      = '#5EEAD4'

// ─────────────────────────────────────────────────────────────────────────────
// 1. WARP SPEED — stretched star lines blasting toward the camera
// ─────────────────────────────────────────────────────────────────────────────
function WarpSpeed() {
  const COUNT = 220
  const geom = useMemo(() => {
    // Each star is a 2-vertex line: head + tail
    const positions = new Float32Array(COUNT * 2 * 3)
    return positions
  }, [])
  const refGeom = useRef<THREE.BufferGeometry>(null)
  const starsRef = useRef(
    Array.from({ length: COUNT }, (_, i) => {
      const seed = (n: number) => {
        const s = Math.sin(i * 12.9898 + n * 7.31) * 43758.5453
        return s - Math.floor(s)
      }
      const a = seed(1) * Math.PI * 2
      const r = TUBE_RADIUS * (0.1 + seed(2) * 0.95)
      return {
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        z: -seed(3) * TUBE_LENGTH,
        speed: 30 + seed(4) * 30,
        length: 1.5 + seed(5) * 3.5,
      }
    }),
  )

  useFrame((_, dt) => {
    const buf = geom
    starsRef.current.forEach((s, i) => {
      s.z += dt * s.speed
      if (s.z > 3) {
        s.z = -TUBE_LENGTH
        // randomize angle slightly
        const ang = Math.random() * Math.PI * 2
        const r = TUBE_RADIUS * (0.1 + Math.random() * 0.95)
        s.x = Math.cos(ang) * r
        s.y = Math.sin(ang) * r
        s.speed = 30 + Math.random() * 30
      }
      const i6 = i * 6
      buf[i6 + 0] = s.x;          buf[i6 + 1] = s.y;          buf[i6 + 2] = s.z
      buf[i6 + 3] = s.x;          buf[i6 + 4] = s.y;          buf[i6 + 5] = s.z - s.length
    })
    if (refGeom.current) {
      refGeom.current.attributes.position.needsUpdate = true
    }
  })

  return (
    <lineSegments>
      <bufferGeometry ref={refGeom}>
        <bufferAttribute attach="attributes-position" args={[geom, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#C6F8EE" transparent opacity={0.9} toneMapped={false} />
    </lineSegments>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EQUALIZER — vertical bars wrapping the tunnel, dancing to fake audio
// ─────────────────────────────────────────────────────────────────────────────
function Equalizer() {
  const BARS = 56
  const groupRef = useRef<THREE.Group>(null)
  const phases = useMemo(
    () => Array.from({ length: BARS }, (_, i) => i * 0.31),
    [],
  )
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    groupRef.current.children.forEach((c, i) => {
      const m = c as THREE.Mesh
      // Multiple sine harmonics → mock spectrum bouncing
      const v =
        0.5 + 0.5 * Math.sin(t * 2.5 + phases[i]) * 0.55 +
        0.25 * Math.sin(t * 1.7 + phases[i] * 1.7) +
        0.15 * Math.sin(t * 4.1 + phases[i] * 0.6)
      const h = 0.2 + Math.max(0, v) * 1.6
      m.scale.set(1, h, 1)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = 0.5 + Math.max(0, v) * 0.5
    })
  })
  return (
    <group ref={groupRef} position={[0, 0, -TUBE_LENGTH / 2]}>
      {Array.from({ length: BARS }).map((_, i) => {
        const angle = (i / BARS) * Math.PI * 2
        const x = Math.cos(angle) * TUBE_RADIUS * 0.92
        const y = Math.sin(angle) * TUBE_RADIUS * 0.92
        // Slim plane facing inward, anchored at bottom so scale.y grows upward
        return (
          <group key={i} position={[x, y, 0]} rotation={[0, 0, angle + Math.PI / 2]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.16, 1, 0.06]} />
              <meshBasicMaterial color={ACCENT} transparent opacity={0.7} toneMapped={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HUD TARGETING — bracketed reticles + range markers floating in depth
// ─────────────────────────────────────────────────────────────────────────────
function HudTargeting() {
  // Five reticles distributed along the tunnel, each at a different angle.
  const RETICLES = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const seed = (n: number) => {
      const s = Math.sin(i * 9.7 + n * 11.13) * 43758.5453
      return s - Math.floor(s)
    }
    return {
      z: -((i + 1) / 8) * TUBE_LENGTH,
      angle: seed(1) * Math.PI * 2,
      radius: TUBE_RADIUS * (0.55 + seed(2) * 0.4),
      size: 0.35 + seed(3) * 0.35,
      rotSpeed: (seed(4) - 0.5) * 1.2,
      pulseSpeed: 0.7 + seed(5) * 0.8,
    }
  }), [])

  return (
    <group>
      {RETICLES.map((r, i) => (
        <Reticle key={i} {...r} />
      ))}
      {/* Concentric range rings receding into the distance */}
      {Array.from({ length: 8 }).map((_, i) => {
        const z = -(i + 1) * (TUBE_LENGTH / 9)
        return (
          <mesh key={`range-${i}`} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[TUBE_RADIUS * 0.95, 0.012, 6, 64]} />
            <meshBasicMaterial color={ACCENT} transparent opacity={0.22} toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  )
}

function Reticle({ z, angle, radius, size, rotSpeed, pulseSpeed }: {
  z: number; angle: number; radius: number; size: number; rotSpeed: number; pulseSpeed: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.LineBasicMaterial>(null)
  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.z += dt * rotSpeed
    if (matRef.current) {
      const t = performance.now() * 0.001
      matRef.current.opacity = 0.6 + 0.35 * Math.sin(t * pulseSpeed)
    }
  })
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  // Build a bracket-corner reticle: 4 L-shapes around a centre cross.
  const geom = useMemo(() => {
    const pts: number[] = []
    const s = size
    const arm = s * 0.32
    // 4 corner brackets
    const corners = [[ s,  s], [-s,  s], [-s, -s], [ s, -s]]
    for (const [cx, cy] of corners) {
      pts.push(cx, cy, 0, cx - Math.sign(cx) * arm, cy, 0)
      pts.push(cx, cy, 0, cx, cy - Math.sign(cy) * arm, 0)
    }
    // Centre crosshair
    pts.push(-s * 0.18, 0, 0,  s * 0.18, 0, 0)
    pts.push(0, -s * 0.18, 0,  0,  s * 0.18, 0)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3))
    return g
  }, [size])
  return (
    <group ref={groupRef} position={[x, y, z]}>
      <lineSegments>
        <primitive object={geom} attach="geometry" />
        <lineBasicMaterial ref={matRef} color={ACCENT} transparent opacity={0.85} toneMapped={false} />
      </lineSegments>
      {/* Small dot inside */}
      <mesh>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#C6F8EE" toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CUBE GRID WAVE — 3D lattice of wireframe cubes, pulse sweeps through
// ─────────────────────────────────────────────────────────────────────────────
function CubeGridWave() {
  // Grid: 5 rings × 12 cubes per ring × 18 along the length = ~10 cubes per row
  const SLICES = 16     // along tunnel length
  const CUBES_PER_SLICE = 10
  const cubes = useMemo(() => {
    const arr: { x: number; y: number; z: number; sliceIdx: number }[] = []
    for (let s = 0; s < SLICES; s++) {
      const z = -(s / (SLICES - 1)) * TUBE_LENGTH
      for (let c = 0; c < CUBES_PER_SLICE; c++) {
        const a = (c / CUBES_PER_SLICE) * Math.PI * 2
        arr.push({
          x: Math.cos(a) * TUBE_RADIUS * 0.85,
          y: Math.sin(a) * TUBE_RADIUS * 0.85,
          z,
          sliceIdx: s,
        })
      }
    }
    return arr
  }, [])
  const matsRef = useRef<THREE.MeshBasicMaterial[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    cubes.forEach((c, i) => {
      const mat = matsRef.current[i]
      if (!mat) return
      const sliceT = c.sliceIdx / (SLICES - 1)
      // Wave head sweeps from far end (sliceT=1) to near (sliceT=0), repeating
      const head = (t * 0.18) % 1
      const dist = Math.abs(sliceT - head)
      mat.opacity = Math.max(0.1, 1 - dist * 4) * 0.95
    })
  })
  return (
    <group>
      {cubes.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]}>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
          <meshBasicMaterial
            ref={(m) => { if (m) matsRef.current[i] = m }}
            color={ACCENT}
            wireframe
            transparent
            opacity={0.2}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DATA CENTER LEDs — stacked LED strips along left/right walls blinking
// ─────────────────────────────────────────────────────────────────────────────
function DataCenter() {
  const LEDS_PER_STRIP = 60
  const STRIPS = 8  // around circumference
  const totalLeds = LEDS_PER_STRIP * STRIPS
  const positions = useMemo(() => {
    const pos = new Float32Array(totalLeds * 3)
    for (let s = 0; s < STRIPS; s++) {
      const angle = (s / STRIPS) * Math.PI * 2
      const x = Math.cos(angle) * TUBE_RADIUS * 0.97
      const y = Math.sin(angle) * TUBE_RADIUS * 0.97
      for (let l = 0; l < LEDS_PER_STRIP; l++) {
        const z = -(l / (LEDS_PER_STRIP - 1)) * TUBE_LENGTH
        const i = (s * LEDS_PER_STRIP + l) * 3
        pos[i + 0] = x; pos[i + 1] = y; pos[i + 2] = z
      }
    }
    return pos
  }, [])
  const seeds = useMemo(() => {
    const arr = new Float32Array(totalLeds)
    for (let i = 0; i < totalLeds; i++) {
      const s = Math.sin(i * 12.9898) * 43758.5453
      arr[i] = s - Math.floor(s)
    }
    return arr
  }, [totalLeds])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color(ACCENT) },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      varying float vBright;
      void main() {
        // Each LED randomly blinks at its own phase
        float blink = step(0.5, sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 30.0));
        // Always-on dim baseline
        vBright = 0.18 + blink * 0.82;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 8.0 * (1.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vBright;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float falloff = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor, vBright * falloff);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }), [])
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime })
  return (
    <points material={mat}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed"    args={[seeds, 1]} />
      </bufferGeometry>
    </points>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. BIOLUMINESCENT — soft glowing organic blobs drifting along the tunnel
// ─────────────────────────────────────────────────────────────────────────────
function Bioluminescent() {
  const COUNT = 14
  const blobs = useMemo(() => Array.from({ length: COUNT }, (_, i) => {
    const seed = (n: number) => {
      const s = Math.sin(i * 9.7 + n * 3.13) * 43758.5453
      return s - Math.floor(s)
    }
    return {
      x: (seed(1) - 0.5) * 2 * TUBE_RADIUS * 0.75,
      y: (seed(2) - 0.5) * 2 * TUBE_RADIUS * 0.75,
      z: -seed(3) * TUBE_LENGTH,
      size: 0.4 + seed(4) * 0.9,
      drift: 0.15 + seed(5) * 0.3,
      pulse: 1 + seed(6) * 1.5,
      phase: seed(7) * Math.PI * 2,
    }
  }), [])
  const matsRef = useRef<THREE.MeshBasicMaterial[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    blobs.forEach((b, i) => {
      const mat = matsRef.current[i]
      if (!mat) return
      mat.opacity = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * b.pulse + b.phase))
    })
  })
  return (
    <group>
      {blobs.map((b, i) => (
        <BioBlob key={i} blob={b} matRefSetter={(m) => { if (m) matsRef.current[i] = m }} />
      ))}
    </group>
  )
}

function BioBlob({
  blob, matRefSetter,
}: {
  blob: { x: number; y: number; z: number; size: number; drift: number; pulse: number; phase: number }
  matRefSetter: (m: THREE.MeshBasicMaterial | null) => void
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.position.z += dt * blob.drift
    if (ref.current.position.z > 4) ref.current.position.z = -TUBE_LENGTH
  })
  return (
    <mesh ref={ref} position={[blob.x, blob.y, blob.z]}>
      <sphereGeometry args={[blob.size, 24, 24]} />
      <meshBasicMaterial
        ref={matRefSetter}
        color={ACCENT}
        transparent
        opacity={0.4}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function VariantCanvas({ variant }: { variant: Variant }) {
  return (
    <Canvas
      camera={{ fov: 60, near: 0.1, far: 200, position: [0, 0, 2] }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: '#05050A' }}
    >
      <fog attach="fog" args={['#05050A', 8, 55]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, -5]} intensity={1.2} color={ACCENT} />
      {variant === 'warp-speed'     && <WarpSpeed     />}
      {variant === 'equalizer'      && <Equalizer     />}
      {variant === 'hud-targeting'  && <HudTargeting  />}
      {variant === 'cube-grid-wave' && <CubeGridWave  />}
      {variant === 'data-center'    && <DataCenter    />}
      {variant === 'bioluminescent' && <Bioluminescent />}
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  )
}

export default function TunnelLightsPage() {
  return (
    <main
      style={{
        background: '#05050A',
        minHeight:  '100vh',
        padding:    '32px 28px 64px',
        color:      '#F5F5F7',
        fontFamily: 'var(--font-display), system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1480, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase',
            color: ACCENT, marginBottom: 6,
            textShadow: `0 0 10px ${ACCENT}66`,
          }}>
            SANDBOX · /tunnel-lights · round 5
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: '-0.02em',
          }}>
            Tunnel light concepts
          </h1>
          <p style={{
            fontSize: 14, color: 'rgba(245,245,247,0.6)',
            margin: '8px 0 0', maxWidth: 720,
          }}>
            Full-environment vibes — warp speed, equalizer, jet HUD, cube grid
            pulse, server LEDs, glowing jellies. Pick one and I&apos;ll wire it.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: 22,
          }}
        >
          {VARIANTS.map((v) => (
            <div
              key={v.id}
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: `1px solid ${ACCENT}33`,
                background: '#0A0A14',
                boxShadow: `0 0 0 1px ${ACCENT}10, 0 8px 24px rgba(0,0,0,0.5)`,
              }}
            >
              <div style={{ aspectRatio: '16 / 10', position: 'relative' }}>
                <VariantCanvas variant={v.id} />
              </div>
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: ACCENT, marginBottom: 6,
                }}>
                  {v.title}
                </div>
                <div style={{
                  fontSize: 13, color: 'rgba(245,245,247,0.72)', lineHeight: 1.45,
                }}>
                  {v.blurb}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

// app/tunnel-lights/page.tsx — sandbox for tunnel lighting concepts (round 2).
// Each card is a fundamentally different visual style, not refinements of the
// dotted constellation. Not wired into the production scene.

'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

type Variant =
  | 'neon-tubes'
  | 'vertical-strips'
  | 'flow-bands'
  | 'helix'
  | 'laser-pulses'
  | 'hex-panels'

const VARIANTS: Array<{ id: Variant; title: string; blurb: string }> = [
  { id: 'neon-tubes',      title: '1 · Solid neon rings',  blurb: 'Thick glowing toroidal tubes, additive blend, heavy bloom. Classic Tron corridor.' },
  { id: 'vertical-strips', title: '2 · Strip lighting',    blurb: 'Long thin glowing strips running the length of the tunnel, like a subway corridor.' },
  { id: 'flow-bands',      title: '3 · Pulsing flow',      blurb: 'Bright horizontal bands rush past the camera in a continuous data-stream loop.' },
  { id: 'helix',           title: '4 · Helix spiral',      blurb: 'A single continuous light strand spirals down the inner wall of the tunnel.' },
  { id: 'laser-pulses',    title: '5 · Laser pulses',      blurb: 'Discrete bright rings burst from the far end and rush toward the viewer.' },
  { id: 'hex-panels',      title: '6 · Hex grid panels',   blurb: 'Tunnel wall is a hexagonal lattice, individual cells flicker and glow.' },
]

const TUBE_LENGTH = 60
const TUBE_RADIUS = 3.2
const ACCENT      = '#5EEAD4'

// ─────────────────────────────────────────────────────────────────────────────
// 1. NEON RINGS — TorusGeometry instanced at intervals
// ─────────────────────────────────────────────────────────────────────────────
function NeonTubes() {
  const groupRef = useRef<THREE.Group>(null)
  const RINGS = 22
  const positions = useMemo(
    () => Array.from({ length: RINGS }, (_, i) => -(i / (RINGS - 1)) * TUBE_LENGTH),
    [],
  )
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    groupRef.current.children.forEach((c, i) => {
      const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial
      const pulse = 0.6 + 0.4 * Math.sin(t * 0.8 + i * 0.4)
      mat.opacity = 0.55 * pulse + 0.25
    })
  })
  return (
    <group ref={groupRef}>
      {positions.map((z, i) => (
        <mesh key={i} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TUBE_RADIUS, 0.045, 12, 96]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.7} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VERTICAL STRIPS — long thin glowing rectangles along the tunnel length
// ─────────────────────────────────────────────────────────────────────────────
function VerticalStrips() {
  const STRIP_COUNT = 12
  const groupRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    groupRef.current.children.forEach((c, i) => {
      const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.1 + i * 0.6)
      mat.opacity = 0.35 + 0.45 * pulse
    })
  })
  return (
    <group ref={groupRef}>
      {Array.from({ length: STRIP_COUNT }).map((_, i) => {
        const angle = (i / STRIP_COUNT) * Math.PI * 2
        const x = Math.cos(angle) * TUBE_RADIUS
        const y = Math.sin(angle) * TUBE_RADIUS
        return (
          <mesh
            key={i}
            position={[x, y, -TUBE_LENGTH / 2]}
            rotation={[0, 0, angle + Math.PI / 2]}
          >
            {/* thin tall plane facing inward */}
            <planeGeometry args={[0.08, TUBE_LENGTH]} />
            <meshBasicMaterial
              color={ACCENT}
              transparent
              opacity={0.6}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FLOW BANDS — tube-interior shader, horizontal bands streaming toward camera
// ─────────────────────────────────────────────────────────────────────────────
function FlowBands() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const geom = useMemo(
    () => new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, 64, 1, true),
    [],
  )
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color(ACCENT) },
    },
    vertexShader: /* glsl */ `
      varying float vY;
      void main() {
        vY = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3  uColor;
      varying float vY;
      void main() {
        float v = vY + uTime * 6.0;
        // Repeating bands every 4 units
        float band = 0.5 + 0.5 * sin(v * 1.6);
        float pulse = pow(band, 12.0);  // sharper bands
        float a = 0.04 + pulse * 0.7;
        gl_FragColor = vec4(uColor, a);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }), [])
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh
      geometry={geom}
      material={mat}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, 0, -TUBE_LENGTH / 2]}
      ref={(m) => { if (m) (matRef as { current: THREE.ShaderMaterial | null }).current = mat }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HELIX — single continuous spiral line on the tunnel wall
// ─────────────────────────────────────────────────────────────────────────────
function Helix() {
  const TURNS = 14
  const SEGMENTS = 600

  // Two helices for a double-strand look (mirrored)
  const helixA = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS
      const angle = t * TURNS * Math.PI * 2
      points.push(new THREE.Vector3(
        Math.cos(angle) * TUBE_RADIUS,
        Math.sin(angle) * TUBE_RADIUS,
        -t * TUBE_LENGTH,
      ))
    }
    const g = new THREE.BufferGeometry().setFromPoints(points)
    return g
  }, [])

  const helixB = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS
      const angle = t * TURNS * Math.PI * 2 + Math.PI
      points.push(new THREE.Vector3(
        Math.cos(angle) * TUBE_RADIUS,
        Math.sin(angle) * TUBE_RADIUS,
        -t * TUBE_LENGTH,
      ))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [])

  const groupRef = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!groupRef.current) return
    groupRef.current.rotation.z += dt * 0.25
  })

  return (
    <group ref={groupRef}>
      <line>
        <primitive object={helixA} attach="geometry" />
        <lineBasicMaterial color={ACCENT} transparent opacity={0.85} toneMapped={false} />
      </line>
      <line>
        <primitive object={helixB} attach="geometry" />
        <lineBasicMaterial color="#C6F8EE" transparent opacity={0.55} toneMapped={false} />
      </line>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. LASER PULSES — rings spawn at the far end and rush toward the camera
// ─────────────────────────────────────────────────────────────────────────────
function LaserPulses() {
  const PULSE_COUNT = 6
  const groupRef = useRef<THREE.Group>(null)
  const phaseRef = useRef<number[]>(
    Array.from({ length: PULSE_COUNT }, (_, i) => i / PULSE_COUNT),
  )
  useFrame((_, dt) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((c, i) => {
      const m = c as THREE.Mesh
      let phase = phaseRef.current[i] + dt * 0.5
      if (phase > 1) phase -= 1
      phaseRef.current[i] = phase
      const z = -TUBE_LENGTH + phase * (TUBE_LENGTH + 4)
      m.position.z = z
      const mat = m.material as THREE.MeshBasicMaterial
      // Fade in/out at both ends
      const fade = Math.sin(phase * Math.PI)
      mat.opacity = 0.95 * fade
      // Slight scale change for depth illusion
      m.scale.setScalar(1 + (1 - phase) * 0.05)
    })
  })
  return (
    <group ref={groupRef}>
      {Array.from({ length: PULSE_COUNT }).map((_, i) => (
        <mesh key={i} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TUBE_RADIUS, 0.06, 8, 96]} />
          <meshBasicMaterial color="#C6F8EE" transparent opacity={0.9} toneMapped={false} />
        </mesh>
      ))}
      {/* Static dim outline rings for context */}
      {[-50, -35, -20, -8].map((z, i) => (
        <mesh key={`ctx-${i}`} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TUBE_RADIUS, 0.015, 6, 64]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.18} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. HEX PANELS — procedural hex shader on tunnel interior
// ─────────────────────────────────────────────────────────────────────────────
function HexPanels() {
  const geom = useMemo(
    () => new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, 64, 1, true),
    [],
  )
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color(ACCENT) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3  uColor;
      varying vec2 vUv;

      // Hex grid SDF: returns distance to nearest hex centre + cell id
      vec3 hex(vec2 p) {
        p.x *= 1.1547;       // 2/sqrt(3) — flat-top hex
        vec2 i = floor(p);
        vec2 f = fract(p);
        // Offset on odd rows
        if (mod(i.y, 2.0) > 0.5) f.x = fract(p.x + 0.5);
        float d = length(f - vec2(0.5));
        return vec3(d, i.x, i.y);
      }

      void main() {
        vec2 uv = vec2(vUv.x * 28.0, vUv.y * 12.0);
        vec3 h  = hex(uv);
        float d = h.x;
        float cellId = h.y * 31.7 + h.z * 17.3;
        float rand   = fract(sin(cellId) * 43758.5453);
        // Flicker each cell at its own phase
        float pulse = 0.4 + 0.6 * sin(uTime * 1.3 + rand * 6.28);
        float edge  = smoothstep(0.48, 0.5, d);   // inverted: 1 inside cell, 0 at border
        float fill  = (1.0 - edge) * pulse * (0.2 + rand * 0.8);
        float border = smoothstep(0.46, 0.49, d) * (1.0 - smoothstep(0.5, 0.52, d));
        float a = fill * 0.4 + border * 0.5;
        gl_FragColor = vec4(uColor, a);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }), [])
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh
      geometry={geom}
      material={mat}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, 0, -TUBE_LENGTH / 2]}
    />
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
      {variant === 'neon-tubes'      && <NeonTubes />}
      {variant === 'vertical-strips' && <VerticalStrips />}
      {variant === 'flow-bands'      && <FlowBands />}
      {variant === 'helix'           && <Helix />}
      {variant === 'laser-pulses'    && <LaserPulses />}
      {variant === 'hex-panels'      && <HexPanels />}
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={1.1}
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
            SANDBOX · /tunnel-lights · round 2
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
            Fundamentally different visual styles for the tunnel — not refinements
            of the current dotted constellation. Tell me which one(s) feel right
            and I&apos;ll wire the winner into the main scene.
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

// app/tunnel-lights/page.tsx — sandbox for tunnel lighting concepts.
// Round 4: dramatic / cinematic concepts — lightning, comets, stargate,
// pulse waves, nebula gas, liquid mercury.

'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

type Variant =
  | 'lightning-arcs'
  | 'comet-streaks'
  | 'stargate-vortex'
  | 'pulse-waves'
  | 'nebula-gas'
  | 'liquid-mercury'

const VARIANTS: Array<{ id: Variant; title: string; blurb: string }> = [
  { id: 'lightning-arcs',  title: '1 · Lightning arcs',  blurb: 'Branching electrical bolts flash randomly across the tunnel interior. Dramatic and chaotic.' },
  { id: 'comet-streaks',   title: '2 · Comet streaks',   blurb: 'Bright comet heads with long tails streak through the tunnel at varied angles and speeds.' },
  { id: 'stargate-vortex', title: '3 · Stargate vortex', blurb: 'Radial spiral animation at the far end of the tunnel, pulling visually inward like a wormhole.' },
  { id: 'pulse-waves',     title: '4 · Pulse waves',     blurb: 'Concentric expanding rings emanate from the camera outward — sonar-from-you feeling.' },
  { id: 'nebula-gas',      title: '5 · Nebula gas',      blurb: 'Volumetric gas clouds in cyan + violet drifting along the tunnel walls. Colorful + dreamy.' },
  { id: 'liquid-mercury',  title: '6 · Liquid mercury',  blurb: 'Wet metallic shimmer with animated displacement — wall looks like flowing liquid metal.' },
]

const TUBE_LENGTH = 60
const TUBE_RADIUS = 3.2
const ACCENT      = '#5EEAD4'

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIGHTNING ARCS — random branching segments that flash briefly
// ─────────────────────────────────────────────────────────────────────────────
function LightningArcs() {
  const MAX_ARCS = 4
  const SEGMENTS_PER_ARC = 12
  const geoms = useMemo(
    () => Array.from({ length: MAX_ARCS }, () => new THREE.BufferGeometry()),
    [],
  )
  const matsRef = useRef<THREE.LineBasicMaterial[]>([])
  const arcsRef = useRef<Array<{ alive: boolean; ttl: number; born: number }>>(
    Array.from({ length: MAX_ARCS }, () => ({ alive: false, ttl: 0, born: 0 })),
  )

  const spawnArc = (idx: number, now: number) => {
    const pts: number[] = []
    // Pick two random points on the wall and a few jagged intermediates
    const startA = Math.random() * Math.PI * 2
    const endA   = startA + (Math.random() - 0.5) * Math.PI * 1.2
    const startZ = -Math.random() * TUBE_LENGTH
    const endZ   = startZ + (Math.random() - 0.5) * 12
    for (let s = 0; s <= SEGMENTS_PER_ARC; s++) {
      const t = s / SEGMENTS_PER_ARC
      const ang = startA * (1 - t) + endA * t + (Math.random() - 0.5) * 0.5
      const z   = startZ * (1 - t) + endZ * t
      const r   = TUBE_RADIUS * (0.6 + Math.random() * 0.35)
      pts.push(Math.cos(ang) * r, Math.sin(ang) * r, z)
    }
    // Convert to lineSegments (paired vertices)
    const segs: number[] = []
    for (let s = 0; s < SEGMENTS_PER_ARC; s++) {
      const a = s * 3, b = (s + 1) * 3
      segs.push(pts[a], pts[a + 1], pts[a + 2], pts[b], pts[b + 1], pts[b + 2])
    }
    geoms[idx].setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3))
    geoms[idx].attributes.position.needsUpdate = true
    arcsRef.current[idx] = { alive: true, ttl: 0.15 + Math.random() * 0.2, born: now }
  }

  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    arcsRef.current.forEach((arc, i) => {
      const mat = matsRef.current[i]
      if (!mat) return
      if (arc.alive) {
        const age = now - arc.born
        if (age > arc.ttl) {
          arc.alive = false
          mat.opacity = 0
        } else {
          const t = age / arc.ttl
          mat.opacity = (1 - t) * 0.95 * (0.8 + Math.random() * 0.2)
        }
      } else if (Math.random() < 0.012) {
        spawnArc(i, now)
      }
    })
  })

  return (
    <group>
      {geoms.map((g, i) => (
        <lineSegments key={i}>
          <primitive object={g} attach="geometry" />
          <lineBasicMaterial
            ref={(m) => { if (m) matsRef.current[i] = m }}
            color="#C6F8EE"
            transparent
            opacity={0}
            toneMapped={false}
            linewidth={2}
          />
        </lineSegments>
      ))}
      {/* Faint static outline rings for tunnel context */}
      {[-50, -32, -16, -4].map((z, i) => (
        <mesh key={`ctx-${i}`} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TUBE_RADIUS, 0.012, 6, 64]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.18} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMET STREAKS — bright heads with long trails through the tube
// ─────────────────────────────────────────────────────────────────────────────
function CometStreaks() {
  const COMETS = 7
  const TRAIL_LEN = 18
  const groupRef = useRef<THREE.Group>(null)
  const cometsRef = useRef(
    Array.from({ length: COMETS }, (_, i) => {
      const seed = Math.sin(i * 31.13)
      return {
        angle: (i / COMETS) * Math.PI * 2 + seed,
        radius: TUBE_RADIUS * (0.4 + ((seed * 1.3) % 1 + 1) % 1 * 0.5),
        speed: 12 + ((seed * 2.7) % 1 + 1) % 1 * 14,
        z: -((i / COMETS) * TUBE_LENGTH),
      }
    }),
  )
  const trailGeoms = useMemo(
    () => Array.from({ length: COMETS }, () => new THREE.BufferGeometry()),
    [],
  )

  useFrame((_, dt) => {
    cometsRef.current.forEach((c, i) => {
      c.z += dt * c.speed
      if (c.z > 3) c.z = -TUBE_LENGTH - 3
      const pts = new Float32Array(TRAIL_LEN * 3)
      for (let s = 0; s < TRAIL_LEN; s++) {
        const ts = c.z - s * (c.speed * 0.018)
        const x = Math.cos(c.angle) * c.radius
        const y = Math.sin(c.angle) * c.radius
        pts[s * 3 + 0] = x
        pts[s * 3 + 1] = y
        pts[s * 3 + 2] = ts
      }
      trailGeoms[i].setAttribute('position', new THREE.BufferAttribute(pts, 3))
      trailGeoms[i].attributes.position.needsUpdate = true
    })
  })

  return (
    <group ref={groupRef}>
      {trailGeoms.map((g, i) => (
        <line key={i}>
          <primitive object={g} attach="geometry" />
          <lineBasicMaterial
            color={i % 2 === 0 ? '#C6F8EE' : ACCENT}
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </line>
      ))}
      {/* Bright head as a glowing point at the leading vertex */}
      {cometsRef.current.map((c, i) => (
        <CometHead key={i} cometRef={cometsRef.current[i]} index={i} />
      ))}
    </group>
  )
}

function CometHead({ cometRef, index }: { cometRef: { angle: number; radius: number; z: number }; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.position.set(
      Math.cos(cometRef.angle) * cometRef.radius,
      Math.sin(cometRef.angle) * cometRef.radius,
      cometRef.z,
    )
  })
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshBasicMaterial color={index % 2 === 0 ? '#FFFFFF' : '#C6F8EE'} toneMapped={false} />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STARGATE VORTEX — radial spiral at the far end of the tunnel
// ─────────────────────────────────────────────────────────────────────────────
function StargateVortex() {
  const geom = useMemo(() => new THREE.CircleGeometry(TUBE_RADIUS * 0.95, 96), [])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color(ACCENT) },
      uColorB:{ value: new THREE.Color('#C6F8EE') },
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
      uniform vec3  uColorB;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        float a = atan(p.y, p.x);
        // Spiral pattern: log-distance + angle, modulated to make arms
        float spiral = sin(a * 5.0 + log(r * 12.0 + 0.1) * 6.0 - uTime * 3.0);
        spiral = 0.5 + 0.5 * spiral;
        float core = exp(-r * 2.5) * 1.5;
        float mask = smoothstep(0.5, 0.0, r);
        float intensity = (spiral * mask * 0.7 + core);
        vec3 col = mix(uColor, uColorB, core * 0.9);
        gl_FragColor = vec4(col, intensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }), [])
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime })

  return (
    <>
      <mesh geometry={geom} material={mat} position={[0, 0, -TUBE_LENGTH]} />
      {/* Faint static context rings */}
      {[-50, -32, -16, -4].map((z, i) => (
        <mesh key={i} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TUBE_RADIUS, 0.012, 6, 64]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.2} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PULSE WAVES — concentric rings expanding from the camera outward
// ─────────────────────────────────────────────────────────────────────────────
function PulseWaves() {
  const WAVE_COUNT = 8
  const groupRef = useRef<THREE.Group>(null)
  const phaseRef = useRef<number[]>(
    Array.from({ length: WAVE_COUNT }, (_, i) => i / WAVE_COUNT),
  )
  useFrame((_, dt) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((c, i) => {
      const m = c as THREE.Mesh
      let phase = phaseRef.current[i] + dt * 0.22
      if (phase > 1) phase -= 1
      phaseRef.current[i] = phase
      // Travels from camera (z=0) into the distance (z=-TUBE_LENGTH)
      m.position.z = -phase * TUBE_LENGTH
      m.scale.setScalar(0.4 + phase * 1.1)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = 0.95 * Math.sin(phase * Math.PI)
    })
  })
  return (
    <group ref={groupRef}>
      {Array.from({ length: WAVE_COUNT }).map((_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TUBE_RADIUS, 0.04, 8, 96]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.9} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. NEBULA GAS — volumetric-looking cloud shader on interior
// ─────────────────────────────────────────────────────────────────────────────
function NebulaGas() {
  const geom = useMemo(
    () => new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, 64, 1, true),
    [],
  )
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uColorA:{ value: new THREE.Color('#5EEAD4') },
      uColorB:{ value: new THREE.Color('#8b5cf6') },
      uColorC:{ value: new THREE.Color('#1e3a8a') },
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
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      varying vec2 vUv;
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
        float v = 0.0; float amp = 0.6;
        for (int i = 0; i < 5; i++) { v += amp * noise(p); p *= 2.0; amp *= 0.5; }
        return v;
      }
      void main() {
        vec2 uv1 = vec2(vUv.x * 5.0, vUv.y * 18.0);
        vec2 uv2 = vec2(vUv.x * 3.0 + 11.0, vUv.y * 14.0 + 23.0);
        float n1 = fbm(uv1 + vec2(uTime * 0.13, uTime * 0.21));
        float n2 = fbm(uv2 + vec2(-uTime * 0.09, uTime * 0.17));
        vec3 col = mix(uColorC, uColorA, n1);
        col = mix(col, uColorB, n2 * 0.7);
        float density = pow(n1 * 0.7 + n2 * 0.4, 1.6);
        gl_FragColor = vec4(col, 0.06 + density * 0.7);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }), [])
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime })
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
// 6. LIQUID MERCURY — animated reflective shimmer
// ─────────────────────────────────────────────────────────────────────────────
function LiquidMercury() {
  const geom = useMemo(
    () => new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, 64, 1, true),
    [],
  )
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color(ACCENT) },
      uHi:    { value: new THREE.Color('#E0FCF6') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3  uColor;
      uniform vec3  uHi;
      varying vec2 vUv;
      varying vec3 vNormal;
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
      void main() {
        // Flowing ripples in uv coords + fresnel-ish edge highlight via normal.z
        vec2 uv = vec2(vUv.x * 4.0, vUv.y * 8.0 + uTime * 0.3);
        float n = noise(uv) * 0.5 + noise(uv * 2.4) * 0.3;
        float wave = sin(uv.y * 6.0 + n * 8.0 + uTime * 1.5);
        float band = pow(0.5 + 0.5 * wave, 4.0);
        float fres = pow(1.0 - abs(vNormal.z), 1.5);
        vec3 col = mix(uColor, uHi, band * 0.9 + fres * 0.3);
        float a = 0.18 + band * 0.55 + fres * 0.25;
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }), [])
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime })
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
      {variant === 'lightning-arcs'  && <LightningArcs  />}
      {variant === 'comet-streaks'   && <CometStreaks   />}
      {variant === 'stargate-vortex' && <StargateVortex />}
      {variant === 'pulse-waves'     && <PulseWaves     />}
      {variant === 'nebula-gas'      && <NebulaGas      />}
      {variant === 'liquid-mercury'  && <LiquidMercury  />}
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
            SANDBOX · /tunnel-lights · round 4
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
            Dramatic / cinematic options — lightning, comets, a stargate, pulse
            waves, nebula gas, liquid mercury. Pick one and I&apos;ll wire it in.
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

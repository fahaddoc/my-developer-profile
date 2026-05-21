// app/tunnel-lights/page.tsx — sandbox for tunnel lighting concepts.
// Round 3: fresh aesthetics — wireframe tube, plasma field, sonar vortex,
// floating debris, code rain, aurora tendrils.

'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

type Variant =
  | 'wireframe-tube'
  | 'plasma-field'
  | 'sonar-vortex'
  | 'floating-debris'
  | 'code-rain'
  | 'aurora-tendrils'

const VARIANTS: Array<{ id: Variant; title: string; blurb: string }> = [
  { id: 'wireframe-tube',  title: '1 · Wireframe tube',     blurb: 'Tunnel rendered as a faceted glowing wireframe lattice. Pulses softly.' },
  { id: 'plasma-field',    title: '2 · Plasma field',       blurb: 'Animated noise-shader plasma swirling on the interior of the tube. Organic.' },
  { id: 'sonar-vortex',    title: '3 · Sonar vortex',       blurb: 'Concentric rings emanate from the far end and expand toward the viewer — wormhole feel.' },
  { id: 'floating-debris', title: '4 · Floating debris',    blurb: 'Wireframe octahedrons drifting in zero-G inside the tunnel. Space junk.' },
  { id: 'code-rain',       title: '5 · Code rain',          blurb: 'Vertical streams of falling cyan glyphs dripping down the tunnel walls.' },
  { id: 'aurora-tendrils', title: '6 · Aurora tendrils',    blurb: 'Long flowing ribbon strands snake through the tunnel like northern lights.' },
]

const TUBE_LENGTH = 60
const TUBE_RADIUS = 3.2
const ACCENT      = '#5EEAD4'

// ─────────────────────────────────────────────────────────────────────────────
// 1. WIREFRAME TUBE — TubeGeometry with wireframe material, pulse
// ─────────────────────────────────────────────────────────────────────────────
function WireframeTube() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const geom = useMemo(() => {
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -TUBE_LENGTH / 2),
      new THREE.Vector3(0, 0, -TUBE_LENGTH),
    ])
    return new THREE.TubeGeometry(path, 48, TUBE_RADIUS, 14, false)
  }, [])
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = 0.55 + 0.25 * Math.sin(clock.elapsedTime * 1.2)
    }
  })
  return (
    <mesh geometry={geom}>
      <meshBasicMaterial
        ref={matRef}
        color={ACCENT}
        wireframe
        transparent
        opacity={0.7}
        toneMapped={false}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PLASMA FIELD — simplex-ish noise shader on cylinder interior
// ─────────────────────────────────────────────────────────────────────────────
function PlasmaField() {
  const geom = useMemo(
    () => new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, 64, 1, true),
    [],
  )
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:   { value: 0 },
      uColor:  { value: new THREE.Color(ACCENT) },
      uColorB: { value: new THREE.Color('#1e293b') },
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

      // Cheap value noise + fbm
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
        for (int i = 0; i < 5; i++) {
          v += amp * noise(p);
          p *= 2.05; amp *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vec2(vUv.x * 6.0, vUv.y * 3.0);
        float n = fbm(uv + vec2(uTime * 0.18, uTime * 0.32));
        n = pow(n, 1.5);
        vec3 col = mix(uColorB, uColor, n);
        float a = 0.05 + n * 0.55;
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
// 3. SONAR VORTEX — concentric expanding rings from far end
// ─────────────────────────────────────────────────────────────────────────────
function SonarVortex() {
  const RING_COUNT = 14
  const groupRef = useRef<THREE.Group>(null)
  const phaseRef = useRef<number[]>(
    Array.from({ length: RING_COUNT }, (_, i) => i / RING_COUNT),
  )
  useFrame((_, dt) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((c, i) => {
      const m = c as THREE.Mesh
      let phase = phaseRef.current[i] + dt * 0.18
      if (phase > 1) phase -= 1
      phaseRef.current[i] = phase
      // Z grows from -TUBE_LENGTH (far) toward 0 (near)
      m.position.z = -TUBE_LENGTH + phase * TUBE_LENGTH
      // Radius grows from small to full as ring approaches
      const r = TUBE_RADIUS * (0.25 + phase * 0.95)
      m.scale.set(r / TUBE_RADIUS, r / TUBE_RADIUS, 1)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = 0.85 * Math.sin(phase * Math.PI)
    })
  })
  return (
    <group ref={groupRef}>
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TUBE_RADIUS, 0.04, 8, 96]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.9} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FLOATING DEBRIS — wireframe octahedrons drifting inside the tunnel
// ─────────────────────────────────────────────────────────────────────────────
function FloatingDebris() {
  const COUNT = 40
  const groupRef = useRef<THREE.Group>(null)
  const items = useMemo(() => Array.from({ length: COUNT }, (_, i) => {
    const r = Math.sin(i * 12.9898) * 43758.5453
    const rand = (k: number) => {
      const s = Math.sin(i * 12.9898 + k * 7.31) * 43758.5453
      return s - Math.floor(s)
    }
    return {
      x: (rand(1) - 0.5) * 2 * (TUBE_RADIUS * 0.85),
      y: (rand(2) - 0.5) * 2 * (TUBE_RADIUS * 0.85),
      z: -rand(3) * TUBE_LENGTH,
      size: 0.12 + rand(4) * 0.22,
      rotSpeed: 0.3 + rand(5) * 0.7,
      driftSpeed: 0.4 + rand(6) * 0.6,
      seed: r,
    }
  }), [])
  useFrame((_, dt) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((c, i) => {
      const it = items[i]
      const m = c as THREE.Mesh
      m.rotation.x += dt * it.rotSpeed
      m.rotation.y += dt * it.rotSpeed * 0.7
      // Drift toward camera, wrap when reaching it
      m.position.z += dt * it.driftSpeed
      if (m.position.z > 2) m.position.z = -TUBE_LENGTH
    })
  })
  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, it.y, it.z]}>
          <octahedronGeometry args={[it.size, 0]} />
          <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CODE RAIN — vertical streams of falling dots on the tunnel wall
// ─────────────────────────────────────────────────────────────────────────────
function CodeRain() {
  // Build columns: at each angle around the tube, drop a vertical strand of
  // points along z. Animate alpha per row so it reads as falling drops.
  const COLUMNS = 32
  const ROWS = 24
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const sparkle = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 32; c.height = 32
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.5, 'rgba(94,234,212,0.6)')
    g.addColorStop(1, 'rgba(94,234,212,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 32, 32)
    return new THREE.CanvasTexture(c)
  }, [])

  const { positions, columnIds, rowIds } = useMemo(() => {
    const total = COLUMNS * ROWS
    const positions = new Float32Array(total * 3)
    const columnIds = new Float32Array(total)
    const rowIds    = new Float32Array(total)
    for (let c = 0; c < COLUMNS; c++) {
      const angle = (c / COLUMNS) * Math.PI * 2
      const x = Math.cos(angle) * (TUBE_RADIUS * 0.95)
      const y = Math.sin(angle) * (TUBE_RADIUS * 0.95)
      for (let r = 0; r < ROWS; r++) {
        const z = -(r / (ROWS - 1)) * TUBE_LENGTH
        const i = (c * ROWS + r) * 3
        positions[i + 0] = x
        positions[i + 1] = y
        positions[i + 2] = z
        columnIds[c * ROWS + r] = c
        rowIds[c * ROWS + r] = r
      }
    }
    return { positions, columnIds, rowIds }
  }, [])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uMap:   { value: sparkle },
      uColor: { value: new THREE.Color(ACCENT) },
      uRows:  { value: ROWS },
    },
    vertexShader: /* glsl */ `
      attribute float aCol;
      attribute float aRow;
      uniform float uTime;
      uniform float uRows;
      varying float vAlpha;
      varying float vLead;
      void main() {
        // Each column has its own falling phase
        float speed = 1.0 + fract(sin(aCol * 12.9898) * 43758.5453) * 1.5;
        float headRow = mod(uTime * speed * 4.0 + aCol * 1.3, uRows + 6.0);
        float dist = headRow - aRow;
        // Brightness: bright at head, fades upward (negative dist = above head)
        float a = exp(-abs(dist) * 0.55);
        if (dist < 0.0) a = 0.0;
        vAlpha = a;
        vLead  = step(dist, 0.5) * step(-0.5, dist);  // 1 if this is the head
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 14.0 * (1.0 / -mv.z) * (1.0 + vLead * 0.8);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      varying float vAlpha;
      varying float vLead;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        vec3 col = mix(uColor, vec3(0.78, 1.0, 0.95), vLead);
        gl_FragColor = vec4(col, tex.a * vAlpha);
        if (gl_FragColor.a < 0.02) discard;
      }
    `,
    transparent: true,
    depthWrite: false,
    blending:   THREE.AdditiveBlending,
    toneMapped: false,
  }), [sparkle])
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime })

  return (
    <points material={mat} ref={(p) => { if (p) matRef.current = mat }}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aCol"     args={[columnIds, 1]} />
        <bufferAttribute attach="attributes-aRow"     args={[rowIds, 1]} />
      </bufferGeometry>
    </points>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. AURORA TENDRILS — flowing wave ribbons through the tunnel
// ─────────────────────────────────────────────────────────────────────────────
function AuroraTendrils() {
  const TENDRILS = 5
  const SEGMENTS = 220
  const groupRef = useRef<THREE.Group>(null)
  const geoms = useMemo(
    () => Array.from({ length: TENDRILS }, () => new THREE.BufferGeometry()),
    [],
  )
  const seeds = useMemo(
    () => Array.from({ length: TENDRILS }, (_, i) => ({
      phaseA: i * 1.3,
      phaseB: i * 2.1 + 0.7,
      ampA: 1.4 + i * 0.18,
      ampB: 0.8 + i * 0.22,
      offset: (i / TENDRILS - 0.5) * 1.5,
    })),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    geoms.forEach((g, idx) => {
      const s = seeds[idx]
      const pts = new Float32Array(SEGMENTS * 3)
      for (let i = 0; i < SEGMENTS; i++) {
        const u = i / (SEGMENTS - 1)
        const z = -u * TUBE_LENGTH
        const x = Math.sin(u * 9.0 + t * 0.6 + s.phaseA) * s.ampA + s.offset
        const y = Math.cos(u * 7.0 + t * 0.55 + s.phaseB) * s.ampB
        pts[i * 3 + 0] = x
        pts[i * 3 + 1] = y
        pts[i * 3 + 2] = z
      }
      g.setAttribute('position', new THREE.BufferAttribute(pts, 3))
      g.attributes.position.needsUpdate = true
    })
  })

  return (
    <group ref={groupRef}>
      {geoms.map((g, i) => (
        <line key={i}>
          <primitive object={g} attach="geometry" />
          <lineBasicMaterial
            color={i % 2 === 0 ? ACCENT : '#C6F8EE'}
            transparent
            opacity={0.75 - i * 0.08}
            toneMapped={false}
          />
        </line>
      ))}
    </group>
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
      {variant === 'wireframe-tube'  && <WireframeTube  />}
      {variant === 'plasma-field'    && <PlasmaField    />}
      {variant === 'sonar-vortex'    && <SonarVortex    />}
      {variant === 'floating-debris' && <FloatingDebris />}
      {variant === 'code-rain'       && <CodeRain       />}
      {variant === 'aurora-tendrils' && <AuroraTendrils />}
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
            SANDBOX · /tunnel-lights · round 3
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
            Fresh visual aesthetics — wireframe geometry, organic plasma, sonar
            wormhole, drifting debris, code rain, aurora ribbons. Pick one (or
            mix) and I&apos;ll integrate it.
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

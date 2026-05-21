// app/tunnel-lights/page.tsx — sandbox to preview 6 candidate lighting styles
// for the tunnel rings. Each card runs an independent small R3F canvas.
// Not linked from the main site; visit /tunnel-lights to compare.

'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

type Variant =
  | 'baseline'
  | 'twinkle'
  | 'beacons'
  | 'streams'
  | 'depth-gradient'
  | 'inner-ring'

const VARIANTS: Array<{ id: Variant; title: string; blurb: string }> = [
  { id: 'baseline',       title: '1 · Baseline (current)', blurb: 'Uniform teal dots + ring connectors. What we ship today.' },
  { id: 'twinkle',        title: '2 · Per-dot twinkle',    blurb: 'Each dot has its own sine-phase brightness pulse. Alive but calm.' },
  { id: 'beacons',        title: '3 · Hero beacons',       blurb: '~5% of dots burn brighter and pulse. Adds focal points for the eye.' },
  { id: 'streams',        title: '4 · Data streams',       blurb: 'Longitudinal lines along tunnel length with a moving bright segment.' },
  { id: 'depth-gradient', title: '5 · Depth gradient',     blurb: 'Color shifts teal → violet from near to far. Sense of depth.' },
  { id: 'inner-ring',     title: '6 · Inner star field',   blurb: 'Half-bright smaller dots offset between main ones — denser starfield.' },
]

const RING_COUNT      = 26
const DOTS_PER_RING   = 18
const TUBE_LENGTH     = 60
const RING_RADIUS     = 3.2
const ACCENT          = '#5EEAD4'

function buildRingPositions(rings: number, dotsPerRing: number, radius: number, length: number) {
  const pos = new Float32Array(rings * dotsPerRing * 3)
  for (let r = 0; r < rings; r++) {
    const z = -(r / (rings - 1)) * length
    for (let d = 0; d < dotsPerRing; d++) {
      const a = (d / dotsPerRing) * Math.PI * 2
      const i = (r * dotsPerRing + d) * 3
      pos[i + 0] = Math.cos(a) * radius
      pos[i + 1] = Math.sin(a) * radius
      pos[i + 2] = z
    }
  }
  return pos
}

function buildRingLineSegments(rings: number, dotsPerRing: number, posBuf: Float32Array) {
  // 2 vertices per segment, dotsPerRing segments per ring (close the loop).
  const segs = new Float32Array(rings * dotsPerRing * 2 * 3)
  let w = 0
  for (let r = 0; r < rings; r++) {
    for (let d = 0; d < dotsPerRing; d++) {
      const a = r * dotsPerRing + d
      const b = r * dotsPerRing + ((d + 1) % dotsPerRing)
      segs[w++] = posBuf[a * 3 + 0]; segs[w++] = posBuf[a * 3 + 1]; segs[w++] = posBuf[a * 3 + 2]
      segs[w++] = posBuf[b * 3 + 0]; segs[w++] = posBuf[b * 3 + 1]; segs[w++] = posBuf[b * 3 + 2]
    }
  }
  return segs
}

function buildLongitudinalSegments(rings: number, dotsPerRing: number, posBuf: Float32Array) {
  // Connect each dot to its counterpart in the next ring along z.
  const segs = new Float32Array((rings - 1) * dotsPerRing * 2 * 3)
  let w = 0
  for (let r = 0; r < rings - 1; r++) {
    for (let d = 0; d < dotsPerRing; d++) {
      const a = r * dotsPerRing + d
      const b = (r + 1) * dotsPerRing + d
      segs[w++] = posBuf[a * 3 + 0]; segs[w++] = posBuf[a * 3 + 1]; segs[w++] = posBuf[a * 3 + 2]
      segs[w++] = posBuf[b * 3 + 0]; segs[w++] = posBuf[b * 3 + 1]; segs[w++] = posBuf[b * 3 + 2]
    }
  }
  return segs
}

function makeSparkleTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0,   'rgba(255,255,255,1)')
  g.addColorStop(0.25,'rgba(180,255,240,0.8)')
  g.addColorStop(0.55,'rgba(94,234,212,0.18)')
  g.addColorStop(1,   'rgba(94,234,212,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function TunnelDemo({ variant }: { variant: Variant }) {
  const ringPositions = useMemo(
    () => buildRingPositions(RING_COUNT, DOTS_PER_RING, RING_RADIUS, TUBE_LENGTH),
    [],
  )
  const ringSegments = useMemo(
    () => buildRingLineSegments(RING_COUNT, DOTS_PER_RING, ringPositions),
    [ringPositions],
  )
  const longSegments = useMemo(
    () => buildLongitudinalSegments(RING_COUNT, DOTS_PER_RING, ringPositions),
    [ringPositions],
  )

  // Per-dot phase + beacon flag (random, deterministic via seed)
  const { phases, beaconFlags } = useMemo(() => {
    const total = RING_COUNT * DOTS_PER_RING
    const phases = new Float32Array(total)
    const beaconFlags = new Float32Array(total)
    for (let i = 0; i < total; i++) {
      const s = Math.sin(i * 12.9898) * 43758.5453
      phases[i] = (s - Math.floor(s)) * Math.PI * 2
      const r = Math.sin(i * 7.91 + 4.17) * 43758.5453
      const rand = r - Math.floor(r)
      if (rand < 0.05) beaconFlags[i] = 1
    }
    return { phases, beaconFlags }
  }, [])

  // Per-dot depth (z normalized 0..1, far → near)
  const depths = useMemo(() => {
    const d = new Float32Array(RING_COUNT * DOTS_PER_RING)
    for (let r = 0; r < RING_COUNT; r++) {
      const norm = r / (RING_COUNT - 1)
      for (let q = 0; q < DOTS_PER_RING; q++) d[r * DOTS_PER_RING + q] = norm
    }
    return d
  }, [])

  // Inner-ring secondary positions
  const innerRingPositions = useMemo(() => {
    if (variant !== 'inner-ring') return null
    const innerR = RING_RADIUS * 0.86
    const offset = Math.PI / DOTS_PER_RING // half a step
    const pos = new Float32Array(RING_COUNT * DOTS_PER_RING * 3)
    for (let r = 0; r < RING_COUNT; r++) {
      const z = -(r / (RING_COUNT - 1)) * TUBE_LENGTH
      for (let d = 0; d < DOTS_PER_RING; d++) {
        const a = (d / DOTS_PER_RING) * Math.PI * 2 + offset
        const i = (r * DOTS_PER_RING + d) * 3
        pos[i + 0] = Math.cos(a) * innerR
        pos[i + 1] = Math.sin(a) * innerR
        pos[i + 2] = z
      }
    }
    return pos
  }, [variant])

  const sparkle = useMemo(makeSparkleTexture, [])

  // Custom shader for animated dots — used by twinkle / beacons / depth-gradient
  const shaderMat = useMemo(() => {
    const flag =
      variant === 'twinkle'        ? 1 :
      variant === 'beacons'        ? 2 :
      variant === 'depth-gradient' ? 3 :
      0
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime:    { value: 0 },
        uMap:     { value: sparkle },
        uColor:   { value: new THREE.Color(ACCENT) },
        uColorB:  { value: new THREE.Color('#8b5cf6') },  // violet for depth
        uVariant: { value: flag },
      },
      vertexShader: /* glsl */ `
        attribute float aPhase;
        attribute float aBeacon;
        attribute float aDepth;
        uniform float uTime;
        uniform int   uVariant;
        varying float vAlpha;
        varying float vDepthMix;
        varying float vBeacon;
        void main() {
          float twinkle = 0.6 + 0.4 * sin(uTime * 1.6 + aPhase * 6.283);
          float scale = 1.0;
          float alpha = 1.0;
          if (uVariant == 1) {
            alpha = twinkle;
          } else if (uVariant == 2) {
            if (aBeacon > 0.5) {
              float pulse = 0.5 + 0.5 * sin(uTime * 2.4 + aPhase * 6.283);
              alpha = 0.9 + 1.6 * pulse;
              scale = 1.0 + 1.6 * pulse;
            } else {
              alpha = 0.85;
            }
          } else if (uVariant == 3) {
            alpha = 0.9;
            scale = mix(0.85, 1.05, aDepth);
          }
          vAlpha = alpha;
          vDepthMix = aDepth;
          vBeacon = aBeacon;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 22.0 * scale * (1.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform vec3 uColorB;
        uniform int  uVariant;
        varying float vAlpha;
        varying float vDepthMix;
        varying float vBeacon;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          vec3 col = uColor;
          if (uVariant == 3) col = mix(uColorB, uColor, vDepthMix);
          if (uVariant == 2 && vBeacon > 0.5) col = vec3(0.78, 1.0, 0.95);
          gl_FragColor = vec4(col, tex.a * vAlpha);
          if (gl_FragColor.a < 0.02) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending:   THREE.AdditiveBlending,
      toneMapped: false,
    })
  }, [variant, sparkle])

  // Data-stream animated material: longitudinal lines with a moving bright slab
  const streamMat = useMemo(() => {
    if (variant !== 'streams') return null
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime:   { value: 0 },
        uColor:  { value: new THREE.Color(ACCENT) },
      },
      vertexShader: /* glsl */ `
        varying float vZ;
        void main() {
          vZ = position.z;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3  uColor;
        varying float vZ;
        void main() {
          // Slab moves toward camera (z grows)
          float head = mod(uTime * 8.0, ${TUBE_LENGTH.toFixed(1)}) - ${TUBE_LENGTH.toFixed(1)};
          float dist = vZ - head;
          float pulse = exp(-dist * dist * 0.06);
          float base  = 0.18;
          float a = base + pulse * 0.9;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending:   THREE.AdditiveBlending,
      toneMapped: false,
    })
  }, [variant])

  useFrame(({ clock }) => {
    if (shaderMat) shaderMat.uniforms.uTime.value = clock.elapsedTime
    if (streamMat) streamMat.uniforms.uTime.value = clock.elapsedTime
  })

  // Geometry refs
  const ringGeoRef = useRef<THREE.BufferGeometry>(null)
  const innerGeoRef = useRef<THREE.BufferGeometry>(null)

  return (
    <group>
      {/* Ring-circumference connector lines */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[ringSegments, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={ACCENT}
          transparent
          opacity={0.18}
          toneMapped={false}
        />
      </lineSegments>

      {/* Longitudinal streams (variant 4) */}
      {variant === 'streams' && streamMat && (
        <lineSegments material={streamMat}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[longSegments, 3]}
            />
          </bufferGeometry>
        </lineSegments>
      )}

      {/* Main dots — either plain points (baseline) or shader points */}
      {variant === 'baseline' ? (
        <points>
          <bufferGeometry ref={ringGeoRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[ringPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.22}
            map={sparkle}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            color={ACCENT}
            toneMapped={false}
          />
        </points>
      ) : variant === 'streams' || variant === 'inner-ring' ? (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[ringPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.22}
            map={sparkle}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            color={ACCENT}
            toneMapped={false}
          />
        </points>
      ) : (
        <points material={shaderMat}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[ringPositions, 3]}
            />
            <bufferAttribute
              attach="attributes-aPhase"
              args={[phases, 1]}
            />
            <bufferAttribute
              attach="attributes-aBeacon"
              args={[beaconFlags, 1]}
            />
            <bufferAttribute
              attach="attributes-aDepth"
              args={[depths, 1]}
            />
          </bufferGeometry>
        </points>
      )}

      {/* Inner secondary star field (variant 6) */}
      {variant === 'inner-ring' && innerRingPositions && (
        <points>
          <bufferGeometry ref={innerGeoRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[innerRingPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.13}
            map={sparkle}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            color={ACCENT}
            opacity={0.55}
            toneMapped={false}
          />
        </points>
      )}

    </group>
  )
}

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
      <TunnelDemo variant={variant} />
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.95}
          luminanceThreshold={0.25}
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
            SANDBOX · /tunnel-lights
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: '-0.02em',
          }}>
            Tunnel light variants
          </h1>
          <p style={{
            fontSize: 14, color: 'rgba(245,245,247,0.6)',
            margin: '8px 0 0', maxWidth: 720,
          }}>
            Six candidate styles for the tunnel ring lights. Pick the one(s) you
            want shipped to the main tunnel — nothing here is wired into the
            production scene yet.
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

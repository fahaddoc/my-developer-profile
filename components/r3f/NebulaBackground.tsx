'use client'

// NebulaBackground — animated cosmic gas + sparse star field that lives
// INSIDE the existing tunnel Canvas. The nebula sphere + star field both
// follow the camera, so wherever the camera flies along the tunnel curve
// it stays surrounded by space.
//
// Cost: 1 sphere mesh + 1 points cloud. Shader does fbm noise per fragment
// across the inner-faces of the sphere (~6k triangles) — modest GPU.
// Mouse parallax = subtle sphere rotation lerp.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface NebulaBackgroundProps {
  isLight: boolean
  accent:  string
}

export function NebulaBackground({ isLight, accent }: NebulaBackgroundProps) {
  // ── Cosmic gas sphere ─────────────────────────────────────────────────
  const sphereRef  = useRef<THREE.Mesh>(null)
  const starsRef   = useRef<THREE.Points>(null)
  const mouseRef   = useRef({ x: 0, y: 0 })

  // Mouse parallax — listen once, lerp toward target each frame
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:          { value: 0 },
      uColorDeep:     { value: new THREE.Color(isLight ? '#e8eef4' : '#06070d') },
      uColorMid:      { value: new THREE.Color(isLight ? '#d2e3e7' : '#0d2238') },
      uColorBright:   { value: new THREE.Color(isLight ? '#5fa8b3' : accent) },
      uAlpha:         { value: isLight ? 0.55 : 0.92 },
      uBrightStrength:{ value: isLight ? 0.30 : 0.55 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3  uColorDeep;
      uniform vec3  uColorMid;
      uniform vec3  uColorBright;
      uniform float uAlpha;
      uniform float uBrightStrength;
      varying vec3 vDir;

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
        for (int i = 0; i < 5; i++) { v += amp * noise(p); p *= 2.05; amp *= 0.5; }
        return v;
      }

      void main() {
        // Spherical UV from view direction
        vec2 uv = vec2(atan(vDir.z, vDir.x) / 6.2831 + 0.5, vDir.y * 0.5 + 0.5);
        uv.x *= 4.0;
        uv.y *= 2.6;

        // Two fbm layers scrolling in opposite directions for depth
        float n1 = fbm(uv + vec2(uTime * 0.012, uTime * 0.019));
        float n2 = fbm(uv * 1.7 + vec2(-uTime * 0.008, uTime * 0.015));
        float n  = n1 * 0.65 + n2 * 0.35;
        n = pow(n, 1.4);

        vec3 col = mix(uColorDeep, uColorMid, smoothstep(0.22, 0.6, n));
        col = mix(col, uColorBright, smoothstep(0.65, 1.0, n) * uBrightStrength);

        // Very slow opacity breathe so the field feels alive
        float pulse = 0.96 + 0.04 * sin(uTime * 0.35);
        gl_FragColor = vec4(col, uAlpha * pulse);
      }
    `,
    transparent: true,
    side:        THREE.BackSide,
    depthWrite:  false,
    toneMapped:  false,
  }), [isLight, accent])

  useEffect(() => () => mat.dispose(), [mat])

  // ── Sparse star field ─────────────────────────────────────────────────
  const STAR_COUNT = 140
  const starPositions = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      // Uniform random point on a sphere of radius 48
      const t = Math.random() * 2 * Math.PI
      const u = Math.random() * 2 - 1
      const r = 48
      const sq = Math.sqrt(1 - u * u)
      arr[i * 3 + 0] = r * sq * Math.cos(t)
      arr[i * 3 + 1] = r * sq * Math.sin(t)
      arr[i * 3 + 2] = r * u
    }
    return arr
  }, [])
  const starGeom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    return g
  }, [starPositions])
  useEffect(() => () => starGeom.dispose(), [starGeom])

  // ── Per-frame: follow camera + mouse parallax + time uniform ──────────
  useFrame(({ camera, clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
    if (sphereRef.current) {
      sphereRef.current.position.copy(camera.position)
      const tx = mouseRef.current.x * 0.07
      const ty = mouseRef.current.y * 0.04
      sphereRef.current.rotation.y += (tx - sphereRef.current.rotation.y) * 0.04
      sphereRef.current.rotation.x += (ty - sphereRef.current.rotation.x) * 0.04
    }
    if (starsRef.current) {
      starsRef.current.position.copy(camera.position)
      // Tiny rotation drift for ambient motion
      starsRef.current.rotation.y = clock.elapsedTime * 0.005
    }
  })

  return (
    <>
      {/* Nebula gas sphere — sits around the camera, always visible */}
      <mesh ref={sphereRef} material={mat}>
        <sphereGeometry args={[55, 32, 18]} />
      </mesh>

      {/* Sparse stars */}
      <points ref={starsRef} geometry={starGeom}>
        <pointsMaterial
          size={isLight ? 0.32 : 0.42}
          color={isLight ? '#5fa8b3' : accent}
          sizeAttenuation
          transparent
          opacity={isLight ? 0.45 : 0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </>
  )
}

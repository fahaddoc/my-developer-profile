'use client'

// NebulaBackground — layered cosmic gas + sparse star field + occasional
// shooting star. All meshes follow the camera so wherever the tunnel scrolls
// the space envelope stays around it.
//
// Layers (back to front):
//   1. Outer nebula sphere (radius 72) — slow scroll, atmospheric, low alpha
//   2. Inner nebula sphere (radius 50) — faster scroll, deeper color, higher alpha
//   3. Star field (140 stars, custom shader: per-star size + twinkle phase)
//   4. Shooting star — a single bright streak that fires every 15-20s
//
// All under one rotating parent group for a slow global drift.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface NebulaBackgroundProps {
  isLight: boolean
  accent:  string
}

// Cheap deterministic PRNG so star positions don't shuffle on rerender
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

// Fibonacci sphere — gives an even, low-clumping distribution on a sphere
function fibonacciSphere(n: number, radius: number) {
  const arr = new Float32Array(n * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y     = 1 - (i / (n - 1)) * 2
    const sq    = Math.sqrt(1 - y * y)
    const theta = golden * i
    arr[i * 3 + 0] = radius * sq * Math.cos(theta)
    arr[i * 3 + 1] = radius * y
    arr[i * 3 + 2] = radius * sq * Math.sin(theta)
  }
  return arr
}

// ─── Nebula gas shader — used by both layers with different uniforms ─────────
function makeNebulaMaterial(opts: {
  colorDeep:   string
  colorMid:    string
  colorBright: string
  alpha:       number
  brightStrength: number
  uvScaleX:    number
  uvScaleY:    number
  scrollA:     [number, number]
  scrollB:     [number, number]
  pulseDepth:  number
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime:          { value: 0 },
      uColorDeep:     { value: new THREE.Color(opts.colorDeep) },
      uColorMid:      { value: new THREE.Color(opts.colorMid) },
      uColorBright:   { value: new THREE.Color(opts.colorBright) },
      uAlpha:         { value: opts.alpha },
      uBrightStrength:{ value: opts.brightStrength },
      uUvScale:       { value: new THREE.Vector2(opts.uvScaleX, opts.uvScaleY) },
      uScrollA:       { value: new THREE.Vector2(...opts.scrollA) },
      uScrollB:       { value: new THREE.Vector2(...opts.scrollB) },
      uPulseDepth:    { value: opts.pulseDepth },
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
      uniform vec2  uUvScale;
      uniform vec2  uScrollA;
      uniform vec2  uScrollB;
      uniform float uPulseDepth;
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
        for (int i = 0; i < 3; i++) { v += amp * noise(p); p *= 2.05; amp *= 0.5; }
        return v;
      }

      void main() {
        // Triplanar fbm on view direction — sample on 3 cardinal planes and
        // blend by axis dominance. Avoids the atan2 seam an equirectangular
        // mapping leaves along +X on the sphere back.
        // Smooth gradient wash — no clouds. A vertical gradient plus a soft
        // off-centre glow give premium depth without any FBM texture.
        float t = vDir.y * 0.5 + 0.5;
        float glow = pow(max(0.0, 1.0 - distance(vDir.xy, vec2(0.32, 0.14))), 2.5);

        vec3 col = mix(uColorDeep, uColorMid, smoothstep(0.0, 0.7, t));
        col = mix(col, uColorBright, smoothstep(0.45, 1.0, t) * uBrightStrength + glow * uBrightStrength * 0.6);

        float pulse = 1.0 - uPulseDepth + uPulseDepth * (0.5 + 0.5 * sin(uTime * 0.45));
        gl_FragColor = vec4(col, uAlpha * pulse);
      }
    `,
    transparent: true,
    side:        THREE.BackSide,
    depthWrite:  false,
    toneMapped:  false,
  })
}

export function NebulaBackground({ isLight, accent }: NebulaBackgroundProps) {
  const groupRef    = useRef<THREE.Group>(null)
  const mouseRef    = useRef({ x: 0, y: 0 })

  // Mouse parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── Inner + outer nebula materials ─────────────────────────────────────
  // Dark-mode palette per user spec — teal/cyan family (matches the website's
  // existing accent system).
  const innerMat = useMemo(() => makeNebulaMaterial({
    colorDeep:      isLight ? '#dde9ee' : '#0d0e12',  // vec3(0.02, 0.07, 0.18)
    colorMid:       isLight ? '#aed3da' : '#23272d',  // vec3(0.08, 0.32, 0.48)
    colorBright:    isLight ? '#1a8ea0' : '#49524a',  // vec3(0.05, 0.85, 0.92)
    alpha:          isLight ? 0.78 : 1.00,
    brightStrength: isLight ? 0.55 : 0.68,
    uvScaleX:       4.0,
    uvScaleY:       2.5,
    scrollA:        [ 0.022,  0.031],
    scrollB:        [-0.018,  0.025],
    pulseDepth:     0.14,
  }), [isLight])

  const outerMat = useMemo(() => makeNebulaMaterial({
    colorDeep:      isLight ? '#e9eff5' : '#0a0b0e',  // vec3(0.01, 0.04, 0.12)
    colorMid:       isLight ? '#bcd9e2' : '#1a1d22',  // vec3(0.06, 0.22, 0.38)
    colorBright:    isLight ? '#4ea1ac' : '#3a3f3a',  // vec3(0.15, 0.65, 0.80)
    alpha:          isLight ? 0.55 : 0.92,
    brightStrength: isLight ? 0.40 : 0.52,
    uvScaleX:       2.4,
    uvScaleY:       1.6,
    scrollA:        [ 0.009,  0.013],
    scrollB:        [-0.006,  0.011],
    pulseDepth:     0.10,
  }), [isLight])
  void accent  // accent unused — explicit nebula palette per spec

  useEffect(() => () => { innerMat.dispose(); outerMat.dispose() }, [innerMat, outerMat])

  useFrame(({ camera, clock }) => {
    innerMat.uniforms.uTime.value = clock.elapsedTime
    outerMat.uniforms.uTime.value = clock.elapsedTime

    if (groupRef.current) {
      // Follow camera so the bubble surrounds it wherever it flies
      groupRef.current.position.copy(camera.position)
      // Slow global rotation drift
      groupRef.current.rotation.y = clock.elapsedTime * 0.012
      // Mouse parallax — subtle additional tilt on top of the drift
      const tx = mouseRef.current.x * 0.08
      const ty = mouseRef.current.y * 0.05
      groupRef.current.rotation.z += (tx - groupRef.current.rotation.z) * 0.04
      groupRef.current.rotation.x += (ty - groupRef.current.rotation.x) * 0.04
    }
  })

  return (
    <group ref={groupRef}>
      {/* Outer nebula — atmospheric, low-frequency wash */}
      <mesh material={outerMat}>
        <sphereGeometry args={[72, 20, 14]} />
      </mesh>
      {/* Inner nebula — denser color + faster motion */}
      <mesh material={innerMat}>
        <sphereGeometry args={[50, 20, 14]} />
      </mesh>
    </group>
  )
}

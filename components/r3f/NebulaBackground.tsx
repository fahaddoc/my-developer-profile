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
        for (int i = 0; i < 5; i++) { v += amp * noise(p); p *= 2.05; amp *= 0.5; }
        return v;
      }

      void main() {
        vec2 uv = vec2(atan(vDir.z, vDir.x) / 6.2831 + 0.5, vDir.y * 0.5 + 0.5);
        uv *= uUvScale;

        float n1 = fbm(uv + uScrollA * uTime);
        float n2 = fbm(uv * 1.7 + uScrollB * uTime);
        float n  = n1 * 0.65 + n2 * 0.35;
        n = pow(n, 1.05);          // less crush → more bright area

        vec3 col = mix(uColorDeep, uColorMid, smoothstep(0.10, 0.55, n));
        col = mix(col, uColorBright, smoothstep(0.40, 0.95, n) * uBrightStrength);

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
    colorDeep:      isLight ? '#dde9ee' : '#05122e',  // vec3(0.02, 0.07, 0.18)
    colorMid:       isLight ? '#aed3da' : '#14527a',  // vec3(0.08, 0.32, 0.48)
    colorBright:    isLight ? '#1a8ea0' : '#0dd9eb',  // vec3(0.05, 0.85, 0.92)
    alpha:          isLight ? 0.78 : 1.00,
    brightStrength: isLight ? 0.55 : 1.10,
    uvScaleX:       4.0,
    uvScaleY:       2.5,
    scrollA:        [ 0.022,  0.031],
    scrollB:        [-0.018,  0.025],
    pulseDepth:     0.14,
  }), [isLight])

  const outerMat = useMemo(() => makeNebulaMaterial({
    colorDeep:      isLight ? '#e9eff5' : '#030a1e',  // vec3(0.01, 0.04, 0.12)
    colorMid:       isLight ? '#bcd9e2' : '#0f3861',  // vec3(0.06, 0.22, 0.38)
    colorBright:    isLight ? '#4ea1ac' : '#26a6cc',  // vec3(0.15, 0.65, 0.80)
    alpha:          isLight ? 0.55 : 0.92,
    brightStrength: isLight ? 0.40 : 0.85,
    uvScaleX:       2.4,
    uvScaleY:       1.6,
    scrollA:        [ 0.009,  0.013],
    scrollB:        [-0.006,  0.011],
    pulseDepth:     0.10,
  }), [isLight])
  void accent  // accent unused — explicit nebula palette per spec

  useEffect(() => () => { innerMat.dispose(); outerMat.dispose() }, [innerMat, outerMat])

  // ── Star field with per-star size + twinkle phase ──────────────────────
  const STAR_COUNT = 220
  const { starGeom, starMat } = useMemo(() => {
    const positions = fibonacciSphere(STAR_COUNT, 46)
    // Add subtle radial jitter so they don't sit on a perfect sphere
    const rng = makeRng(0xA1)
    const sizes  = new Float32Array(STAR_COUNT)
    const phases = new Float32Array(STAR_COUNT)
    for (let i = 0; i < STAR_COUNT; i++) {
      const jitter = 0.92 + rng() * 0.16
      positions[i * 3 + 0] *= jitter
      positions[i * 3 + 1] *= jitter
      positions[i * 3 + 2] *= jitter
      // Lognormal-ish: most stars small, a few stand out
      const u = rng()
      sizes[i]  = 0.28 + Math.pow(u, 2.4) * 1.6
      phases[i] = rng() * Math.PI * 2
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1))
    g.setAttribute('aPhase',   new THREE.BufferAttribute(phases,    1))

    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime:    { value: 0 },
        uColor:   { value: new THREE.Color(isLight ? '#1a8ea0' : '#ffffff') },
        uTintB:   { value: new THREE.Color(isLight ? '#3a7a85' : '#5EEAD4') },
        uOpacity: { value: isLight ? 0.7 : 1.0 },
        uPxScale: { value: 420 },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPxScale;
        varying float vTwinkle;
        varying float vTint;
        void main() {
          float tw = 0.5 + 0.5 * sin(uTime * 1.4 + aPhase * 6.283);
          vTwinkle = 0.55 + 0.45 * tw;
          vTint = step(0.78, fract(aPhase * 0.317)); // ~22% of stars tinted accent
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPxScale * (0.7 + 0.5 * tw) / -mv.z;
          gl_Position  = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uTintB;
        uniform float uOpacity;
        varying float vTwinkle;
        varying float vTint;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float falloff = pow(smoothstep(0.5, 0.0, d), 1.4);
          vec3 col = mix(uColor, uTintB, vTint);
          gl_FragColor = vec4(col, falloff * vTwinkle * uOpacity);
        }
      `,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      toneMapped:  false,
    })
    return { starGeom: g, starMat: m }
  }, [isLight, accent])
  useEffect(() => () => { starGeom.dispose(); starMat.dispose() }, [starGeom, starMat])

  // ── Shooting star — fires at random intervals ──────────────────────────
  const shootingState  = useRef({
    active: false,
    start: new THREE.Vector3(),
    dir:   new THREE.Vector3(),
    age:   0,
    ttl:   1.4,
    next:  4 + Math.random() * 6,   // first one fires 4-10s after mount
  })
  // Build the Line object outside JSX — sidesteps TSX's `<line>` ambiguity
  // with SVGLineElement.
  const shootingLine = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const m = new THREE.LineBasicMaterial({
      color: new THREE.Color(isLight ? '#3e8a92' : '#ffffff'),
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthWrite: false,
    })
    return new THREE.Line(g, m)
  }, [isLight])
  const shootingGeom = shootingLine.geometry as THREE.BufferGeometry
  useEffect(() => () => {
    shootingLine.geometry.dispose()
    ;(shootingLine.material as THREE.Material).dispose()
  }, [shootingLine])

  // ── Per-frame ──────────────────────────────────────────────────────────
  useFrame(({ camera, clock }, dt) => {
    innerMat.uniforms.uTime.value = clock.elapsedTime
    outerMat.uniforms.uTime.value = clock.elapsedTime
    starMat.uniforms.uTime.value  = clock.elapsedTime

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

    // Shooting star FSM
    const s = shootingState.current
    if (!s.active) {
      s.next -= dt
      if (s.next <= 0) {
        // Spawn a new streak — random start on a sphere, random direction across
        const r = 45
        const a = Math.random() * Math.PI * 2
        const u = Math.random() * 2 - 1
        const sq = Math.sqrt(1 - u * u)
        s.start.set(r * sq * Math.cos(a), r * u, r * sq * Math.sin(a))
        // direction across (roughly tangential)
        const a2 = a + (0.8 + Math.random() * 0.8) * (Math.random() > 0.5 ? 1 : -1)
        const u2 = u + (Math.random() - 0.5) * 0.6
        const sq2 = Math.sqrt(Math.max(0.01, 1 - u2 * u2))
        const end = new THREE.Vector3(r * sq2 * Math.cos(a2), r * u2, r * sq2 * Math.sin(a2))
        s.dir.copy(end).sub(s.start)
        s.age = 0
        s.ttl = 1.2 + Math.random() * 0.6
        s.active = true
        s.next = 14 + Math.random() * 8   // next one in 14-22s
      }
    } else {
      s.age += dt
      const t = Math.min(1, s.age / s.ttl)
      if (t >= 1) {
        s.active = false
      } else {
        const head = s.start.clone().addScaledVector(s.dir, t)
        const tailT = Math.max(0, t - 0.18)
        const tail = s.start.clone().addScaledVector(s.dir, tailT)
        const posAttr = shootingGeom.attributes.position as THREE.BufferAttribute
        posAttr.setXYZ(0, head.x, head.y, head.z)
        posAttr.setXYZ(1, tail.x, tail.y, tail.z)
        posAttr.needsUpdate = true
        const mat = shootingLine.material as THREE.LineBasicMaterial
        mat.opacity = Math.sin(t * Math.PI) * (isLight ? 0.65 : 0.95)
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* Outer nebula — atmospheric, low-frequency wash */}
      <mesh material={outerMat}>
        <sphereGeometry args={[72, 32, 18]} />
      </mesh>
      {/* Inner nebula — denser color + faster motion */}
      <mesh material={innerMat}>
        <sphereGeometry args={[50, 32, 18]} />
      </mesh>

      {/* Stars */}
      <points geometry={starGeom} material={starMat} />

      {/* Shooting star — Line object built outside JSX, mounted via primitive */}
      <primitive object={shootingLine} />
    </group>
  )
}

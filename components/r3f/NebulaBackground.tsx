'use client'

// NebulaBackground — the sky around the desktop tunnel.
//
// Two draws, both inside one group that follows the camera (so the sky sits
// at infinity wherever the camera flies):
//
//   1. Sky sphere. One opaque BackSide sphere drawn first (renderOrder -1000,
//      no depth test), so every planet draws over it at any distance. The
//      fragment shader composites two nebula layers over palette.bg:
//        outer: a broad, dim haze from a low-frequency field
//        inner: sparse cold filaments, masked by the same low-frequency
//               field so most of the frame stays void
//      Octaves and the optional domain-warp step come from the quality
//      preset (#defines, recompiled only when the tier changes). Daylight is
//      the same shader with the light palette plus a faint warm "sun side"
//      towards the key light (upper left of the frame).
//   2. Star field. One Points draw with per-star size, twinkle phase,
//      temperature and brightness. Neutral warm/cool whites, 1-3px, gentle
//      time-based twinkle. Count = preset.starCount. Daylight hides all but
//      the brightest few.
//
// Colours come from palette (lib/palette.ts) and are updated in place on a
// theme flip; nothing here remounts the Canvas.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ScenePalette } from '@/lib/palette'
import type { QualityPreset } from '@/lib/quality'

interface NebulaBackgroundProps {
  palette: ScenePalette
  preset:  QualityPreset
  /** 1 = ambient motion on, 0 = prefers-reduced-motion (static sky) */
  motion?: number
}

const SKY_RADIUS  = 200   // inside camera.far (400); no depth test, so size is cosmetic
const STAR_RADIUS = 300   // behind every planet on the path, still inside camera.far

// Cheap deterministic PRNG so the star field never reshuffles on rerender.
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

// Arithmetic hash + 3D value noise (no sin-hash: stable under mediump and
// free of the banding sin() gives at large arguments).
const NOISE_GLSL = /* glsl */ `
  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  // Rotation between octaves (and on the input) so the value-noise lattice
  // never lines up with the view: no boxy, axis-aligned cloud edges.
  const mat3 ROT = mat3( 0.00,  0.80,  0.60,
                        -0.80,  0.36, -0.48,
                        -0.60, -0.48,  0.64);
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i);
    float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
      mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
      u.z
    );
  }
`

function makeSkyMaterial(octaves: number, warp: boolean): THREE.ShaderMaterial {
  const defines: Record<string, string | number> = { OCTAVES: Math.max(1, Math.min(5, Math.round(octaves))) }
  if (warp) defines.WARP = 1
  return new THREE.ShaderMaterial({
    defines,
    uniforms: {
      uTime:      { value: 0 },
      uBg:        { value: new THREE.Color() },
      uInDeep:    { value: new THREE.Color() },
      uInMid:     { value: new THREE.Color() },
      uInBright:  { value: new THREE.Color() },
      uOutDeep:   { value: new THREE.Color() },
      uOutMid:    { value: new THREE.Color() },
      uOutBright: { value: new THREE.Color() },
      // x: inner alpha, y: inner bright strength, z: outer alpha, w: outer bright strength
      uLayer:     { value: new THREE.Vector4() },
      // view-space direction towards the key light, and daylight sun-side strength
      uSunDir:    { value: new THREE.Vector3(-0.55, 0.45, 0.7).normalize() },
      uSun:       { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      varying vec3 vViewDir;
      void main() {
        vDir = position;
        // w = 0: direction only, so the camera-following translation drops out
        vViewDir = (modelViewMatrix * vec4(position, 0.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3  uBg;
      uniform vec3  uInDeep;
      uniform vec3  uInMid;
      uniform vec3  uInBright;
      uniform vec3  uOutDeep;
      uniform vec3  uOutMid;
      uniform vec3  uOutBright;
      uniform vec4  uLayer;
      uniform vec3  uSunDir;
      uniform float uSun;
      varying vec3  vDir;
      varying vec3  vViewDir;

      ${NOISE_GLSL}

      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        float norm = 0.0;
        for (int i = 0; i < OCTAVES; i++) {
          v += a * vnoise(p);
          norm += a;
          p = ROT * p * 2.03 + vec3(1.7, 9.2, 3.1);
          a *= 0.5;
        }
        return v / norm;
      }
      float fbm2(vec3 p) {
        return (vnoise(p) * 0.6667 + vnoise(ROT * p * 2.03 + vec3(4.1, 1.3, 7.7)) * 0.3333);
      }

      // Interleaved gradient noise: 1-LSB dither so the near-black gradients
      // do not band in an 8-bit framebuffer.
      float ign(vec2 px) {
        return fract(52.9829189 * fract(dot(px, vec2(0.06711056, 0.00583715))));
      }

      void main() {
        vec3 dir = ROT * normalize(vDir);
        vec3 drift = vec3(uTime * 0.004, 0.0, uTime * 0.006);

        // Low-frequency field: drives the broad outer haze and doubles as the
        // cloud/void mask for the filaments. Most of the sky falls below it.
        float field = fbm2(dir * 1.35 + drift * 0.5 + vec3(3.1, 0.0, 1.7));
        float voidMask = smoothstep(0.50, 0.74, field);

        vec3 p = dir * 3.1 + drift;
        #ifdef WARP
          // One domain-warp step: bends the field into filaments.
          vec2 q = vec2(fbm2(p * 0.8), fbm2(p * 0.8 + vec3(5.2, 1.3, 2.8)));
          p += vec3(q.x, q.y, q.x - q.y) * 1.6 - 0.8;
        #endif
        float n = fbm(p);

        // Outer layer: dim, wide haze.
        float outerD = smoothstep(0.42, 0.86, field);
        vec3 outerC = mix(uOutDeep, uOutMid, outerD);
        outerC = mix(outerC, uOutBright, smoothstep(0.66, 0.95, field) * uLayer.w);
        vec3 col = mix(uBg, outerC, uLayer.z * smoothstep(0.30, 0.70, field));

        // Inner layer: thin structure, only where the mask lets it through.
        // Filaments are the ridges of the field (|2n - 1| near 0), so they come
        // out as thin strands rather than blobs.
        float ridge   = 1.0 - abs(2.0 * n - 1.0);
        // Broken up along their length so they read as wisps, not tubes.
        float breakup = smoothstep(0.35, 0.75, fbm2(p * 1.9 + 7.3));
        float strands = pow(ridge, 6.0) * voidMask * breakup * 0.45;
        float midD    = smoothstep(0.52, 0.86, n);
        float brightD = clamp(smoothstep(0.66, 0.96, n) * voidMask + strands, 0.0, 1.0);
        vec3 innerC = mix(uInDeep, uInMid, midD);
        innerC = mix(innerC, uInBright, brightD * uLayer.y);
        float innerA = uLayer.x * clamp(midD * (0.3 + 0.7 * voidMask) + brightD, 0.0, 1.0);
        col = mix(col, innerC, innerA);

        // Daylight: faint warm haze on the side the key light comes from.
        float sunSide = smoothstep(-0.95, 0.15, dot(normalize(vViewDir), uSunDir));
        col = mix(col, uInBright, sunSide * sunSide * uSun);

        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        gl_FragColor.rgb += (ign(gl_FragCoord.xy) - 0.5) / 255.0;
      }
    `,
    side:        THREE.BackSide,
    transparent: false,
    depthTest:   false,
    depthWrite:  false,
    toneMapped:  false,
  })
}

function makeStarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime:      { value: 0 },
      uTwinkle:   { value: 0.22 },
      uWarm:      { value: new THREE.Color() },
      uCool:      { value: new THREE.Color() },
      uOpacity:   { value: 1 },
      uMinBright: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      attribute float aTemp;
      attribute float aBright;
      uniform float uTime;
      uniform float uTwinkle;
      uniform vec3  uWarm;
      uniform vec3  uCool;
      uniform float uMinBright;
      varying vec3  vColor;
      varying float vAlpha;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        float speed = 0.45 + aPhase * 1.3;
        float tw = 1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * speed + aPhase * 6.2831853));
        float vis = smoothstep(uMinBright, uMinBright + 0.12, aBright);
        vAlpha = aBright * tw * vis;
        vColor = mix(uWarm, uCool, aTemp);
        gl_PointSize = vis > 0.001 ? clamp(aSize, 1.0, 3.0) : 0.0;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3  vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = 1.0 - smoothstep(0.28, 0.5, d);
        gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite:  false,
    depthTest:   true,
    blending:    THREE.AdditiveBlending,
    toneMapped:  false,
  })
}

/** Star positions + per-star attributes. A third of the stars crowd a tilted
 *  band so the field has structure instead of uniform salt. */
function makeStarGeometry(count: number): THREE.BufferGeometry {
  const rng = makeRng(0x5f3759df)
  const pos    = new Float32Array(count * 3)
  const size   = new Float32Array(count)
  const phase  = new Float32Array(count)
  const temp   = new Float32Array(count)
  const bright = new Float32Array(count)

  // Band frame: normal tilted off the Y axis.
  const bandN = new THREE.Vector3(0.32, 1, 0.18).normalize()
  const bandU = new THREE.Vector3(1, 0, 0).cross(bandN).normalize()
  const bandV = new THREE.Vector3().crossVectors(bandN, bandU).normalize()
  const v = new THREE.Vector3()

  for (let i = 0; i < count; i++) {
    if (rng() < 0.34) {
      // Gaussian-ish latitude around the band plane.
      const ang = rng() * Math.PI * 2
      const lat = ((rng() + rng() + rng()) / 3 - 0.5) * 0.55
      v.copy(bandU).multiplyScalar(Math.cos(ang))
        .addScaledVector(bandV, Math.sin(ang))
        .addScaledVector(bandN, lat)
        .normalize()
    } else {
      const z = rng() * 2 - 1
      const a = rng() * Math.PI * 2
      const r = Math.sqrt(1 - z * z)
      v.set(r * Math.cos(a), z, r * Math.sin(a))
    }
    pos[i * 3 + 0] = v.x * STAR_RADIUS
    pos[i * 3 + 1] = v.y * STAR_RADIUS
    pos[i * 3 + 2] = v.z * STAR_RADIUS

    // Most stars are faint pinpricks; a few are brighter and larger.
    const b = rng()
    bright[i] = 0.22 + 0.78 * Math.pow(b, 2.6)
    size[i]   = 1.0 + 2.0 * Math.pow(b, 6.0)
    phase[i]  = rng()
    temp[i]   = rng()
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSize',    new THREE.BufferAttribute(size, 1))
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phase, 1))
  geo.setAttribute('aTemp',    new THREE.BufferAttribute(temp, 1))
  geo.setAttribute('aBright',  new THREE.BufferAttribute(bright, 1))
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), STAR_RADIUS)
  return geo
}

export function NebulaBackground({ palette, preset, motion = 1 }: NebulaBackgroundProps) {
  const groupRef = useRef<THREE.Group>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const tiltRef  = useRef({ x: 0, z: 0 })

  // Mouse parallax (a slight tilt of the whole sky)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Rebuilt only when the tier changes (octaves/warp are compile-time defines).
  const skyMat = useMemo(
    () => makeSkyMaterial(preset.nebulaOctaves, preset.nebulaWarp),
    [preset.nebulaOctaves, preset.nebulaWarp],
  )
  useEffect(() => () => skyMat.dispose(), [skyMat])

  const starMat = useMemo(() => makeStarMaterial(), [])
  useEffect(() => () => starMat.dispose(), [starMat])

  const starGeo = useMemo(() => makeStarGeometry(Math.max(0, Math.round(preset.starCount))), [preset.starCount])
  useEffect(() => () => starGeo.dispose(), [starGeo])

  // Theme: write the palette into the existing uniforms (no material rebuild).
  useEffect(() => {
    const u = skyMat.uniforms
    const { inner, outer } = palette.nebula
    ;(u.uBg.value as THREE.Color).set(palette.bg)
    ;(u.uInDeep.value as THREE.Color).set(inner.deep)
    ;(u.uInMid.value as THREE.Color).set(inner.mid)
    ;(u.uInBright.value as THREE.Color).set(inner.bright)
    ;(u.uOutDeep.value as THREE.Color).set(outer.deep)
    ;(u.uOutMid.value as THREE.Color).set(outer.mid)
    ;(u.uOutBright.value as THREE.Color).set(outer.bright)
    ;(u.uLayer.value as THREE.Vector4).set(inner.alpha, inner.brightStrength, outer.alpha, outer.brightStrength)
    const [lx, ly, lz] = palette.keyLight.dir
    ;(u.uSunDir.value as THREE.Vector3).set(lx, ly, lz).normalize()
    u.uSun.value = palette.mode === 'light' ? 0.5 : 0

    const s = starMat.uniforms
    ;(s.uWarm.value as THREE.Color).set(palette.stars.warm)
    ;(s.uCool.value as THREE.Color).set(palette.stars.cool)
    s.uOpacity.value   = palette.stars.opacity
    // Daylight: only the brightest stars survive, as faint specks.
    s.uMinBright.value = palette.mode === 'light' ? 0.72 : 0
    starMat.blending   = palette.mode === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending
  }, [palette, skyMat, starMat])

  useEffect(() => {
    starMat.uniforms.uTwinkle.value = motion > 0 ? 0.22 : 0
  }, [motion, starMat])

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.25)
    const t  = clock.elapsedTime * motion
    skyMat.uniforms.uTime.value  = t
    starMat.uniforms.uTime.value = t

    const g = groupRef.current
    if (!g) return
    // Follow the camera so the sky surrounds it wherever it flies.
    g.position.copy(camera.position)
    // Slow drift plus a slight mouse tilt, both frame-rate independent.
    tiltRef.current.z = THREE.MathUtils.damp(tiltRef.current.z, mouseRef.current.x * 0.05 * motion, 1.6, dt)
    tiltRef.current.x = THREE.MathUtils.damp(tiltRef.current.x, mouseRef.current.y * 0.03 * motion, 1.6, dt)
    g.rotation.set(tiltRef.current.x, t * 0.01, tiltRef.current.z)
  })

  return (
    <group ref={groupRef}>
      <mesh material={skyMat} renderOrder={-1000} frustumCulled={false}>
        <sphereGeometry args={[SKY_RADIUS, 48, 32]} />
      </mesh>
      {starGeo.attributes.position.count > 0 && (
        <points geometry={starGeo} material={starMat} renderOrder={-900} frustumCulled={false} />
      )}
    </group>
  )
}

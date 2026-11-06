'use client'

// IslandClouds — soft cinematic clouds that hug an island: a cap on the
// summit, wisps across the slopes, mist between towers. Camera-facing quads
// (one instanced draw per island) whose fragment shader paints a cumulus:
// a lumpy fbm silhouette with a flatter base, warm-white on the sun side and
// a soft lavender shade underneath, drifting and slowly reshaping. They test
// depth (the island can hide a cloud behind it) but never write it.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SeaPalette } from '@/lib/palette'
import { PAINT_NOISE_GLSL } from './paint'

const VERT = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec3 aSize;     // width, height, seed
  uniform float uTime;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDist;
  void main() {
    vec4 c = modelMatrix * vec4(aCenter, 1.0);
    // a slow lateral drift, different per cloud
    c.x += sin(uTime * 0.045 + aSize.z * 7.0) * aSize.x * 0.06;
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 w = c.xyz + right * position.x * aSize.x + up * position.y * aSize.y;
    vec4 mv = viewMatrix * vec4(w, 1.0);
    vUv = position.xy;
    vSeed = aSize.z;
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  ${PAINT_NOISE_GLSL}
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform vec3 uHaze;
  uniform vec2 uSun;        // screen-ish direction toward the sun
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDist;
  void main() {
    vec2 p = vUv * 2.0;                       // -1..1
    float t = uTime * 0.012;
    float n = pFbm(vec3(p * 1.4 + vSeed * 13.0, t + vSeed));
    float n2 = pFbm(vec3(p * 3.6 - vSeed * 5.0, t * 1.7));
    // cumulus: three rounded lobes along the top, a flat base
    float j = vSeed * 6.2831;
    vec2 c1 = vec2(-0.42 + 0.08 * sin(j), -0.12);
    vec2 c2 = vec2( 0.05 + 0.06 * cos(j * 1.3), 0.08 + 0.1 * sin(j * 0.7));
    vec2 c3 = vec2( 0.46 + 0.08 * cos(j), -0.14);
    vec2 q = p * vec2(1.0, 1.9);
    float d = min(min(length(q - c1 * vec2(1.0, 1.9)) / 0.5, length(q - c2 * vec2(1.0, 1.9)) / 0.62), length(q - c3 * vec2(1.0, 1.9)) / 0.46);
    d += (n - 0.5) * 0.55 + (n2 - 0.5) * 0.22;
    float body = 1.0 - smoothstep(0.62, 1.0, d);
    body *= smoothstep(-0.62, -0.3, p.y + (n - 0.5) * 0.35);
    if (body < 0.004) discard;

    // light: bright tops and sun side, a soft lavender belly, a lit rim
    float lit = smoothstep(-0.45, 0.6, p.y * 1.3 + dot(p, normalize(uSun)) * 0.4 + (n2 - 0.5) * 0.7);
    vec3 col = mix(uShade, uLit, lit);
    col += uLit * (1.0 - smoothstep(0.0, 0.45, body)) * 0.18 * lit;
    float haze = smoothstep(uFogNear, uFogFar, vDist);
    col = mix(col, uHaze, haze * 0.75);

    gl_FragColor = vec4(col, smoothstep(0.0, 0.55, body) * uOpacity * 0.86);
    #include <colorspace_fragment>
  }
`

/** One cloud in island-local world units. */
export interface CloudSpec { x: number; y: number; z: number; w: number; h: number; seed: number }

export function IslandClouds({ sea, clouds, opacity, motion }: {
  sea: SeaPalette
  clouds: CloudSpec[]
  opacity: React.MutableRefObject<number>
  motion: number
}) {
  const geo = useMemo(() => {
    const quad = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = quad.index
    g.setAttribute('position', quad.getAttribute('position'))
    g.setAttribute('aCenter', new THREE.InstancedBufferAttribute(new Float32Array(clouds.flatMap((c) => [c.x, c.y, c.z])), 3))
    g.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(clouds.flatMap((c) => [c.w, c.h, c.seed])), 3))
    g.instanceCount = clouds.length
    return g
  }, [clouds])
  useEffect(() => () => geo.dispose(), [geo])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 1 },
      uLit:     { value: new THREE.Color() },
      uShade:   { value: new THREE.Color() },
      uHaze:    { value: new THREE.Color() },
      uSun:     { value: new THREE.Vector2(-0.6, 0.8) },
      uFogNear: { value: 70 },
      uFogFar:  { value: 330 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }), [])
  useEffect(() => () => mat.dispose(), [mat])

  useEffect(() => {
    ;(mat.uniforms.uLit.value as THREE.Color).set(sea.cloud)
    ;(mat.uniforms.uShade.value as THREE.Color).set(sea.cloudShade).lerp(new THREE.Color(sea.shadowTint), 0.25)
    ;(mat.uniforms.uHaze.value as THREE.Color).set(sea.skyHorizon)
    mat.uniforms.uFogNear.value = sea.fog.near
    mat.uniforms.uFogFar.value = sea.fog.far
  }, [sea, mat])

  const time = useRef(Math.random() * 100)
  useFrame((_, delta) => {
    time.current += Math.min(delta, 0.25) * motion
    mat.uniforms.uTime.value = time.current
    mat.uniforms.uOpacity.value = opacity.current
  })

  if (!clouds.length) return null
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={4} />
}

'use client'

// Ocean — a painterly sea under the daylight sky. One large plane at SEA_Y
// that follows the camera in x/z (the waves are computed in world space, so
// nothing swims). The fragment shader builds a moving height field from two
// fbm layers, takes its slope as the normal, and shades:
//   water body   deep near → lighter mid → hazy far (distance)
//   reflection   the sky gradient by the reflected ray, weighted by fresnel
//   sun glints   a tight specular lobe plus sparse glitter on wave crests
//   shallows     a turquoise ring and a breathing foam line around each island
//   haze         toward the sky's horizon colour, so the edge meets the dome

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SeaPalette } from '@/lib/palette'
import { NOISE2_GLSL, SEA_Y, islandVisibility } from './seaShared'

export const MAX_ISLANDS = 8
export const MAX_BOATS = 8

const VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uFar;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  uniform vec3 uSun;
  uniform vec3 uSkyZenith;
  uniform vec3 uSkyMid;
  uniform vec3 uSkyHorizon;
  uniform vec3 uSunDir;
  uniform vec3 uCamPos;
  uniform float uTime;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform int uOctaves;
  uniform vec4 uIslands[${MAX_ISLANDS}];   // x, z, footprint radius, x stretch
  uniform float uIslandVis[${MAX_ISLANDS}]; // 0..1, fades with the island
  uniform int uIslandCount;
  uniform vec4 uBoats[${MAX_BOATS}];      // x, z, heading, hull length
  uniform vec2 uBoatFx[${MAX_BOATS}];     // visibility, moving (0 moored)
  uniform int uBoatCount;
  varying vec3 vWorld;
  ${NOISE2_GLSL}

  float waves(vec2 p) {
    float a = fbm2(p * 0.16 + vec2(uTime * 0.05, uTime * 0.03), uOctaves);
    float b = fbm2(p * 0.42 - vec2(uTime * 0.07, -uTime * 0.04), uOctaves);
    return a * 0.65 + b * 0.35;
  }

  vec3 skyAt(float h) {
    vec3 c = mix(uSkyHorizon, uSkyMid, smoothstep(-0.01, 0.2, h));
    return mix(c, uSkyZenith, smoothstep(0.18, 0.75, h));
  }

  void main() {
    vec2 p = vWorld.xz;
    float dist = length(uCamPos.xz - p);

    // slope of the height field → normal (stronger up close, calmer far off)
    float e  = 0.35;
    float h0 = waves(p);
    float hx = waves(p + vec2(e, 0.0));
    float hz = waves(p + vec2(0.0, e));
    float amp = mix(2.2, 0.6, smoothstep(10.0, 140.0, dist));
    vec3 N = normalize(vec3(-(hx - h0) / e * amp, 1.0, -(hz - h0) / e * amp));

    vec3 V = normalize(uCamPos - vWorld);
    vec3 R = reflect(-V, N);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);

    vec3 water = mix(uDeep, uMid, smoothstep(6.0, 70.0, dist));
    water = mix(water, uFar, smoothstep(90.0, 320.0, dist));
    vec3 col = mix(water, skyAt(max(R.y, 0.0)), clamp(fres * 0.85 + 0.06, 0.0, 1.0));

    // sun: a tight lobe and glitter on the crests facing it
    vec3 S = normalize(uSunDir);
    float lobe = pow(max(dot(R, S), 0.0), 220.0);
    float glitter = step(0.93, vnoise(p * 3.1 + uTime * 0.8)) * pow(max(dot(R, S), 0.0), 18.0);
    col += uSun * (lobe * 1.6 + glitter * 0.7);

    // shallows + foam around islands
    for (int i = 0; i < ${MAX_ISLANDS}; i++) {
      if (i >= uIslandCount) break;
      vec4 isl = uIslands[i];
      vec2 q = (p - isl.xy);
      q.x /= isl.w;
      float d = length(q) - isl.z;
      float shallow = (1.0 - smoothstep(0.0, isl.z * 0.55 + 2.0, d)) * uIslandVis[i];
      col = mix(col, uShallow, shallow * 0.55);
      float breathe = 0.6 + 0.35 * sin(uTime * 0.9 + h0 * 9.0);
      float foam = (1.0 - smoothstep(0.0, 0.9 + breathe, d)) * smoothstep(-0.6, 0.1, d);
      foam *= smoothstep(0.35, 0.65, vnoise(p * 1.7 + uTime * 0.25) + 0.25);
      col = mix(col, uFoam, foam * 0.85 * uIslandVis[i]);
    }

    // boat wakes: a V of foam spreading behind the stern, a churned centre
    // line, and a ring where the hull meets the water
    for (int i = 0; i < ${MAX_BOATS}; i++) {
      if (i >= uBoatCount) break;
      vec4 b = uBoats[i];
      vec2 fx = uBoatFx[i];
      if (fx.x < 0.01) continue;
      vec2 fwd = vec2(sin(b.z), cos(b.z));
      vec2 rel = p - b.xy;
      float u = -dot(rel, fwd);                       // distance behind the boat
      float v = dot(rel, vec2(fwd.y, -fwd.x));         // sideways
      float L = b.w;
      float behind = step(-0.2 * L, u) * (1.0 - smoothstep(0.0, 9.0 * L, u));
      float arms = 1.0 - smoothstep(0.0, 0.1 * L + u * 0.04, abs(abs(v) - max(u, 0.0) * 0.34));
      float churn = (1.0 - smoothstep(0.0, 0.16 * L + u * 0.03, abs(v))) * (1.0 - smoothstep(0.0, 3.5 * L, u));
      float grain = smoothstep(0.3, 0.75, vnoise(p * 2.2 + uTime * 0.6));
      float wake = (arms * 0.75 + churn * 0.55) * behind * grain * fx.y;
      float hull = 1.0 - smoothstep(0.0, 0.12 * L, abs(length(rel / vec2(0.42, 1.0)) - 0.32 * L));
      col = mix(col, uFoam, clamp(wake + hull * 0.5, 0.0, 1.0) * 0.8 * fx.x);
    }

    // haze into the horizon colour
    float f = smoothstep(uFogNear, uFogFar, dist);
    col = mix(col, uSkyHorizon, f);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export interface OceanIsland { x: number; z: number; radius: number; stretch: number; stationT: number; last: boolean }

export interface OceanBoat { x: number; z: number; heading: number; len: number; vis: number; moving: number }

export function Ocean({ sea, octaves, motion, islands, getCamT, boats }: {
  sea: SeaPalette
  octaves: number
  motion: number
  islands: OceanIsland[]
  getCamT: () => number
  /** live boat state (written by <Boats/> every frame) */
  boats?: React.MutableRefObject<OceanBoat[]>
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uDeep:        { value: new THREE.Color() },
      uMid:         { value: new THREE.Color() },
      uFar:         { value: new THREE.Color() },
      uShallow:     { value: new THREE.Color() },
      uFoam:        { value: new THREE.Color() },
      uSun:         { value: new THREE.Color() },
      uSkyZenith:   { value: new THREE.Color() },
      uSkyMid:      { value: new THREE.Color() },
      uSkyHorizon:  { value: new THREE.Color() },
      uSunDir:      { value: new THREE.Vector3() },
      uCamPos:      { value: new THREE.Vector3() },
      uTime:        { value: 0 },
      uFogNear:     { value: 70 },
      uFogFar:      { value: 330 },
      uOctaves:     { value: 3 },
      uIslands:     { value: Array.from({ length: MAX_ISLANDS }, () => new THREE.Vector4()) },
      uIslandCount: { value: 0 },
      uIslandVis:   { value: new Array(MAX_ISLANDS).fill(1) },
      uBoats:       { value: Array.from({ length: MAX_BOATS }, () => new THREE.Vector4()) },
      uBoatFx:      { value: Array.from({ length: MAX_BOATS }, () => new THREE.Vector2()) },
      uBoatCount:   { value: 0 },
    },
    vertexShader:   VERT,
    fragmentShader: FRAG,
    toneMapped:     false,
  }), [])
  useEffect(() => () => mat.dispose(), [mat])

  useEffect(() => {
    const u = mat.uniforms
    ;(u.uDeep.value as THREE.Color).set(sea.waterDeep)
    ;(u.uMid.value as THREE.Color).set(sea.waterMid)
    ;(u.uFar.value as THREE.Color).set(sea.waterFar)
    ;(u.uShallow.value as THREE.Color).set(sea.shallow)
    ;(u.uFoam.value as THREE.Color).set(sea.foam)
    ;(u.uSun.value as THREE.Color).set(sea.sun)
    ;(u.uSkyZenith.value as THREE.Color).set(sea.skyZenith)
    ;(u.uSkyMid.value as THREE.Color).set(sea.skyMid)
    ;(u.uSkyHorizon.value as THREE.Color).set(sea.skyHorizon)
    ;(u.uSunDir.value as THREE.Vector3).set(...sea.sunDir).normalize()
    u.uFogNear.value = sea.fog.near
    u.uFogFar.value  = sea.fog.far
    u.uOctaves.value = Math.max(1, Math.min(4, octaves))
  }, [sea, octaves, mat])

  useEffect(() => {
    const arr = mat.uniforms.uIslands.value as THREE.Vector4[]
    const n = Math.min(MAX_ISLANDS, islands.length)
    for (let i = 0; i < n; i++) arr[i].set(islands[i].x, islands[i].z, islands[i].radius, islands[i].stretch)
    mat.uniforms.uIslandCount.value = n
  }, [islands, mat])

  useFrame(({ camera }, delta) => {
    const m = meshRef.current
    if (m) m.position.set(camera.position.x, SEA_Y, camera.position.z)
    ;(mat.uniforms.uCamPos.value as THREE.Vector3).copy(camera.position)
    const vis = mat.uniforms.uIslandVis.value as number[]
    const camT = getCamT()
    for (let i = 0; i < Math.min(MAX_ISLANDS, islands.length); i++) {
      vis[i] = islandVisibility(camT, islands[i].stationT, islands[i].last)
    }
    mat.uniforms.uTime.value += Math.min(delta, 0.25) * motion
    const live = boats?.current ?? []
    const bv = mat.uniforms.uBoats.value as THREE.Vector4[]
    const bf = mat.uniforms.uBoatFx.value as THREE.Vector2[]
    const nb = Math.min(MAX_BOATS, live.length)
    for (let i = 0; i < nb; i++) {
      bv[i].set(live[i].x, live[i].z, live[i].heading, live[i].len)
      bf[i].set(live[i].vis, live[i].moving)
    }
    mat.uniforms.uBoatCount.value = nb
  })

  return (
    <mesh ref={meshRef} material={mat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-5} frustumCulled={false}>
      <planeGeometry args={[900, 900, 1, 1]} />
    </mesh>
  )
}

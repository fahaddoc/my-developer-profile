'use client'

// Island — one sculpted, painterly island on the sea, its set dressing, and
// the flock that lives on it.
//
// The landform comes from islandShapes.ts (a different KIND per station:
// mountain, karst, lighthouse islet, sandbar, sea stacks, terraces, cove) as
// a dense, smooth mesh with baked material weights and occlusion. The shader
// paints it Ghibli-like (paint.ts): warm key, cool violet shadows, painted
// grass patches, rock strata on cliffs, wet sand at the waterline, a soft
// sky rim and atmospheric haze. Props are placed on the same heightfield.
//
// The flock circles the summit. Hovering (or clicking) the island makes every
// bird lift off outward and up, then settle back into the circle. Once the
// camera has flown past the island's station everything dissolves.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { SeaPalette } from '@/lib/palette'
import { islandVisibility, rng, type IslandShape } from './seaShared'
import { buildIsland, scatter, type IslandMesh } from './islandShapes'
import { PAINT_LIGHT_GLSL, PAINT_NOISE_GLSL, applyPaint, paintUniforms } from './paint'
import { Arch, Lighthouse, Palms, Trees, type PlacedProp } from './IslandProps'

// ─── painterly island material ─────────────────────────────────────────────
const ISLAND_VERT = /* glsl */ `
  attribute vec4 aMat;   // sand, grass, rock, wet
  attribute float aAO;
  varying vec3 vW;
  varying vec3 vN;
  varying vec4 vMat;
  varying float vAO;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    // the island is scaled non-uniformly (radius, height, radius)
    vN = normalize(transpose(inverse(mat3(modelMatrix))) * normal);
    vMat = aMat;
    vAO = aAO;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const ISLAND_FRAG = /* glsl */ `
  ${PAINT_NOISE_GLSL}
  ${PAINT_LIGHT_GLSL}
  uniform vec3 uSand;
  uniform vec3 uSandWet;
  uniform vec3 uGrass;
  uniform vec3 uGrassLight;
  uniform vec3 uGrassDark;
  uniform vec3 uRock;
  uniform vec3 uRockLight;
  uniform vec3 uRockDark;
  uniform float uStrata;     // world units between rock strata
  uniform float uPatch;      // world scale of the painted colour patches
  varying vec3 vW;
  varying vec3 vN;
  varying vec4 vMat;
  varying float vAO;
  void main() {
    vec3 N = normalize(vN);
    vec3 L = normalize(uKeyDir);
    float patchN = pFbm(vW / uPatch);
    float grain = pNoise(vW * 2.4);

    // grass: dark/light patches, warmer and lighter where the sun lands
    vec3 grass = mix(uGrassDark, uGrass, smoothstep(0.28, 0.72, patchN + N.y * 0.22));
    grass = mix(grass, uGrassLight, smoothstep(0.58, 0.9, patchN) * 0.55 * smoothstep(0.1, 0.8, dot(N, L)));

    // rock: painted patches first; faint, broken strata only on steep faces
    float steep = smoothstep(0.55, 0.9, 1.0 - abs(N.y));
    float warp = pFbm(vW / (uPatch * 0.3)) * 6.0;
    float strata = sin(vW.y / uStrata * 6.2831 + warp) * smoothstep(0.35, 0.75, pNoise(vW / (uPatch * 0.25)));
    vec3 rock = mix(uRockDark, uRock, smoothstep(0.15, 0.8, patchN + grain * 0.2));
    rock = mix(rock, uRockDark, max(0.0, strata) * 0.22 * steep);
    rock = mix(rock, uRockLight, smoothstep(0.55, 0.95, pFbm(vW / (uPatch * 0.6) + 3.0)) * 0.45);

    vec3 sand = mix(uSand, uSandWet, vMat.w);

    float wsum = vMat.x + vMat.y + vMat.z + 1e-4;
    vec3 albedo = (sand * vMat.x + grass * vMat.y + rock * vMat.z) / wsum;
    albedo *= 0.93 + grain * 0.14;

    // a little painted relief on rock (perturb the normal, not the mesh)
    vec3 bump = vec3(pNoise(vW * 1.3) - 0.5, 0.0, pNoise(vW * 1.3 + 7.0) - 0.5);
    N = normalize(N + bump * 0.35 * (vMat.z / wsum));

    vec3 col = paint(albedo, N, vW, vAO);
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`

function islandMaterial(sea: SeaPalette) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...paintUniforms(),
      uSand:       { value: new THREE.Color(sea.sand) },
      uSandWet:    { value: new THREE.Color(sea.sandWet) },
      uGrass:      { value: new THREE.Color(sea.grass) },
      uGrassLight: { value: new THREE.Color(sea.grassLight) },
      uGrassDark:  { value: new THREE.Color(sea.grassDark) },
      uRock:       { value: new THREE.Color(sea.rock) },
      uRockLight:  { value: new THREE.Color(sea.rockLight) },
      uRockDark:   { value: new THREE.Color(sea.rockDark) },
      uStrata:     { value: 1 },
      uPatch:      { value: 4 },
    },
    vertexShader: ISLAND_VERT,
    fragmentShader: ISLAND_FRAG,
    // transparent only so it can dissolve after the camera passes; it still
    // writes depth, so it sorts like a solid against the ocean
    transparent: true,
    depthWrite: true,
    toneMapped: false,
  })
  applyPaint(m, sea)
  return m
}

// ─── props per landform ────────────────────────────────────────────────────
type Accept = (h: number, slope: number, x: number, z: number) => boolean
const TREE_RULES: Record<IslandShape['kind'], Accept> = {
  peak:     (h, s) => h > 0.06 && h < 0.55 && s < 0.5,
  karst:    (h, s) => h > 0.62 && s < 0.3,
  islet:    (h, s) => h > 0.18 && h < 0.75 && s < 0.5,
  sandbar:  () => false,
  stacks:   (h, s) => h > 0.6 && s < 0.32,
  terraces: (h, s) => h > 0.06 && h < 0.9 && s < 0.4,
  cove:     (h, s, _x, z) => h > 0.3 && s < 0.5 && z < 0.2,
}
const PALM_RULES: Record<IslandShape['kind'], Accept> = {
  peak:     (h, s, x, z) => h > 0.015 && h < 0.09 && s < 0.35 && z > 0.3 && x < 0.1,
  karst:    () => false,
  islet:    () => false,
  sandbar:  (h, s) => h > 0.3 && s < 0.4,
  stacks:   () => false,
  terraces: () => false,
  cove:     (h, s, _x, z) => h > 0.02 && h < 0.2 && s < 0.35 && z > 0.05,
}

function placeProps(mesh: IslandMesh, shape: IslandShape, radius: number, height: number, n: number, rule: Accept, px: number, seed: number): PlacedProp[] {
  if (n <= 0) return []
  const r = rng(seed)
  const size = (height * px) / shape.peakPx
  return scatter(mesh, n, seed, rule).map((p) => ({
    x: p.x * shape.stretch * radius,
    y: p.h * height - size * 0.04,
    z: p.z * radius,
    scale: size * p.s,
    yaw: r() * Math.PI * 2,
    tint: p.tint,
  }))
}

// ─── Flock ─────────────────────────────────────────────────────────────────
const BIRD_VERT = /* glsl */ `
  attribute vec4 aBird;      // phase, radius, height, speed
  attribute float aSize;
  uniform float uTime;
  uniform float uLaunch;     // 0..1 lift-off envelope
  uniform float uScale;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  varying float vFog;
  void main() {
    float phase = aBird.x;
    float radius = aBird.y;
    float height = aBird.z;
    float speed  = aBird.w;
    float a = phase * 6.2831 + uTime * speed;
    vec3 off = vec3(cos(a) * radius, height + sin(uTime * 0.7 + phase * 9.0) * 0.12, sin(a) * radius);
    // lift-off: out and up, then back into the circle
    vec2 outward = normalize(off.xz + 1e-4);
    off.xz += outward * uLaunch * radius * 2.4;
    off.y  += uLaunch * (0.5 + phase * 0.5);
    off *= uScale;

    vec3 fwd = normalize(vec3(-sin(a), 0.0, cos(a)) * sign(speed));
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 right = normalize(cross(fwd, up));

    vec3 v = position;
    float flapRate = 9.0 + uLaunch * 7.0;
    v.y += sin(uTime * flapRate + phase * 31.0) * abs(v.x) * 0.7;
    vec3 local = (right * v.x + up * v.y + fwd * v.z) * aSize * uScale;

    vec4 world = modelMatrix * vec4(off + local, 1.0);
    vec4 mv = viewMatrix * world;
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`
const BIRD_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uFogColor;
  varying float vFog;
  void main() {
    gl_FragColor = vec4(mix(uColor, uFogColor, vFog), 1.0);
    #include <colorspace_fragment>
  }
`

function birdGeometry() {
  // a gull in a few triangles: two swept wings and a sliver of body
  const g = new THREE.BufferGeometry()
  const v = new Float32Array([
    // left wing
    0, 0, 0.12,   -1, 0.12, -0.18,   0, 0, -0.18,
    // right wing
    0, 0, 0.12,    0, 0, -0.18,      1, 0.12, -0.18,
    // body
    0, 0.02, 0.32, -0.06, 0, -0.1,   0.06, 0, -0.1,
  ])
  g.setAttribute('position', new THREE.BufferAttribute(v, 3))
  return g
}

function Flock({ count, seed, sea, summit, scale, motion, launchRef }: {
  count: number
  seed: number
  sea: SeaPalette
  summit: THREE.Vector3
  scale: number
  motion: number
  launchRef: React.MutableRefObject<number>
}) {
  const geo = useMemo(() => {
    const base = birdGeometry()
    const ig = new THREE.InstancedBufferGeometry()
    ig.index = base.index
    ig.setAttribute('position', base.getAttribute('position'))
    const r = rng(seed * 7 + 3)
    const bird = new Float32Array(count * 4)
    const size = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      bird[i * 4 + 0] = r()
      bird[i * 4 + 1] = 0.16 + r() * 0.3           // circle radius (× flock scale)
      bird[i * 4 + 2] = 0.02 + r() * 0.12          // height above the summit
      bird[i * 4 + 3] = (0.25 + r() * 0.25) * (r() > 0.3 ? 1 : -1)
      size[i] = 0.022 + r() * 0.014
    }
    ig.setAttribute('aBird', new THREE.InstancedBufferAttribute(bird, 4))
    ig.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1))
    ig.instanceCount = count
    return ig
  }, [count, seed])
  useEffect(() => () => geo.dispose(), [geo])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:     { value: 0 },
      uLaunch:   { value: 0 },
      uScale:    { value: 1 },
      uColor:    { value: new THREE.Color() },
      uFogColor: { value: new THREE.Color() },
      uFogNear:  { value: 70 },
      uFogFar:   { value: 330 },
    },
    vertexShader:   BIRD_VERT,
    fragmentShader: BIRD_FRAG,
    side:           THREE.DoubleSide,
    toneMapped:     false,
  }), [])
  useEffect(() => () => mat.dispose(), [mat])

  useEffect(() => {
    ;(mat.uniforms.uColor.value as THREE.Color).set(sea.bird)
    ;(mat.uniforms.uFogColor.value as THREE.Color).set(sea.skyHorizon)
    mat.uniforms.uFogNear.value = sea.fog.near
    mat.uniforms.uFogFar.value  = sea.fog.far
    mat.uniforms.uScale.value   = scale
  }, [sea, scale, mat])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.25)
    mat.uniforms.uTime.value += dt * (motion || 0)
    // launch envelope: rises over ~0.5s, holds, then settles over ~2.5s
    const since = performance.now() / 1000 - launchRef.current
    const env = since < 0 || since > 3.2 ? 0 : since < 0.5 ? since / 0.5 : 1 - Math.min(1, (since - 0.5) / 2.7)
    mat.uniforms.uLaunch.value = motion ? env * env * (3 - 2 * env) : 0
  })

  return (
    <mesh geometry={geo} material={mat} position={summit} frustumCulled={false} renderOrder={2} />
  )
}

// ─── Island ────────────────────────────────────────────────────────────────
export function Island({ shape, sea, position, yaw, radius, height, birds, motion, onActive, stationT, getCamT, last, detail }: {
  shape: IslandShape
  sea: SeaPalette
  position: THREE.Vector3
  yaw: number
  radius: number
  height: number
  birds: number
  motion: number
  onActive?: (ms?: number) => void
  stationT: number
  getCamT: () => number
  last: boolean
  /** 0..1 mesh density (quality tier) */
  detail: number
}) {
  const mesh = useMemo(() => buildIsland(shape, detail), [shape, detail])
  useEffect(() => () => mesh.geo.dispose(), [mesh])

  const mat = useMemo(() => islandMaterial(sea), [sea])
  useEffect(() => () => mat.dispose(), [mat])
  useEffect(() => {
    mat.uniforms.uStrata.value = Math.max(0.05, height * 0.075)
    mat.uniforms.uPatch.value  = Math.max(0.5, radius * 0.35)
  }, [mat, height, radius])

  const trees = useMemo(
    () => placeProps(mesh, shape, radius, height, shape.props.trees, TREE_RULES[shape.kind], 26, shape.seed * 3 + 1),
    [mesh, shape, radius, height],
  )
  const palms = useMemo(
    () => placeProps(mesh, shape, radius, height, shape.props.palms, PALM_RULES[shape.kind], 24, shape.seed * 5 + 2),
    [mesh, shape, radius, height],
  )
  const summitWorld = useMemo(
    () => new THREE.Vector3(mesh.summit.x * radius, mesh.summit.y * height, mesh.summit.z * radius),
    [mesh, radius, height],
  )
  const arch = useMemo(() => {
    if (!shape.props.arch) return null
    const a = mesh.sample(-0.32, 0.04), b = mesh.sample(0.34, -0.06)
    return {
      from: new THREE.Vector3(-0.32 * shape.stretch * radius, a.h * height, 0.04 * radius),
      to:   new THREE.Vector3(0.34 * shape.stretch * radius, b.h * height, -0.06 * radius),
      base: Math.min(a.h, b.h) * height * 0.55,
    }
  }, [shape, mesh, radius, height])

  const opacity  = useRef(1)
  const groupRef = useRef<THREE.Group>(null)
  const flockRef = useRef<THREE.Group>(null)
  useFrame(({ camera }) => {
    ;(mat.uniforms.uCamPos.value as THREE.Vector3).copy(camera.position)
    if (last) return
    const vis = islandVisibility(getCamT(), stationT, last)
    opacity.current = vis
    if (Math.abs(mat.uniforms.uOpacity.value - vis) > 1e-3) mat.uniforms.uOpacity.value = vis
    const g = groupRef.current
    if (g && g.visible !== vis > 0.002) g.visible = vis > 0.002
    if (flockRef.current) flockRef.current.visible = vis > 0.5
  })

  const launchRef = useRef(-100)
  const launch = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    e.stopPropagation()
    const now = performance.now() / 1000
    if (now - launchRef.current > 2.4) {
      launchRef.current = now
      onActive?.(3400)
    }
  }

  const flockCenter = useMemo(
    () => summitWorld.clone().add(new THREE.Vector3(0, height * 0.08, 0)),
    [summitWorld, height],
  )

  return (
    <group ref={groupRef} position={position} rotation={[0, yaw, 0]}>
      <mesh
        geometry={mesh.geo}
        material={mat}
        scale={[radius, height, radius]}
        onPointerOver={launch}
        onClick={launch}
      />
      <Trees sea={sea} items={trees} opacity={opacity} />
      <Palms sea={sea} items={palms} opacity={opacity} />
      {shape.props.lighthouse && (
        <Lighthouse sea={sea} at={summitWorld} size={(height * 46) / shape.peakPx} opacity={opacity} motion={motion} />
      )}
      {arch && <Arch sea={sea} from={arch.from} to={arch.to} base={arch.base} opacity={opacity} />}
      {shape.birds && birds > 0 && (
        <group ref={flockRef}>
          <Flock
            count={birds}
            seed={shape.seed}
            sea={sea}
            summit={shape.props.lighthouse ? flockCenter.clone().add(new THREE.Vector3(0, height * 0.35, 0)) : flockCenter}
            scale={Math.max(radius * 0.55, height * 0.9)}
            motion={motion}
            launchRef={launchRef}
          />
        </group>
      )}
    </group>
  )
}

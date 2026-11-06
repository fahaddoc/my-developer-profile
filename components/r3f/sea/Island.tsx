'use client'

// Island — one sculpted island on the sea, plus the flock that lives on it.
//
// Geometry is built once per shape: a polar grid (rings × segments) whose
// height is a sum of gaussian peaks, roughened with fbm, tapered to sink just
// under the waterline at the rim, and steepened by `cliff`. Vertex colours
// paint it by height and slope (sand at the waterline, grass on gentle
// slopes, rock on steep faces and the summit); flat shading keeps the
// sculpted, faceted look. It is lit by the sea world's sun + sky light.
//
// The flock circles the highest peak. Hovering (or clicking) the island makes
// every bird lift off outward and up, then settle back into the circle.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { SeaPalette } from '@/lib/palette'
import { islandVisibility, rng, type IslandShape } from './seaShared'

const RINGS = 30
const SEGS  = 72

function noise2(seed: number) {
  const r = rng(seed)
  const perm = Array.from({ length: 256 }, () => r())
  const at = (x: number, y: number) => perm[((x & 15) * 16 + (y & 15)) & 255]
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = x - xi, yf = y - yi
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1)
    return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v
  }
}

/** Unit island: footprint radius 1 (x stretched), tallest peak height 1. */
export function buildIslandGeometry(shape: IslandShape, sea: SeaPalette) {
  const n = noise2(shape.seed)
  const fbm = (x: number, y: number) =>
    n(x, y) * 0.5 + n(x * 2.1 + 5, y * 2.1 + 9) * 0.25 + n(x * 4.3 + 11, y * 4.3 + 3) * 0.125

  const pos: number[] = []
  const col: number[] = []
  const heights: number[][] = []

  const heightAt = (x: number, z: number, r: number) => {
    let h = 0
    for (const pk of shape.peaks) {
      const dx = x - pk.x, dz = z - pk.z
      h = Math.max(h, pk.h * Math.exp(-(dx * dx + dz * dz) / (pk.r * pk.r)))
      h += pk.h * 0.25 * Math.exp(-(dx * dx + dz * dz) / (pk.r * pk.r * 3))
    }
    // cliffs: push mid heights up so faces get steeper
    h = Math.pow(Math.min(1.4, h), 1 - shape.cliff * 0.45)
    h += (fbm(x * 3 + shape.seed, z * 3) - 0.45) * shape.rugged * (0.4 + h)
    // rim taper: the shore slides under the water
    const taper = 1 - Math.pow(Math.min(1, Math.max(0, (r - 0.62) / 0.4)), 2)
    return h * taper - Math.max(0, r - 0.9) * 0.6
  }

  for (let i = 0; i <= RINGS; i++) {
    const r = (i / RINGS) * 1.08
    const row: number[] = []
    for (let j = 0; j < SEGS; j++) {
      const a = (j / SEGS) * Math.PI * 2
      // a little irregularity in the coastline
      const wob = 1 + (fbm(Math.cos(a) * 2 + shape.seed, Math.sin(a) * 2) - 0.45) * 0.35 * Math.min(1, r)
      const x = Math.cos(a) * r * wob
      const z = Math.sin(a) * r * wob
      row.push(heightAt(x, z, r))
    }
    heights.push(row)
  }
  let maxH = 0
  for (const row of heights) for (const h of row) maxH = Math.max(maxH, h)
  const norm = maxH > 0 ? 1 / maxH : 1

  const cSand  = new THREE.Color(sea.sand)
  const cGrass = new THREE.Color(sea.grass)
  const cGrassD= new THREE.Color(sea.grassDark)
  const cRock  = new THREE.Color(sea.rock)
  const cRockD = new THREE.Color(sea.rockDark)
  const tmp    = new THREE.Color()

  const vtx = (i: number, j: number) => {
    const jj = ((j % SEGS) + SEGS) % SEGS
    const r = (i / RINGS) * 1.08
    const a = (jj / SEGS) * Math.PI * 2
    const wob = 1 + (fbm(Math.cos(a) * 2 + shape.seed, Math.sin(a) * 2) - 0.45) * 0.35 * Math.min(1, r)
    return [Math.cos(a) * r * wob * shape.stretch, heights[i][jj] * norm, Math.sin(a) * r * wob]
  }

  const paint = (h: number, slope: number, x: number, z: number) => {
    const v = (fbm(x * 6 + 3, z * 6 + 7) - 0.45) * 0.5
    if (h < 0.05 + v * 0.03) return tmp.copy(cSand)
    if (slope > 1.6 - shape.cliff * 0.4 || h > 0.88 + v * 0.1) {
      return tmp.copy(cRock).lerp(cRockD, Math.min(1, Math.max(0, (slope - 1) * 0.6 + v)))
    }
    return tmp.copy(cGrass).lerp(cGrassD, Math.min(1, Math.max(0, 0.35 + v + (0.6 - h) * 0.4)))
  }

  const pushTri = (a: number[], b: number[], c: number[]) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const nx = ab[1] * ac[2] - ab[2] * ac[1]
    const ny = ab[2] * ac[0] - ab[0] * ac[2]
    const nz = ab[0] * ac[1] - ab[1] * ac[0]
    const len = Math.hypot(nx, ny, nz) || 1
    const slope = Math.sqrt(Math.max(0, 1 - (ny / len) ** 2)) / Math.max(0.05, Math.abs(ny / len))
    const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3, cz = (a[2] + b[2] + c[2]) / 3
    const k = paint(cy, slope, cx, cz)
    for (const p of [a, b, c]) {
      pos.push(p[0], p[1], p[2])
      col.push(k.r, k.g, k.b)
    }
  }

  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SEGS; j++) {
      const a = vtx(i, j), b = vtx(i + 1, j), c = vtx(i + 1, j + 1), d = vtx(i, j + 1)
      // winding: counter-clockwise seen from above (normals up)
      pushTri(a, c, b)
      pushTri(a, d, c)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()

  // summit (for the flock), in unit space
  let best = { x: 0, y: 0, z: 0 }
  for (let i = 0; i < pos.length; i += 3) if (pos[i + 1] > best.y) best = { x: pos[i], y: pos[i + 1], z: pos[i + 2] }
  return { geo, summit: new THREE.Vector3(best.x, best.y, best.z) }
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
export function Island({ shape, sea, position, yaw, radius, height, birds, motion, onActive, stationT, getCamT, last }: {
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
}) {
  const { geo, summit } = useMemo(() => buildIslandGeometry(shape, sea), [shape, sea])
  useEffect(() => () => geo.dispose(), [geo])

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading:  true,
    roughness:    0.92,
    metalness:    0,
    toneMapped:   false,
    // transparent only so it can dissolve after the camera passes; it still
    // writes depth, so it sorts like a solid against the ocean
    transparent:  true,
    depthWrite:   true,
  }), [])
  useEffect(() => () => mat.dispose(), [mat])

  const groupRef = useRef<THREE.Group>(null)
  const flockRef = useRef<THREE.Group>(null)
  useFrame(() => {
    if (last) return
    const vis = islandVisibility(getCamT(), stationT, last)
    if (Math.abs(mat.opacity - vis) > 1e-3) mat.opacity = vis
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

  // the flock lives in world units around the summit
  const summitWorld = useMemo(
    () => new THREE.Vector3(summit.x * radius, summit.y * height + height * 0.08, summit.z * radius),
    [summit, radius, height],
  )

  return (
    <group ref={groupRef} position={position} rotation={[0, yaw, 0]}>
      <mesh
        geometry={geo}
        material={mat}
        scale={[radius, height, radius]}
        onPointerOver={launch}
        onClick={launch}
      />
      {shape.birds && birds > 0 && (
        <group ref={flockRef}>
        <Flock
          count={birds}
          seed={shape.seed}
          sea={sea}
          summit={summitWorld}
          scale={Math.max(radius * 0.55, height * 0.9)}
          motion={motion}
          launchRef={launchRef}
        />
        </group>
      )}
    </group>
  )
}

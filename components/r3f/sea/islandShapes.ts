// components/r3f/sea/islandShapes.ts — sculpting the islands.
//
// Every island is a heightfield over a unit footprint (radius 1, x stretched),
// but each KIND has its own landform so no two read alike:
//   peak      a jagged mountain with ridged flanks and a beach cove carved
//             into the front
//   karst     sheer limestone towers with flat green tops (Ha Long Bay)
//   islet     a small rounded dome for the lighthouse
//   sandbar   a long, barely-there spit of sand with a low dune
//   stacks    two or three sea stacks of different heights (the arch is a
//             separate mesh)
//   terraces  rolling hills cut into soft steps, like rice terraces
//   cove      a crescent: a green ridge at the back wrapped around a sandy bay
//
// The mesh is a dense polar grid (centre fan + rings) with SHARED vertices,
// so normals are smooth: no facets. Per vertex it bakes what the painterly
// shader needs: material weights (sand, grass, rock, wet sand), a cheap
// ambient occlusion from curvature, and the height. Props are sampled from
// the same heightfield.

import * as THREE from 'three'
import { rng, type IslandShape } from './seaShared'

// ─── seeded noise ──────────────────────────────────────────────────────────
function makeNoise(seed: number) {
  const r = rng(seed)
  const N = 256
  const perm = new Uint8Array(N * 2)
  const p = Array.from({ length: N }, (_, i) => i)
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]] }
  for (let i = 0; i < N * 2; i++) perm[i] = p[i & 255]
  const val = Array.from({ length: N }, () => r())
  const at = (x: number, y: number) => val[perm[(perm[x & 255] + y) & 255]]
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = x - xi, yf = y - yi
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
  const fbm = (x: number, y: number, oct = 4) => {
    let s = 0, a = 0.5, f = 1, n = 0
    for (let i = 0; i < oct; i++) { s += a * noise(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= 0.5; f *= 2.03 }
    return s / n
  }
  // ridged: sharp crests, used for mountain flanks
  const ridged = (x: number, y: number, oct = 4) => {
    let s = 0, a = 0.5, f = 1, n = 0
    for (let i = 0; i < oct; i++) {
      const v = 1 - Math.abs(noise(x * f + i * 31.7, y * f + i * 5.3) * 2 - 1)
      s += a * v * v; n += a; a *= 0.5; f *= 2.1
    }
    return s / n
  }
  return { noise, fbm, ridged }
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const gauss = (x: number, z: number, cx: number, cz: number, r: number) =>
  Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r))

/** Raw (un-normalised) height for a footprint point; x,z in -1..1, r = radius. */
function heightFn(shape: IslandShape) {
  const { fbm, ridged } = makeNoise(shape.seed)
  // every island sinks under the water a little past its coastline
  const shore = (r: number, edge = 0.92) => 1 - smooth(edge - 0.3, edge + 0.1, r)

  switch (shape.kind) {
    case 'peak': return (x: number, z: number, r: number) => {
      const dome  = 0.22 * Math.pow(Math.max(0, 1 - r * r), 1.2)
      const main  = Math.pow(gauss(x, z, 0.1, -0.05, 0.36), 1.25)
      const side  = 0.48 * gauss(x, z, -0.42, 0.12, 0.3) + 0.3 * gauss(x, z, 0.5, 0.25, 0.25)
      const flank = ridged(x * 2.2 + 3, z * 2.2) * 0.32 * smooth(0.05, 0.6, main + side)
      let h = dome + main + side + flank + (fbm(x * 4, z * 4) - 0.5) * 0.06
      // a beach cove bitten into the front left
      h *= 1 - 0.9 * gauss(x, z, -0.3, 0.72, 0.28)
      return h * shore(r)
    }
    case 'karst': return (x: number, z: number, r: number) => {
      const a = Math.atan2(z, x)
      const rn = r + (fbm(Math.cos(a) * 1.6 + 4, Math.sin(a) * 1.6) - 0.5) * 0.28
      const main = smooth(0.74, 0.62, rn) * (0.82 + fbm(x * 3, z * 3) * 0.22)
      // a taller second tower and a lone pinnacle
      const t2 = smooth(0.3, 0.2, Math.hypot(x - 0.36, z + 0.24) + (fbm(x * 5, z * 5) - 0.5) * 0.08) * 1.12
      const t3 = smooth(0.13, 0.07, Math.hypot(x + 0.62, z - 0.42)) * 0.62
      const talus = 0.1 * (1 - smooth(0.62, 1.0, r))
      return Math.max(main, t2, t3, talus) + (fbm(x * 9, z * 9) - 0.5) * 0.02
    }
    case 'islet': return (x: number, z: number, r: number) => {
      const dome = Math.pow(Math.max(0, 1 - (r / 0.78) ** 2), 1.15)
      const rocks = (fbm(x * 6, z * 6) - 0.5) * 0.12 * smooth(0.3, 0.75, r)
      return dome + rocks + 0.05 * shore(r)
    }
    case 'sandbar': return (x: number, z: number, r: number) => {
      const spit = 0.35 * Math.pow(Math.max(0, 1 - r * r), 0.7)
      const dune = 0.65 * gauss(x, z, 0.12, -0.05, 0.32)
      return (spit + dune + (fbm(x * 5, z * 5) - 0.5) * 0.05) * shore(r, 0.9)
    }
    case 'stacks': return (x: number, z: number, r: number) => {
      const stack = (cx: number, cz: number, rad: number, h: number) =>
        smooth(rad + 0.04, rad - 0.03, Math.hypot(x - cx, z - cz) + (fbm(x * 7 + cx, z * 7) - 0.5) * 0.06) * h
      const s1 = stack(-0.32, 0.04, 0.2, 1.0) * (0.94 + fbm(x * 4, z * 4) * 0.1)
      const s2 = stack(0.34, -0.06, 0.16, 0.74)
      const s3 = stack(0.06, 0.4, 0.1, 0.38)
      const reef = 0.06 * (1 - smooth(0.35, 0.95, r)) * (0.6 + fbm(x * 6, z * 6))
      return Math.max(s1, s2, s3, reef)
    }
    case 'terraces': return (x: number, z: number, r: number) => {
      let h = gauss(x, z, 0.2, 0.0, 0.46) + 0.66 * gauss(x, z, -0.38, 0.16, 0.38) + 0.42 * gauss(x, z, 0.52, 0.32, 0.27)
      h += (fbm(x * 3, z * 3) - 0.5) * 0.1
      const steps = 7
      const t = h * steps
      const stepped = (Math.floor(t) + smooth(0.3, 0.7, t - Math.floor(t))) / steps
      return (stepped * 0.72 + h * 0.28) * shore(r)
    }
    case 'cove': return (x: number, z: number, r: number) => {
      // ridge across the back, low arms wrapping round a bay at the front
      const ridge = Math.exp(-((z + 0.32) ** 2) / 0.09) * (0.75 + 0.25 * Math.cos(x * 2.4))
      const peak = 0.55 * gauss(x, z, 0.32, -0.36, 0.26)
      const arms = 0.3 * Math.max(0, 1 - r * r)
      let h = ridge + peak + arms + (fbm(x * 4, z * 4) - 0.5) * 0.08
      h *= 1 - 0.95 * gauss(x * 0.9, z, 0, 0.55, 0.42)
      return h * shore(r)
    }
  }
}

export interface IslandMesh {
  geo: THREE.BufferGeometry
  /** summit in unit space (x stretched, y 0..1) */
  summit: THREE.Vector3
  /** unit-space sampler: height (0..1 normalised) and slope (0 flat .. 1 vertical) */
  sample: (x: number, z: number) => { h: number; slope: number }
}

/** Build the sculpted mesh. `detail` 0..1 scales the grid (quality tiers). */
export function buildIsland(shape: IslandShape, detail = 1): IslandMesh {
  const raw = heightFn(shape)
  const RINGS = Math.round(40 + 32 * detail)
  const SEGS  = Math.round(120 + 72 * detail)
  const RMAX  = 1.1
  const { fbm } = makeNoise(shape.seed + 101)

  // a slightly irregular coastline
  const wob = (a: number) => 1 + (fbm(Math.cos(a) * 1.8 + 7, Math.sin(a) * 1.8) - 0.5) * 0.3

  // sample heights (centre + rings) and normalise to a 0..1 summit
  const pts: { x: number; z: number; r: number }[] = [{ x: 0, z: 0, r: 0 }]
  for (let i = 1; i <= RINGS; i++) {
    // denser rings toward the coast, where cliffs and beaches live
    const u = i / RINGS
    const r = RMAX * (1 - Math.pow(1 - u, 1.35))
    for (let j = 0; j < SEGS; j++) {
      const a = (j / SEGS) * Math.PI * 2
      const w = r * wob(a)
      pts.push({ x: Math.cos(a) * w, z: Math.sin(a) * w, r })
    }
  }
  const hs = pts.map((p) => raw(p.x, p.z, p.r))
  let maxH = 0
  for (const h of hs) maxH = Math.max(maxH, h)
  const norm = maxH > 0 ? 1 / maxH : 1

  const n = pts.length
  const pos = new Float32Array(n * 3)
  for (let k = 0; k < n; k++) {
    pos[k * 3]     = pts[k].x * shape.stretch
    pos[k * 3 + 1] = hs[k] * norm
    pos[k * 3 + 2] = pts[k].z
  }

  const idx: number[] = []
  const vid = (i: number, j: number) => (i === 0 ? 0 : 1 + (i - 1) * SEGS + (((j % SEGS) + SEGS) % SEGS))
  for (let j = 0; j < SEGS; j++) idx.push(0, vid(1, j + 1), vid(1, j))
  for (let i = 1; i < RINGS; i++) {
    for (let j = 0; j < SEGS; j++) {
      const a = vid(i, j), b = vid(i + 1, j), c = vid(i + 1, j + 1), d = vid(i, j + 1)
      idx.push(a, d, b, d, c, b)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()

  // bake material weights + occlusion
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute
  const mat = new Float32Array(n * 4)
  const ao  = new Float32Array(n)
  const ringOf = (k: number) => (k === 0 ? 0 : 1 + Math.floor((k - 1) / SEGS))
  const segOf  = (k: number) => (k === 0 ? 0 : (k - 1) % SEGS)
  // where faces turn to bare rock: cliffs early, soft terraces almost never
  const steepRock = shape.kind === 'karst' || shape.kind === 'stacks' ? 0.42
    : shape.kind === 'terraces' || shape.kind === 'cove' ? 0.8
    : 0.6
  for (let k = 0; k < n; k++) {
    const h = pos[k * 3 + 1]
    const ny = nrm.getY(k)
    const slope = 1 - Math.max(0, ny)              // 0 flat .. 1 vertical
    const x = pts[k].x, z = pts[k].z
    const v = fbm(x * 5 + 1, z * 5 + 2) - 0.5
    const beach = shape.kind === 'sandbar' ? 0.5 : shape.kind === 'cove' ? 0.12 : 0.06
    let sand = 1 - smooth(beach * 0.6 + v * 0.03, beach + 0.02 + v * 0.04, h)
    sand *= 1 - smooth(0.35, 0.6, slope)
    let rock = smooth(steepRock - 0.12 + v * 0.1, steepRock + 0.1 + v * 0.1, slope)
    if (shape.kind === 'peak') rock = Math.max(rock, smooth(0.78, 0.92, h + v * 0.08))
    if (shape.kind === 'islet') rock = Math.max(rock, smooth(0.3, 0.5, slope) * (1 - smooth(0.3, 0.5, h)))
    rock *= 1 - sand
    const wet = (1 - smooth(0.0, 0.025, h)) * (1 - rock)
    const grass = Math.max(0, 1 - sand - rock)
    mat[k * 4] = sand; mat[k * 4 + 1] = grass; mat[k * 4 + 2] = rock; mat[k * 4 + 3] = wet

    // occlusion: how far the vertex sits below its ring/segment neighbours
    const i = ringOf(k), j = segOf(k)
    let sum = 0, cnt = 0
    if (i > 0) {
      for (const [di, dj] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const ii = i + di
        if (ii < 1 || ii > RINGS) continue
        sum += pos[vid(ii, j + dj) * 3 + 1]; cnt++
      }
    }
    const lap = cnt ? sum / cnt - h : 0
    ao[k] = Math.min(1, Math.max(0.45, 1 - Math.max(0, lap) * 26)) * (0.78 + 0.22 * smooth(0.0, 0.12, h))
  }
  geo.setAttribute('aMat', new THREE.BufferAttribute(mat, 4))
  geo.setAttribute('aAO', new THREE.BufferAttribute(ao, 1))
  geo.computeBoundingSphere()

  let sk = 0
  for (let k = 0; k < n; k++) if (pos[k * 3 + 1] > pos[sk * 3 + 1]) sk = k
  const summit = new THREE.Vector3(pos[sk * 3], pos[sk * 3 + 1], pos[sk * 3 + 2])

  const sample = (x: number, z: number) => {
    const r = Math.hypot(x, z)
    const e = 0.01
    const h0 = raw(x, z, r) * norm
    const hx = raw(x + e, z, Math.hypot(x + e, z)) * norm
    const hz = raw(x, z + e, Math.hypot(x, z + e)) * norm
    // slope against the stretched footprint (x is stretched in world)
    const gx = (hx - h0) / (e * shape.stretch), gz = (hz - h0) / e
    const g = Math.hypot(gx, gz)
    return { h: h0, slope: g / Math.hypot(g, 1) }
  }

  return { geo, summit, sample }
}

export interface PropSpot { x: number; z: number; h: number; s: number; tint: number }

/**
 * Scatter points for props (unit footprint space; x NOT yet stretched).
 * `accept` filters by normalised height and slope.
 */
export function scatter(
  mesh: IslandMesh,
  count: number,
  seed: number,
  accept: (h: number, slope: number, x: number, z: number) => boolean,
): PropSpot[] {
  const r = rng(seed)
  const out: PropSpot[] = []
  for (let tries = 0; out.length < count && tries < count * 60; tries++) {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * 0.95
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    const { h, slope } = mesh.sample(x, z)
    if (!accept(h, slope, x, z)) continue
    // keep a little spacing so canopies cluster but do not stack
    if (out.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 0.0022)) continue
    out.push({ x, z, h, s: 0.75 + r() * 0.5, tint: r() })
  }
  return out
}

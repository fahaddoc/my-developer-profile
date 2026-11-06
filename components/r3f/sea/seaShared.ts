// components/r3f/sea/seaShared.ts — constants, GLSL and layout shared by the
// light-mode sea world (sky, ocean, islands, birds).
//
// In light mode the tunnel flies over a sea instead of through space. The
// camera keeps the same curve, but its look direction is levelled with a
// small fixed pitch, so the horizon stays put at ~35% of the frame while the
// altitude drifts with the curve. Islands are authored in SCREEN terms per
// station (where the waterline and peak should land at rest), then solved
// into world positions for the current viewport, the same way the Skills
// orbit is laid out.

import * as THREE from 'three'

/** World height of the sea surface; the curve's y spans -3..3, so the camera
 *  flies 6–12 units above the water. */
export const SEA_Y = -9

/** Downward pitch of the levelled look direction (tan of the angle). */
export const SEA_PITCH = 0.1

/** Vertical field of view; must match TunnelScene's camera. */
export const SEA_FOV = 38

/** Levelled look direction from `from` toward `to` (the curve point the
 *  camera looks at), written into `out`. */
export function seaLookDir(from: THREE.Vector3, to: THREE.Vector3, out: THREE.Vector3) {
  out.copy(to).sub(from)
  out.y = 0
  if (out.lengthSq() < 1e-8) out.set(0, 0, -1)
  out.normalize()
  out.y = -SEA_PITCH
  return out.normalize()
}

export type IslandId = 'hero' | 'about' | 'skills' | 'projects' | 'opensource' | 'experience' | 'contact'

/** The landform each island is sculpted as (see islandShapes.ts). */
export type IslandKind = 'peak' | 'karst' | 'islet' | 'sandbar' | 'stacks' | 'terraces' | 'cove'

export interface IslandShape {
  kind: IslandKind
  /** screen x of the island centre, fraction of width (at rest at its station) */
  sx: number
  /** screen y of the waterline at its centre, fraction of height */
  wy: number
  /** peak height on screen (px at a 900px-tall viewport) */
  peakPx: number
  /** width on screen (px at a 900px-tall viewport) */
  widthPx: number
  /** x stretch of the footprint (1 = round) */
  stretch: number
  seed: number
  /** circling birds that lift off on hover */
  birds: boolean
  /** set dressing: round trees, palms, a lighthouse on the summit, a rock arch */
  props: { trees: number; palms: number; lighthouse?: boolean; arch?: boolean }
}

// One shot per station, echoing the approved space framing (DESIGN.md §7),
// and one landform each so no two islands read alike: a mountain with a cove
// behind the portrait, karst cliffs cropped bottom right at About, a
// lighthouse islet under the skills orbit, a far sandbar with palms at Work,
// twin sea stacks with an arch at Open source, terraced hills under the
// Experience timeline, and a palm cove ahead at Contact.
export const ISLANDS: Record<IslandId, IslandShape> = {
  hero: {
    kind: 'peak', sx: 0.8, wy: 0.6, peakPx: 400, widthPx: 940, stretch: 1.25,
    seed: 11, birds: true, props: { trees: 46, palms: 3 },
  },
  about: {
    kind: 'karst', sx: 0.96, wy: 0.985, peakPx: 440, widthPx: 1100, stretch: 1.15,
    seed: 23, birds: true, props: { trees: 34, palms: 0 },
  },
  skills: {
    kind: 'islet', sx: 0.7, wy: 0.63, peakPx: 96, widthPx: 300, stretch: 1.15,
    seed: 37, birds: true, props: { trees: 7, palms: 0, lighthouse: true },
  },
  projects: {
    kind: 'sandbar', sx: 0.93, wy: 0.44, peakPx: 26, widthPx: 420, stretch: 2.6,
    seed: 41, birds: false, props: { trees: 0, palms: 6 },
  },
  opensource: {
    kind: 'stacks', sx: 0.8, wy: 0.46, peakPx: 110, widthPx: 300, stretch: 1.2,
    seed: 53, birds: true, props: { trees: 5, palms: 0, arch: true },
  },
  experience: {
    kind: 'terraces', sx: 0.87, wy: 0.87, peakPx: 170, widthPx: 660, stretch: 1.35,
    seed: 67, birds: true, props: { trees: 40, palms: 0 },
  },
  contact: {
    kind: 'cove', sx: 0.8, wy: 0.52, peakPx: 180, widthPx: 1040, stretch: 1.5,
    seed: 79, birds: true, props: { trees: 28, palms: 9 },
  },
}

/** Sailboats: screen-authored like the islands (where the hull sits when its
 *  station is at rest). `px` is the hull length on screen at 900px tall;
 *  `loop` is the loop radius in boat lengths (0 = moored). */
export interface BoatLayout { station: IslandId; sx: number; wy: number; px: number; loop: number; dir: 1 | -1; heading: number }
export const BOATS: BoatLayout[] = [
  { station: 'hero',       sx: 0.58, wy: 0.76, px: 96, loop: 6,  dir: 1,  heading: 2.2 },
  { station: 'about',      sx: 0.66, wy: 0.53, px: 50, loop: 8,  dir: -1, heading: 1.2 },
  { station: 'skills',     sx: 0.88, wy: 0.75, px: 74, loop: 6,  dir: 1,  heading: -2.4 },
  { station: 'opensource', sx: 0.6,  wy: 0.57, px: 58, loop: 7,  dir: -1, heading: 0.6 },
  { station: 'experience', sx: 0.6,  wy: 0.85, px: 86, loop: 6,  dir: 1,  heading: 2.8 },
  { station: 'contact',    sx: 0.92, wy: 0.575, px: 66, loop: 0,  dir: 1,  heading: 1.9 },
]

/** World point on the sea surface that lands at (sx, wy) on screen for a
 *  camera resting at camPos looking along lookDir; also returns world units
 *  per screen px at that distance. */
export function seaPoint(camPos: THREE.Vector3, lookDir: THREE.Vector3, sx: number, wy: number, W: number, H: number) {
  const f      = H / 2 / Math.tan((SEA_FOV * Math.PI) / 360)
  const pitch  = Math.atan(SEA_PITCH)
  const height = Math.max(0.5, camPos.y - SEA_Y)
  const below  = Math.atan((wy * H - H / 2) / f)
  const d      = height / Math.tan(Math.max(0.004, pitch + below))
  const flat  = new THREE.Vector3(lookDir.x, 0, lookDir.z).normalize()
  const right = new THREE.Vector3().crossVectors(flat, new THREE.Vector3(0, 1, 0)).normalize()
  const position = new THREE.Vector3().copy(camPos).addScaledVector(flat, d).addScaledVector(right, ((sx * W - W / 2) * d) / f)
  position.y = SEA_Y
  return { position, pxWorld: d / f }
}

export interface IslandPlacement {
  /** world position of the footprint centre at sea level */
  position: THREE.Vector3
  /** yaw so the island's local +z faces back toward the station camera */
  yaw: number
  /** world radius of the footprint (x before stretch) */
  radius: number
  /** world height of the tallest peak */
  height: number
  /** world units per screen pixel at this island's station distance */
  pxWorld: number
}

/**
 * Solve a screen-authored island into the world for a camera resting at
 * `camPos` and looking along the levelled `lookDir`, for a W x H viewport.
 */
export function placeIsland(
  shape: IslandShape,
  camPos: THREE.Vector3,
  lookDir: THREE.Vector3,
  W: number,
  H: number,
  sxOverride?: number,
): IslandPlacement {
  const f      = H / 2 / Math.tan((SEA_FOV * Math.PI) / 360)
  const k      = H / 900
  const pitch  = Math.atan(SEA_PITCH)
  const height = Math.max(0.5, camPos.y - SEA_Y)
  // A sea-level point at distance d sits atan(h/d) below the horizontal; the
  // camera looks `pitch` down, so on screen it lands f*tan(theta - pitch)
  // below the centre. Invert for d.
  const below  = Math.atan((shape.wy * H - H / 2) / f)
  const d      = height / Math.tan(Math.max(0.004, pitch + below))
  const sx     = sxOverride ?? shape.sx
  const lateral = ((sx * W - W / 2) * d) / f

  const flat  = new THREE.Vector3(lookDir.x, 0, lookDir.z).normalize()
  const right = new THREE.Vector3().crossVectors(flat, new THREE.Vector3(0, 1, 0)).normalize()
  const position = new THREE.Vector3()
    .copy(camPos)
    .addScaledVector(flat, d)
    .addScaledVector(right, lateral)
  position.y = SEA_Y

  return {
    position,
    yaw: Math.atan2(-flat.x, -flat.z),
    radius: ((shape.widthPx * k) / 2 * d) / f / shape.stretch,
    height: (shape.peakPx * k * d) / f,
    pxWorld: d / f,
  }
}

// ─── GLSL ──────────────────────────────────────────────────────────────────
/** Cheap arithmetic hash + value noise + fbm (2D), shared by sky and ocean. */
export const NOISE2_GLSL = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm2(vec2 p, int oct) {
    float s = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      if (i >= oct) break;
      s += a * vnoise(p);
      p = rot * p * 2.03 + 17.1;
      a *= 0.5;
    }
    return s;
  }
`

/** Once the camera has flown past an island's station it fades out over this
 *  window (progress after the station), so islands we are passing over never
 *  sit behind the next station's text. The last island stays. */
export const ISLAND_LEAVE: [number, number] = [0.05, 0.11]

export function islandVisibility(camT: number, stationT: number, last: boolean): number {
  if (last) return 1
  const t = Math.min(1, Math.max(0, (camT - stationT - ISLAND_LEAVE[0]) / (ISLAND_LEAVE[1] - ISLAND_LEAVE[0])))
  return 1 - t * t * (3 - 2 * t)
}

/** Seeded PRNG (mulberry32) for geometry and flock attributes. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

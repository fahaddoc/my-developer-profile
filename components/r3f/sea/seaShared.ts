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

export interface Peak { x: number; z: number; h: number; r: number }

export interface IslandShape {
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
  /** peaks in unit footprint space (x, z in -1..1; h relative; r radius) */
  peaks: Peak[]
  /** surface noise amount (relative to the tallest peak) */
  rugged: number
  /** cliff steepness: 0 = rolling hills, 1 = sheer faces */
  cliff: number
  seed: number
  /** circling birds that lift off on hover */
  birds: boolean
}

// One shot per station, echoing the approved space framing (DESIGN.md §7):
// hero mountain behind the portrait, a cliff island cropped bottom right at
// About, an islet under the skills orbit, a far island at Open source, a low
// island lower right under the Experience timeline, land ahead at Contact.
export const ISLANDS: Record<IslandId, IslandShape> = {
  hero: {
    sx: 0.8, wy: 0.6, peakPx: 380, widthPx: 920, stretch: 1.25,
    peaks: [
      { x: 0.12, z: -0.05, h: 1, r: 0.34 },
      { x: -0.38, z: 0.18, h: 0.5, r: 0.32 },
      { x: 0.5, z: 0.25, h: 0.32, r: 0.26 },
    ],
    rugged: 0.1, cliff: 0.45, seed: 11, birds: true,
  },
  about: {
    sx: 0.97, wy: 0.985, peakPx: 430, widthPx: 1150, stretch: 1.2,
    peaks: [
      { x: -0.18, z: 0.05, h: 1, r: 0.5 },
      { x: 0.32, z: -0.2, h: 0.82, r: 0.46 },
    ],
    rugged: 0.16, cliff: 0.85, seed: 23, birds: true,
  },
  skills: {
    sx: 0.7, wy: 0.63, peakPx: 120, widthPx: 300, stretch: 1.1,
    peaks: [
      { x: 0, z: 0, h: 1, r: 0.3 },
      { x: -0.4, z: 0.3, h: 0.35, r: 0.25 },
    ],
    rugged: 0.12, cliff: 0.7, seed: 37, birds: true,
  },
  projects: {
    sx: 0.93, wy: 0.44, peakPx: 70, widthPx: 380, stretch: 1.6,
    peaks: [{ x: 0.1, z: 0, h: 1, r: 0.45 }, { x: -0.45, z: 0.1, h: 0.6, r: 0.35 }],
    rugged: 0.08, cliff: 0.3, seed: 41, birds: false,
  },
  opensource: {
    sx: 0.8, wy: 0.46, peakPx: 80, widthPx: 300, stretch: 1.3,
    peaks: [{ x: 0, z: 0, h: 1, r: 0.38 }],
    rugged: 0.1, cliff: 0.5, seed: 53, birds: true,
  },
  experience: {
    sx: 0.87, wy: 0.87, peakPx: 170, widthPx: 640, stretch: 1.35,
    peaks: [
      { x: 0.2, z: 0, h: 1, r: 0.4 },
      { x: -0.35, z: 0.15, h: 0.55, r: 0.35 },
    ],
    rugged: 0.1, cliff: 0.4, seed: 67, birds: true,
  },
  contact: {
    sx: 0.8, wy: 0.52, peakPx: 190, widthPx: 1000, stretch: 1.5,
    peaks: [
      { x: 0.25, z: -0.1, h: 1, r: 0.36 },
      { x: -0.3, z: 0.05, h: 0.7, r: 0.4 },
      { x: 0.65, z: 0.2, h: 0.4, r: 0.25 },
    ],
    rugged: 0.1, cliff: 0.5, seed: 79, birds: true,
  },
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

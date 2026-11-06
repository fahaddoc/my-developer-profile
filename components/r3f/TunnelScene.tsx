'use client'

// TunnelScene — the desktop WebGL journey (DESIGN.md section 7).
//
// The camera flies a CatmullRom curve driven by scroll progress through a long
// lens (fov 38: compressed depth, the film look). Every station is one
// art-directed shot rather than a stamped "text left, ball right":
//
//   Intro       a far graphite giant behind the portrait, ember on its lit limb
//   About       a huge body cropped by the right and bottom edges, mostly in
//               shadow with a lit crescent
//   Skills      the tile orbit owns the right half (SkillsOrbit), a small ice
//               planet at its centre
//   Work        a small ringed body top right, clear of the showcase panels
//   Open source a small far moon; the PR card is the dominant object
//   Experience  a smaller ice giant low right; the timeline owns the upper right
//   Contact     Earth rising from the bottom edge as a horizon
//
// Planets come from one restrained family lit by a single warm key light from
// the side (a real terminator, 35-50% of each disc in shadow) with a cold rim
// on the dark limb. An anamorphic correction in the vertex shader keeps every
// off-axis disc round. Colours come from useScenePalette() (lib/palette.ts):
// each theme has its own planet albedos and lighting, and a theme flip writes
// uniforms in place (the Canvas is never keyed on theme). The sky (nebula +
// stars) lives in NebulaBackground.
//
// Performance guards kept on purpose: frameloop="demand" with a RenderDriver
// that renders every frame (capped at 60) only while something moves and
// falls back to 36fps when settled, pauses while the tab is hidden or a drawer
// is open; dpr 1; ProximityGate (with hysteresis) around the drei <Html>
// orbit; context-loss remount; material/geometry disposal; time-based
// animation only; cost scales with the quality preset.

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { type QualityPreset, PRESETS } from '@/lib/quality'
import { type PlanetId, type ScenePalette, useScenePalette } from '@/lib/palette'
import { DRAWER_OPEN_EVENT, DRAWER_CLOSE_EVENT } from '@/components/ui/drawerPrefetch'
import { NebulaBackground } from '@/components/r3f/NebulaBackground'
import { Precompile } from '@/components/r3f/Precompile'
import { SeaWorld } from '@/components/r3f/sea/SeaWorld'
import { seaLookDir } from '@/components/r3f/sea/seaShared'
import { SkillsOrbit, SKILL_TILE } from '@/components/r3f/SkillsOrbit'

// Shared scroll progress — read each frame inside R3F, also subscribed via the
// useScrollProgress hook (lib/tunnel.ts) for HUD/UI updates outside the canvas.
//
// dynamic() imports give chunks their own module copy, so simple imports of
// `scrollRef` across HUD/scene weren't seeing each other. We funnel everything
// through window: __scrollRef is the live ref, and a custom 'tunnel-progress'
// event fires whenever it changes so React components in any bundle re-render.
const TUNNEL_EVENT = 'tunnel-progress'
const scrollRef = { current: 0 }
function publishProgress(p: number) {
  scrollRef.current = p
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TUNNEL_EVENT, { detail: p }))
  }
}
if (typeof window !== 'undefined') {
  (window as unknown as { __scrollRef?: typeof scrollRef }).__scrollRef = scrollRef
}

// Shared state + station data live in lib/tunnel.ts (re-exported here so
// existing imports keep working).
export {
  soundStore,
  useSound,
  hexAlpha,
  STATIONS,
  useScrollProgress,
  nearestStation,
  type StationDef,
} from '@/lib/tunnel'
import { STATIONS, type StationDef } from '@/lib/tunnel'

// ─────────────────────────────────────────────────────────────────────────────
// Lens + camera constants. Planet placement below is authored for these: at a
// station the camera sits exactly on the station's anchor frame, so a planet
// offset IS its camera-space position at rest (x right, y up, -z ahead).
// ─────────────────────────────────────────────────────────────────────────────
const CAMERA_FOV  = 38
const LOOK_AHEAD  = 0.015   // curve progress the camera looks ahead by
const CAM_LAMBDA  = 9       // progress damping; Lenis is the one real smoother
const BANK_GAIN   = 1.5     // roll per unit of tangent change
const BANK_MAX    = 0.08    // rad (DESIGN.md: small roll, <= 0.08)
const BANK_SPEED  = 0.06    // progress/s at which the full bank applies

// ─────────────────────────────────────────────────────────────────────────────
// Render activity, shared between the camera, the planets, the skills orbit
// and the RenderDriver. Module-level so it costs nothing per frame.
// ─────────────────────────────────────────────────────────────────────────────
const sceneState = {
  /** damped camera progress (what is on screen) */
  camT:        0,
  /** camera progress, look direction or roll still converging */
  settling:    true,
  /** performance.now() until which the driver renders at the full rate */
  activeUntil: 0,
  /** a drawer covers the canvas: render nothing */
  drawerOpen:  false,
}
/** Keep the RenderDriver at the full frame rate for `ms` more. */
/** Damped camera progress, for components outside this module. */
function getCamT() { return sceneState.camT }

function kick(ms = 250) {
  if (typeof performance === 'undefined') return
  sceneState.activeUntil = Math.max(sceneState.activeUntil, performance.now() + ms)
}

// ─────────────────────────────────────────────────────────────────────────────
// Curve definition
// ─────────────────────────────────────────────────────────────────────────────
const CURVE_POINTS: [number, number, number][] = [
  [   0,   0,    0 ],
  [   3,   1,  -15 ],
  [  -2,  -2,  -30 ],
  [   4,   3,  -50 ],
  [  -3,   1,  -70 ],
  [   2,  -3,  -90 ],
  [  -4,   2, -110 ],
  [   1,   0, -130 ],
  [   0,   2, -150 ],
  [  -2,  -1, -170 ],
  [   0,   0, -190 ],
]

// ─────────────────────────────────────────────────────────────────────────────
// Reduced motion: ambient motion (planet spin, twinkle, drift, orbit spin)
// stops; scroll-driven camera movement stays because the user drives it.
// ─────────────────────────────────────────────────────────────────────────────
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

// Places a group on the curve at `t` with the camera's resting orientation
// there: +Z points back along the camera's look direction (the curve point
// LOOK_AHEAD further on), so the group's axes are exactly the camera's
// (x right, y up, -z ahead) when the camera rests at `t` with no roll.
function useCurveAnchor(curve: THREE.CatmullRomCurve3, t: number, sea = false) {
  const ref = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!ref.current) return
    const pos   = new THREE.Vector3()
    const ahead = new THREE.Vector3()
    curve.getPointAt(t, pos)
    curve.getPointAt(Math.min(0.9999, t + LOOK_AHEAD), ahead)
    // The sea world levels the camera (fixed horizon), so anchors follow suit.
    const dir = sea ? seaLookDir(pos, ahead, new THREE.Vector3()) : ahead.sub(pos).normalize()
    ref.current.position.copy(pos)
    ref.current.lookAt(pos.clone().sub(dir))
  }, [curve, t, sea])
  return ref
}

// ─────────────────────────────────────────────────────────────────────────────
// Planets. Offsets are camera space at rest; screen positions at 1440x900
// are noted per shot (the HUD places its DOM overlays in the clear space).
// Colours are per theme in lib/palette.ts; this table is shape and light.
// ─────────────────────────────────────────────────────────────────────────────
interface Halo {
  scale:    number             // shell radius multiple
  color:    'accent' | 'rim'
  strength: number
  around:   number             // 0 = lit limb only, 1 = whole limb
}

interface PlanetConfig {
  brightMix:   number              // how far the bright tone takes over
  brightEdge:  [number, number]    // smoothstep window for the bright tone
  midEdge?:    [number, number]    // smoothstep window deep → mid (contrast)
  bands:       number              // 0 = noise only, 1 = latitude bands
  bandFreq:    number
  noiseScale:  number
  polarCap:    number
  cloud:       number
  rimStrength: number              // cold rim on the dark limb
  atmo:        'accent' | 'key' | 'rim'
  atmoStrength: number             // lit-limb atmosphere
  radius:      number
  offset:      [number, number, number]
  tilt:        number              // axial tilt (rad)
  spin:        number              // rad/s
  segments:    [number, number]
  /** view-space key light for this shot (default: palette.keyLight.dir) */
  keyDir?:     [number, number, number]
  /** keep the disc round off-axis (off for the Contact horizon) */
  anamorph?:   boolean
  halo?:       Halo
  ring?:       { inner: number; outer: number; tiltX: number; tiltZ: number; opacity: number }
  /** visibility vs camera progress relative to the station:
      fades in over `approach` (before it), out over `leave` (after it) */
  approach:    [number, number] | null
  leave:       [number, number] | null
}

const APPROACH: [number, number] = [-0.115, -0.05]
const LEAVE:    [number, number] = [0.035, 0.08]

const PLANETS: Record<PlanetId, PlanetConfig> = {
  // Intro: a far graphite giant behind the portrait. Landing frame (t 0):
  // centre ~(1140, 478) r ~290; at t 0.04 ~(1229, 475) r ~339. Ember on the
  // lit (left) limb frames the portrait; the right side falls into shadow.
  hero: {
    brightMix: 0.45, brightEdge: [0.6, 0.92], midEdge: [0.1, 0.9],
    bands: 0.55, bandFreq: 13, noiseScale: 2.2,
    polarCap: 0, cloud: 0,
    rimStrength: 0.4, atmo: 'accent', atmoStrength: 1.05,
    radius: 13.0, offset: [19.03, -0.93, -51.77], tilt: 0.32, spin: 0.01,
    segments: [96, 64],
    keyDir: [-0.85, 0.42, -0.22],
    halo: { scale: 1.06, color: 'accent', strength: 0.55, around: 0 },
    approach: null, leave: LEAVE,
  },
  // About: a huge stone body cropped by the right and bottom edges, mostly in
  // shadow with a lit crescent on its upper-left limb. Centre ~(1480, 1130),
  // r ~760: the limb runs from (756, 900) to (1440, 371).
  about: {
    brightMix: 0.5, brightEdge: [0.6, 0.88],
    bands: 0, bandFreq: 0, noiseScale: 5.0,
    polarCap: 0, cloud: 0,
    rimStrength: 0.35, atmo: 'key', atmoStrength: 0.3,
    radius: 15.215, offset: [14.21, -12.71, -30], tilt: 0.2, spin: 0.012,
    segments: [96, 64],
    // From behind and above-left: only the upper-left limb catches light.
    keyDir: [-0.3, 0.3, -0.9],
    approach: APPROACH, leave: LEAVE,
  },
  // Skills: a small ice planet at the centre of the tile orbit. Offset and
  // radius are replaced at runtime by useSkillsLayout (viewport-aware).
  skills: {
    brightMix: 0.55, brightEdge: [0.58, 0.88],
    bands: 0.25, bandFreq: 7, noiseScale: 3.4,
    polarCap: 0.7, cloud: 0,
    rimStrength: 0.6, atmo: 'rim', atmoStrength: 0.22,
    radius: 1.19, offset: [4.75, 0.37, -20.5], tilt: 0.28, spin: 0.06,
    segments: [48, 32],
    approach: APPROACH, leave: LEAVE,
  },
  // Work: a small dust giant with a thin ring, top right above the project
  // library and fully visible. Centre ~(1250, 128), r ~46; ring ~x 1155-1345.
  projects: {
    brightMix: 0.45, brightEdge: [0.62, 0.92], midEdge: [0.12, 0.88],
    bands: 0.8, bandFreq: 11, noiseScale: 2.6,
    polarCap: 0, cloud: 0,
    rimStrength: 0.45, atmo: 'key', atmoStrength: 0.16,
    radius: 0.915, offset: [10.53, 6.4, -26], tilt: 0.38, spin: 0.05,
    segments: [48, 32],
    ring: { inner: 1.5, outer: 2.05, tiltX: 1.18, tiltZ: 0.3, opacity: 0.55 },
    approach: APPROACH, leave: LEAVE,
  },
  // Open source: a small far moon, upper right; the PR card dominates.
  // Centre ~(1160, 236), r ~44.
  opensource: {
    brightMix: 0.55, brightEdge: [0.6, 0.86],
    bands: 0, bandFreq: 0, noiseScale: 5.5,
    polarCap: 0, cloud: 0,
    rimStrength: 0.55, atmo: 'key', atmoStrength: 0.12,
    radius: 1.01, offset: [10.09, 4.91, -30], tilt: 0.1, spin: 0.04,
    segments: [48, 32],
    approach: APPROACH, leave: LEAVE,
  },
  // Experience: a smaller ice giant low right, leaving the upper right clear
  // for the DOM timeline. Centre ~(1185, 700), r ~125.
  experience: {
    brightMix: 0.35, brightEdge: [0.6, 0.92], midEdge: [0.15, 0.85],
    bands: 0.6, bandFreq: 8, noiseScale: 3.0,
    polarCap: 0.25, cloud: 0,
    rimStrength: 0.6, atmo: 'rim', atmoStrength: 0.25,
    radius: 2.286, offset: [8.47, -4.55, -24], tilt: 0.24, spin: 0.04,
    segments: [64, 48],
    approach: APPROACH, leave: LEAVE,
  },
  // Contact: Earth rising from the bottom edge as a horizon (the mobile arc,
  // at desktop scale). Limb top ~(960, 680), meets the bottom edge near
  // x 430 and the right edge at y ~823. It stays on through the finale.
  contact: {
    brightMix: 0.85, brightEdge: [0.555, 0.615],
    bands: 0, bandFreq: 0, noiseScale: 3.2,
    polarCap: 0.85, cloud: 0.5,
    rimStrength: 0.7, atmo: 'rim', atmoStrength: 0.55,
    // Axis tipped toward the viewer's right so the visible cap is temperate
    // latitudes (ocean, land, cloud), not the polar ice.
    radius: 58, offset: [17, -74, -86], tilt: 1.25, spin: 0.005,
    segments: [160, 96],
    keyDir: [-0.8, 0.5, -0.3],
    anamorph: false,
    halo: { scale: 1.022, color: 'rim', strength: 0.55, around: 0.45 },
    approach: APPROACH, leave: null,
  },
}

const smooth01 = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function visibilityAt(cfg: PlanetConfig, d: number): number {
  const a = cfg.approach ? smooth01(cfg.approach[0], cfg.approach[1], d) : 1
  const l = cfg.leave ? 1 - smooth01(cfg.leave[0], cfg.leave[1], d) : 1
  return a * l
}

// Off-axis spheres under a rectilinear lens project as ellipses stretched
// toward the frame edge (about 1/cos of the off-axis angle: the "egg"). This
// squashes the body about its own centre along the in-plane radial direction
// so the disc is round wherever it sits in frame. The factor is the geometric
// mean of the small-body (cos theta) and silhouette-cone solutions, measured
// within 0.6% for bodies up to ~30 degrees across. Faded out far off-axis
// (bodies passing the camera). Lighting still uses the true sphere normals.
const ANAMORPH_GLSL = /* glsl */ `
  uniform float uAnamorph;
  uniform float uRadius;
  vec3 anamorph(vec3 p) {
    if (uAnamorph < 0.5) return p;
    vec3 c = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float dist = length(c);
    if (dist < 1e-4) return p;
    vec3 u = c / dist;
    float cosT = max(-u.z, 0.2);
    float sinA = min(uRadius / dist, 0.99);
    float cosA = sqrt(1.0 - sinA * sinA);
    float se = sqrt(max(cosT * cosT - sinA * sinA, 0.0025)) / cosA;
    float s = clamp(sqrt(se * cosT), 0.2, 1.0);
    s = mix(1.0, s, smoothstep(0.35, 0.6, cosT));
    vec3 a = vec3(-u.z * u.x, -u.z * u.y, 1.0 - u.z * u.z);
    float aa = max(dot(a, a), 1e-6);
    return p - (1.0 - s) * dot(a, p - c) / aa * a;
  }
`

const NOISE3_GLSL = /* glsl */ `
  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i),                    hash13(i + vec3(1.0, 0.0, 0.0)), u.x),
          mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
      mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), u.x),
          mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), u.x), u.y),
      u.z
    );
  }
  float fbm4(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p = p * 2.07 + vec3(3.1, 1.7, 5.3);
      a *= 0.5;
    }
    return v / 0.9375;
  }
`

const PLANET_VERT = /* glsl */ `
  varying vec3 vObjNormal;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  ${ANAMORPH_GLSL}
  void main() {
    vObjNormal  = normalize(normal);
    vViewNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * vec4(anamorph(mv.xyz), 1.0);
  }
`

const PLANET_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3  uDeep;
  uniform vec3  uMid;
  uniform vec3  uBright;
  uniform float uBrightMix;
  uniform vec2  uBrightEdge;
  uniform float uBands;
  uniform float uBandFreq;
  uniform float uNoiseScale;
  uniform float uPolarCap;
  uniform float uCloud;
  uniform vec2  uMidEdge;
  uniform vec3  uCapColor;
  uniform vec3  uCloudColor;
  uniform vec3  uLightDir;
  uniform vec3  uLightColor;
  uniform float uKeyIntensity;
  uniform vec3  uShadow;
  uniform vec3  uRim;
  uniform float uRimStrength;
  uniform vec3  uAtmo;
  uniform float uAtmoStrength;
  uniform float uAtmoPow;
  uniform vec3  uBg;
  uniform float uVis;        // 0..1 presence (approach / leave windows)
  uniform float uSink;       // how far a fading body sinks toward the sky
  varying vec3 vObjNormal;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  ${NOISE3_GLSL}

  void main() {
    vec3 n = normalize(vObjNormal);

    // Surface: 3D fbm on the unit sphere (no seams), optional latitude bands.
    float s = fbm4(n * uNoiseScale + vec3(uTime * 0.004, 0.0, uTime * 0.003));
    float band = 0.5 + 0.5 * sin(n.y * uBandFreq + s * 3.2);
    float pat = mix(s, band * 0.8 + s * 0.2, uBands);

    vec3 albedo = mix(uDeep, uMid, smoothstep(uMidEdge.x, uMidEdge.y, pat));
    albedo = mix(albedo, uBright, smoothstep(uBrightEdge.x, uBrightEdge.y, pat) * uBrightMix);

    // Polar caps, broken up by the surface noise.
    float cap = smoothstep(0.80, 0.93, abs(n.y) + (s - 0.5) * 0.18);
    albedo = mix(albedo, uCapColor, cap * uPolarCap);

    // Clouds (Earth only): a second, slower field.
    if (uCloud > 0.0) {
      float c = fbm4(n * uNoiseScale * 1.35 + vec3(uTime * 0.012, 0.0, uTime * 0.008) + 11.0);
      albedo = mix(albedo, uCloudColor, smoothstep(0.52, 0.78, c) * uCloud);
    }

    // One key light from the side: a crisp terminator (smoothstep -0.05..0.3)
    // with a Lambert falloff on the lit side for volume. The shadow side gets
    // the theme's fill: near black at night, a soft cool tint in daylight.
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(-vViewPos);
    vec3 L = normalize(uLightDir);
    float ndl  = dot(N, L);
    float term = smoothstep(-0.05, 0.3, ndl);
    float diff = term * (0.45 + 0.55 * clamp(ndl, 0.0, 1.0));
    vec3 col = albedo * mix(uShadow, uLightColor * uKeyIntensity, diff);

    float fres = 1.0 - clamp(dot(N, V), 0.0, 1.0);
    // Cold rim on the dark limb.
    col += uRim * pow(fres, 3.0) * smoothstep(0.2, -0.5, ndl) * uRimStrength;
    // Lit-limb atmosphere (ember on the hero, neutral or cold elsewhere).
    // Tight exponent: it stays a thin crescent on the lit limb.
    col += uAtmo * pow(fres, uAtmoPow) * smoothstep(-0.02, 0.5, ndl) * uAtmoStrength;

    // Presence: a fading body sinks toward the sky colour and dissolves.
    float k = (1.0 - uVis) * uSink;
    col = pow(mix(sqrt(max(col, 0.0)), sqrt(uBg), k), vec3(2.0));

    gl_FragColor = vec4(col, uVis);
    #include <colorspace_fragment>
  }
`

// Thin shell around a body: brightest at the silhouette, on the lit limb
// (and, with uAround > 0, faintly all the way round, for Earth's atmosphere).
const HALO_FRAG = /* glsl */ `
  uniform vec3  uColor;
  uniform vec3  uLightDir;
  uniform float uStrength;
  uniform float uInner;      // -dot(N,V) at the planet silhouette
  uniform float uAround;
  uniform float uVis;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(-vViewPos);
    float k = clamp(-dot(N, V) / uInner, 0.0, 1.0);
    float glow = k * k * k;
    vec2 side = normalize(N.xy + 1e-4);
    float lit = smoothstep(-0.15, 0.85, dot(side, normalize(uLightDir.xy + 1e-4)));
    lit = mix(lit, 1.0, uAround);
    gl_FragColor = vec4(uColor, glow * lit * uStrength * uVis);
    #include <colorspace_fragment>
  }
`

const RING_VERT = /* glsl */ `
  varying vec2 vLocal;
  ${ANAMORPH_GLSL}
  void main() {
    vLocal = position.xy;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * vec4(anamorph(mv.xyz), 1.0);
  }
`

// A thin solid band: soft, derivative-aware edges and a gentle density
// falloff, no fine banding (fine bands aliased into moire on a small ring).
const RING_FRAG = /* glsl */ `
  uniform vec3  uColor;
  uniform float uOpacity;
  uniform float uInner;
  uniform float uOuter;
  uniform vec3  uLight;
  uniform vec3  uBg;
  uniform float uVis;
  uniform float uSink;
  varying vec2 vLocal;
  void main() {
    float r = length(vLocal);
    float t = (r - uInner) / (uOuter - uInner);
    float w = fwidth(t) * 1.5 + 0.02;
    float band = smoothstep(0.0, w, t) * (1.0 - smoothstep(1.0 - w, 1.0, t));
    float dens = mix(1.0, 0.55, smoothstep(0.0, 1.0, t));
    vec3 col = uColor * uLight;
    float k = (1.0 - uVis) * uSink;
    col = pow(mix(sqrt(max(col, 0.0)), sqrt(uBg), k), vec3(2.0));
    gl_FragColor = vec4(col, band * dens * uOpacity * uVis);
    #include <colorspace_fragment>
  }
`

function Planet({ id, cfg, palette, motion, stationT, offset, radius }: {
  id:       PlanetId
  cfg:      PlanetConfig
  palette:  ScenePalette
  motion:   number
  stationT: number
  offset:   [number, number, number]
  radius:   number
}) {
  const spinRef = useRef<THREE.Mesh>(null)
  const rootRef = useRef<THREE.Group>(null)
  const anam    = cfg.anamorph === false ? 0 : 1

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:         { value: 0 },
      uDeep:         { value: new THREE.Color() },
      uMid:          { value: new THREE.Color() },
      uBright:       { value: new THREE.Color() },
      uBrightMix:    { value: cfg.brightMix },
      uBrightEdge:   { value: new THREE.Vector2(...cfg.brightEdge) },
      uBands:        { value: cfg.bands },
      uBandFreq:     { value: cfg.bandFreq },
      uNoiseScale:   { value: cfg.noiseScale },
      uPolarCap:     { value: cfg.polarCap },
      uCloud:        { value: cfg.cloud },
      uMidEdge:      { value: new THREE.Vector2(...(cfg.midEdge ?? [0.28, 0.72])) },
      uCapColor:     { value: new THREE.Color('#c9d0d6') },
      uCloudColor:   { value: new THREE.Color('#dfe3e7') },
      uLightDir:     { value: new THREE.Vector3() },
      uLightColor:   { value: new THREE.Color() },
      uKeyIntensity: { value: 1 },
      uShadow:       { value: new THREE.Color() },
      uRim:          { value: new THREE.Color() },
      uRimStrength:  { value: cfg.rimStrength },
      uAtmo:         { value: new THREE.Color() },
      uAtmoStrength: { value: cfg.atmoStrength },
      uAtmoPow:      { value: cfg.atmo === 'accent' ? 6.0 : 4.0 },
      uBg:           { value: new THREE.Color() },
      uVis:          { value: 1 },
      uSink:         { value: 0.45 },
      uAnamorph:     { value: anam },
      uRadius:       { value: 1 },
    },
    vertexShader:   PLANET_VERT,
    fragmentShader: PLANET_FRAG,
    // Transparent only for the presence dissolve; it still writes depth, and
    // renderOrder keeps each planet ahead of its own ring and halo.
    transparent: true,
    depthWrite:  true,
    toneMapped:  false,
  }), [cfg, anam])
  useEffect(() => () => mat.dispose(), [mat])

  const haloMat = useMemo(() => {
    if (!cfg.halo) return null
    // -dot(N,V) on the shell's back face where it meets the planet silhouette
    const inner = Math.sqrt(1 - 1 / (cfg.halo.scale * cfg.halo.scale))
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor:    { value: new THREE.Color() },
        uLightDir: { value: new THREE.Vector3() },
        uStrength: { value: 1 },
        uInner:    { value: inner },
        uAround:   { value: cfg.halo.around },
        uVis:      { value: 1 },
        uAnamorph: { value: anam },
        uRadius:   { value: 1 },
      },
      vertexShader:   PLANET_VERT,
      fragmentShader: HALO_FRAG,
      side:        THREE.BackSide,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      toneMapped:  false,
    })
  }, [cfg, anam])
  useEffect(() => () => { haloMat?.dispose() }, [haloMat])

  const ringMat = useMemo(() => {
    if (!cfg.ring) return null
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor:    { value: new THREE.Color() },
        uOpacity:  { value: cfg.ring.opacity },
        uInner:    { value: cfg.ring.inner },
        uOuter:    { value: cfg.ring.outer },
        uLight:    { value: new THREE.Color() },
        uBg:       { value: new THREE.Color() },
        uVis:      { value: 1 },
        uSink:     { value: 0.45 },
        uAnamorph: { value: anam },
        uRadius:   { value: 1 },
      },
      vertexShader:   RING_VERT,
      fragmentShader: RING_FRAG,
      side:        THREE.DoubleSide,
      transparent: true,
      depthWrite:  false,
      toneMapped:  false,
    })
  }, [cfg, anam])
  useEffect(() => () => { ringMat?.dispose() }, [ringMat])

  // World radius drives the anamorphic factor (all three draws share it).
  useEffect(() => {
    mat.uniforms.uRadius.value = radius
    if (haloMat) haloMat.uniforms.uRadius.value = radius
    if (ringMat) ringMat.uniforms.uRadius.value = radius
  }, [radius, mat, haloMat, ringMat])

  // Theme: write palette + lighting into the existing uniforms.
  useEffect(() => {
    const pl   = palette.planetLight
    const alb  = palette.planets[id]
    const [lx, ly, lz] = cfg.keyDir ?? palette.keyLight.dir
    const u = mat.uniforms
    ;(u.uDeep.value as THREE.Color).set(alb.deep)
    ;(u.uMid.value as THREE.Color).set(alb.mid)
    ;(u.uBright.value as THREE.Color).set(alb.bright)
    if (alb.cap)   (u.uCapColor.value as THREE.Color).set(alb.cap)
    if (alb.cloud) (u.uCloudColor.value as THREE.Color).set(alb.cloud)
    ;(u.uLightDir.value as THREE.Vector3).set(lx, ly, lz).normalize()
    ;(u.uLightColor.value as THREE.Color).set(palette.keyLight.color)
    u.uKeyIntensity.value = pl.keyIntensity
    ;(u.uShadow.value as THREE.Color).setRGB(pl.shadow[0], pl.shadow[1], pl.shadow[2])
    ;(u.uRim.value as THREE.Color).set(palette.keyLight.rim)
    u.uRimStrength.value = cfg.rimStrength * pl.rimScale
    const atmo = cfg.atmo === 'accent' ? palette.accent : cfg.atmo === 'rim' ? palette.keyLight.rim : palette.keyLight.color
    ;(u.uAtmo.value as THREE.Color).set(atmo)
    u.uAtmoStrength.value = cfg.atmoStrength * pl.atmoScale
    ;(u.uBg.value as THREE.Color).set(palette.bg)
    u.uSink.value = pl.sink

    if (haloMat && cfg.halo) {
      const h = haloMat.uniforms
      ;(h.uColor.value as THREE.Color).set(cfg.halo.color === 'accent' ? palette.accent : palette.keyLight.rim)
      ;(h.uLightDir.value as THREE.Vector3).set(lx, ly, lz).normalize()
      h.uStrength.value = cfg.halo.strength * pl.haloScale
      haloMat.blending = palette.mode === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending
    }
    if (ringMat) {
      const r = ringMat.uniforms
      ;(r.uColor.value as THREE.Color).set(alb.ring ?? alb.mid)
      // Ring lighting: mostly key, a little shadow fill (it is lit edge-on).
      const key = new THREE.Color(palette.keyLight.color).multiplyScalar(pl.keyIntensity)
      ;(r.uLight.value as THREE.Color).setRGB(
        pl.shadow[0] * 0.3 + key.r * 0.7,
        pl.shadow[1] * 0.3 + key.g * 0.7,
        pl.shadow[2] * 0.3 + key.b * 0.7,
      )
      ;(r.uBg.value as THREE.Color).set(palette.bg)
      r.uSink.value = pl.sink
    }
  }, [palette, id, mat, haloMat, ringMat, cfg])

  // Intro video audio level (window.__sfIntroLevel, 0..1) warms the hero limb.
  const baseAtmo = useRef(cfg.atmoStrength)
  const baseHalo = useRef(cfg.halo?.strength ?? 0)
  useEffect(() => {
    baseAtmo.current = mat.uniforms.uAtmoStrength.value
    if (haloMat) baseHalo.current = haloMat.uniforms.uStrength.value
  }, [palette, mat, haloMat])
  const introRef = useRef(0)

  const lastVis = useRef(-1)
  useFrame((_, delta) => {
    if (id === 'hero') {
      const lvl = (window as unknown as { __sfIntroLevel?: number }).__sfIntroLevel ?? 0
      introRef.current += (lvl - introRef.current) * 0.25
      mat.uniforms.uAtmoStrength.value = baseAtmo.current * (1 + introRef.current * 1.4)
      if (haloMat) haloMat.uniforms.uStrength.value = baseHalo.current * (1 + introRef.current * 1.6)
    }
    const root = rootRef.current
    const vis  = visibilityAt(cfg, sceneState.camT - stationT)
    if (Math.abs(vis - lastVis.current) > 1e-4) {
      lastVis.current = vis
      mat.uniforms.uVis.value = vis
      if (haloMat) haloMat.uniforms.uVis.value = vis
      if (ringMat) ringMat.uniforms.uVis.value = vis
    }
    const visible = vis > 0.002
    if (root && root.visible !== visible) root.visible = visible
    if (!visible) return
    const dt = Math.min(delta, 0.25) * motion
    mat.uniforms.uTime.value += dt
    if (spinRef.current) spinRef.current.rotation.y += dt * cfg.spin
  })

  return (
    <group ref={rootRef} position={offset}>
      <group scale={radius}>
        <group rotation={[0, 0, cfg.tilt]}>
          <mesh ref={spinRef} material={mat} renderOrder={1}>
            <sphereGeometry args={[1, cfg.segments[0], cfg.segments[1]]} />
          </mesh>
          {cfg.ring && ringMat && (
            <mesh rotation={[cfg.ring.tiltX, 0, cfg.ring.tiltZ]} material={ringMat} renderOrder={2}>
              <ringGeometry args={[cfg.ring.inner, cfg.ring.outer, 128, 1]} />
            </mesh>
          )}
        </group>
        {haloMat && cfg.halo && (
          <mesh material={haloMat} renderOrder={3}>
            <sphereGeometry args={[cfg.halo.scale, cfg.segments[0], cfg.segments[1]]} />
          </mesh>
        )}
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skills layout — the orbit owns the right half at any desktop size. Tiles are
// DOM at a fixed CSS size (labels must stay >= 13px), so the ring is sized in
// screen pixels: clear of the HUD copy on the left, inside the right edge,
// and tilted just enough that neighbouring tiles never overlap at any
// rotation (the back half projects ~0.78x the front half).
// ─────────────────────────────────────────────────────────────────────────────
interface SkillsLayout {
  offset:       [number, number, number]
  orbitRadius:  number
  planetRadius: number
  tilt:         [number, number, number]
}

const SKILLS_DEPTH = 20.5

function computeSkillsLayout(W: number, H: number): SkillsLayout {
  const f     = H / 2 / Math.tan((CAMERA_FOV * Math.PI) / 360)
  const front = SKILL_TILE.maxScale
  const left  = Math.min(640, W * 0.5)            // HUD title/lead end ~560-660px
  const right = W - 40
  const semi  = THREE.MathUtils.clamp((right - left) / 2 - (SKILL_TILE.width * front) / 2, 200, H * 0.36)
  const cx    = Math.min((left + right) / 2, right - semi - (SKILL_TILE.width * front) / 2)
  const cy    = H * 0.48
  const orbitRadius = (semi * SKILLS_DEPTH) / f
  const offset: [number, number, number] = [
    ((cx - W / 2) * SKILLS_DEPTH) / f,
    ((H / 2 - cy) * SKILLS_DEPTH) / f,
    -SKILLS_DEPTH,
  ]
  // Elevation of the line of sight over the ring plane so adjacent tiles
  // clear each other: where they just fail horizontally they must clear
  // vertically.
  const A     = 0.765 * semi * 0.78
  const wq    = Math.min(0.95, (SKILL_TILE.width * front) / A)
  const need  = (SKILL_TILE.height * front) / (A * Math.sqrt(1 - wq * wq))
  const elev  = Math.asin(THREE.MathUtils.clamp(need, 0.45, 0.86))
  // Ring normal after rotating about X by a is (0, cos a, sin a); solve
  // |dz| sin a - dy cos a = sin(elev) for the view direction d to the centre.
  const len = Math.hypot(offset[0], offset[1], offset[2])
  const dy  = offset[1] / len
  const dz  = Math.abs(offset[2] / len)
  const amp = Math.hypot(dy, dz)
  const tiltX = Math.asin(Math.min(1, Math.sin(elev) / amp)) + Math.atan2(dy, dz)
  return {
    offset,
    orbitRadius,
    planetRadius: (1.05 * orbitRadius) / 4.5,
    tilt: [tiltX, 0, -0.05],
  }
}

/** Screen x (fraction of width) of the skills orbit centre. */
function skillsScreenX(W: number, H: number): number {
  const l = computeSkillsLayout(W, H)
  const f = H / 2 / Math.tan((CAMERA_FOV * Math.PI) / 360)
  return (W / 2 + (l.offset[0] * f) / SKILLS_DEPTH) / W
}

function useSkillsLayout(): SkillsLayout {
  const width  = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  return useMemo(() => computeSkillsLayout(Math.max(1, width), Math.max(1, height)), [width, height])
}

function Station({ curve, station, palette, motion }: {
  curve:   THREE.CatmullRomCurve3
  station: StationDef
  palette: ScenePalette
  motion:  number
}) {
  const ref    = useCurveAnchor(curve, station.t)
  const id     = (station.id in PLANETS ? station.id : 'hero') as PlanetId
  const cfg    = PLANETS[id]
  const skills = useSkillsLayout()
  const offset = id === 'skills' ? skills.offset : cfg.offset
  const radius = id === 'skills' ? skills.planetRadius : cfg.radius
  return (
    <group ref={ref}>
      <Planet id={id} cfg={cfg} palette={palette} motion={motion} stationT={station.t} offset={offset} radius={radius} />
    </group>
  )
}

// SkillsAnchor — places the orbit exactly where the skills planet sits.
function SkillsAnchor({ curve, stationT, motion, sea }: {
  curve:    THREE.CatmullRomCurve3
  stationT: number
  motion:   number
  sea:      boolean
}) {
  const ref    = useCurveAnchor(curve, stationT, sea)
  const layout = useSkillsLayout()
  return (
    <group ref={ref}>
      <group position={layout.offset}>
        <SkillsOrbit
          stationT={stationT}
          motion={motion}
          radius={layout.orbitRadius}
          tilt={layout.tilt}
          onActive={kick}
        />
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CameraRig: a dolly, not a rollercoaster. Frame-rate independent damping on
// progress (lambda 9: Lenis already smooths the wheel, this only removes
// steps), a damped look direction slightly ahead on the curve, and a small
// bank into turns that only applies while moving, so every station frame
// rests level and exactly on its authored composition.
// ─────────────────────────────────────────────────────────────────────────────
function CameraRig({ curve, sea }: { curve: THREE.CatmullRomCurve3; sea: boolean }) {
  const pos      = useMemo(() => new THREE.Vector3(), [])
  const ahead    = useMemo(() => new THREE.Vector3(), [])
  const wantDir  = useMemo(() => new THREE.Vector3(), [])
  const lookDir  = useMemo(() => new THREE.Vector3(), [])
  const look     = useMemo(() => new THREE.Vector3(), [])
  const tanNow   = useMemo(() => new THREE.Vector3(), [])
  const tanAhead = useMemo(() => new THREE.Vector3(), [])
  const up       = useMemo(() => new THREE.Vector3(), [])
  const rollQuat = useMemo(() => new THREE.Quaternion(), [])
  const tRef     = useRef(0)
  const rollRef  = useRef(0)
  const speedRef = useRef(0)
  const primed   = useRef(false)

  useFrame(({ camera }, delta) => {
    // No clamp: exponential damping is stable for any step, and after a
    // paused tab a long step should simply land on the target.
    const dt     = Number.isFinite(delta) && delta > 0 ? delta : 0
    const target = THREE.MathUtils.clamp(scrollRef.current, 0, 0.999)
    const prevT  = tRef.current

    // Snap on big jumps (the bottom-of-page loop back to the start) instead
    // of rewinding through the whole tunnel.
    if (!primed.current || Math.abs(target - tRef.current) > 0.5) {
      tRef.current = target
    } else {
      tRef.current = THREE.MathUtils.damp(tRef.current, target, CAM_LAMBDA, dt)
      if (Math.abs(target - tRef.current) < 2e-5) tRef.current = target
    }
    const t = THREE.MathUtils.clamp(tRef.current, 0, 0.999)
    const jumped = !primed.current || Math.abs(t - prevT) > 0.5
    const v = jumped || dt === 0 ? 0 : Math.abs(t - prevT) / dt
    speedRef.current = THREE.MathUtils.damp(speedRef.current, v, 6, dt)

    curve.getPointAt(t, pos)
    curve.getPointAt(Math.min(0.9999, t + LOOK_AHEAD), ahead)
    if (sea) seaLookDir(pos, ahead, wantDir)
    else wantDir.copy(ahead).sub(pos).normalize()
    if (!primed.current || jumped) lookDir.copy(wantDir)
    else lookDir.lerp(wantDir, 1 - Math.exp(-6 * dt)).normalize()

    curve.getTangentAt(t, tanNow)
    curve.getTangentAt(Math.min(0.999, t + 0.02), tanAhead)
    const bank       = THREE.MathUtils.clamp(speedRef.current / BANK_SPEED, 0, 1)
    const bankMax    = sea ? BANK_MAX * 0.4 : BANK_MAX   // a level horizon should stay nearly level
    const targetRoll = THREE.MathUtils.clamp((tanAhead.x - tanNow.x) * BANK_GAIN, -bankMax, bankMax) * bank
    rollRef.current = primed.current && !jumped
      ? THREE.MathUtils.damp(rollRef.current, targetRoll, 3, dt)
      : targetRoll
    if (Math.abs(rollRef.current) < 1e-5 && Math.abs(targetRoll) < 1e-5) rollRef.current = 0
    primed.current = true

    up.set(0, 1, 0).applyQuaternion(rollQuat.setFromAxisAngle(lookDir, rollRef.current))
    look.copy(pos).add(lookDir)
    camera.up.copy(up)
    camera.position.copy(pos)
    camera.lookAt(look)

    sceneState.camT = t
    sceneState.settling =
      Math.abs(target - t) > 1e-4 ||
      Math.abs(rollRef.current) > 2e-4 ||
      1 - lookDir.dot(wantDir) > 1e-7
  })

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// ProximityGate — only mounts its children when scroll progress is within
// `threshold` of `stationT`, and only unmounts them past threshold +
// `hysteresis`, so a nudge at a boundary never churns heavy nodes (drei <Html>
// creates a React root per instance).
// ─────────────────────────────────────────────────────────────────────────────
function ProximityGate({
  stationT, threshold = 0.18, hysteresis = 0.04, children,
}: {
  stationT:    number
  threshold?:  number
  hysteresis?: number
  children:    React.ReactNode
}) {
  const [near, setNear] = useState(false)
  const nearRef = useRef(false)
  useFrame(() => {
    const d    = Math.abs(scrollRef.current - stationT)
    const next = nearRef.current ? d < threshold + hysteresis : d < threshold
    if (next !== nearRef.current) {
      nearRef.current = next
      setNear(next)
    }
  })
  return near ? <>{children}</> : null
}

// ─────────────────────────────────────────────────────────────────────────────
// RenderDriver — with the Canvas in frameloop="demand", this is the ONLY thing
// that pumps frames. While anything moves (scroll ahead of the camera, Lenis
// scrolling, the camera's look or roll settling, an orbit tween, a theme
// flip) it renders every animation frame, capped at 60. Once settled it falls
// back to 36fps for the ambient motion (spin, twinkle, drift). It renders
// nothing while the tab is hidden or a drawer covers the canvas. All scene
// animation is time-based, so the rate never changes speeds.
// ─────────────────────────────────────────────────────────────────────────────
function RenderDriver({ idleFps = 36, activeFps = 60 }: { idleFps?: number; activeFps?: number }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let raf  = 0
    let last = -Infinity
    const onOpen  = () => { sceneState.drawerOpen = true }
    const onClose = () => { sceneState.drawerOpen = false; kick(300); invalidate() }
    window.addEventListener(DRAWER_OPEN_EVENT, onOpen)
    window.addEventListener(DRAWER_CLOSE_EVENT, onClose)

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden || sceneState.drawerOpen) return
      const lenis  = (window as unknown as { __lenis?: { isScrolling?: unknown } }).__lenis
      const target = Math.min(0.999, Math.max(0, scrollRef.current))
      const moving =
        Math.abs(target - sceneState.camT) > 1e-4 ||
        sceneState.settling ||
        Boolean(lenis?.isScrolling) ||
        now < sceneState.activeUntil
      const minDelta = 1000 / (moving ? activeFps : idleFps)
      const elapsed  = now - last
      // 1.5ms tolerance absorbs vsync jitter (a 60Hz frame can land at 16.5ms).
      if (elapsed < minDelta - 1.5) return
      // Carry the remainder so the cap holds on average instead of rounding
      // down to every Nth vsync; restart the phase after a gap.
      last = elapsed >= minDelta && elapsed < 2 * minDelta ? now - (elapsed % minDelta) : now
      invalidate()
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener(DRAWER_OPEN_EVENT, onOpen)
      window.removeEventListener(DRAWER_CLOSE_EVENT, onClose)
    }
  }, [invalidate, idleFps, activeFps])
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component — Canvas + scroll wiring + sky + stations
// ─────────────────────────────────────────────────────────────────────────────
export function TunnelScene({ preset = PRESETS.high }: { preset?: QualityPreset } = {}) {
  // Remount the Canvas (fresh WebGL context) when the GPU drops the context.
  // We cap retries so a hard GPU failure doesn't loop forever.
  const [canvasKey, setCanvasKey] = useState(0)
  const retriesRef = useRef(0)

  // Theme-aware scene colours. Flips in place; never part of the Canvas key.
  const palette = useScenePalette()
  const motion  = useReducedMotion() ? 0 : 1

  // A theme flip rewrites uniforms: render it at the full rate.
  useEffect(() => { kick(400) }, [palette])

  const curve = useMemo(() => new THREE.CatmullRomCurve3(
    CURVE_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'catmullrom',
    0.5,
  ), [])

  const skillsT = STATIONS.find((s) => s.id === 'skills')?.t ?? 0.35
  // Light mode is a different world: a sea with islands instead of space.
  const sea = palette.mode === 'light' && !!palette.sea
  const skyColor = sea ? palette.sea!.skyHorizon : palette.bg

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const st = ScrollTrigger.create({
      trigger: document.body,
      start:   'top top',
      end:     'bottom bottom',
      scrub:   0,
      onUpdate: (self) => {
        publishProgress(self.progress)
      },
    })

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max > 0) publishProgress(window.scrollY / max)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // Also subscribe directly to Lenis so programmatic scrolls
    // (lenis.scrollTo with immediate:true) update progress immediately even
    // when the native 'scroll' event lags or doesn't fire.
    const w = window as unknown as {
      __lenis?: { on?: (ev: string, cb: (e: { scroll: number; limit: number }) => void) => void; off?: (ev: string, cb: unknown) => void }
    }
    const onLenis = (e: { scroll: number; limit: number }) => {
      if (e.limit > 0) publishProgress(e.scroll / e.limit)
    }
    w.__lenis?.on?.('scroll', onLenis)

    return () => {
      st.kill()
      window.removeEventListener('scroll', onScroll)
      w.__lenis?.off?.('scroll', onLenis)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset:    0,
        zIndex:   0,
        // Canvas needs pointer events so the skills tiles can be clicked.
        // HUD chrome sits on top in a higher z-index.
        pointerEvents: 'auto',
        background: 'rgb(var(--space-0))',
      }}
    >
      <Canvas
        // NOTE: never put the theme in this key. Colours are uniforms and
        // reactive props, so the theme flips in place. Keying on theme forced
        // a full Canvas unmount+remount (WebGL context teardown + whole-scene
        // rebuild) on every toggle → a multi-hundred-ms main-thread block.
        key={canvasKey}
        // On-demand: RenderDriver pumps frames (full rate only while moving)
        // and stops when the tab is hidden or a drawer is open.
        frameloop="demand"
        camera={{ fov: CAMERA_FOV, near: 0.05, far: 400, position: [0, 0, 0] }}
        // DPR locked to 1. Retina 2× would 4× the framebuffer pixel count for
        // marginal gain on a soft scene. Single biggest GPU-memory win.
        dpr={1}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          // When the GPU drops the context, remount the canvas instead of
          // reloading the page (page reloads can loop on persistent issues).
          // Cap at 3 retries.
          const handler = (e: Event) => {
            e.preventDefault()
            if (retriesRef.current < 3) {
              retriesRef.current += 1
              setTimeout(() => setCanvasKey((k) => k + 1), 200)
            }
          }
          gl.domElement.addEventListener('webglcontextlost', handler)
        }}
      >
        <RenderDriver idleFps={36} activeFps={60} />

        {/* First subscriber: the camera moves before anything reads it. */}
        <CameraRig curve={curve} sea={sea} />

        {/* Clear colour + fog: space matches --space-0; the sea hazes into
            its own horizon colour. */}
        <color attach="background" args={[skyColor]} />
        <fog attach="fog" args={sea ? [skyColor, palette.sea!.fog.near, palette.sea!.fog.far] : [palette.bg, 30, 170]} />

        {sea ? (
          <SeaWorld
            palette={palette}
            preset={preset}
            motion={motion}
            curve={curve}
            lookAhead={LOOK_AHEAD}
            skillsSx={skillsScreenX}
            onActive={kick}
            getCamT={getCamT}
          />
        ) : (
          <>
            {/* Sky: nebula + stars, drawn first and following the camera. */}
            <NebulaBackground palette={palette} preset={preset} motion={motion} />
            {STATIONS.map((s) => (
              <Station key={s.id} curve={curve} station={s} palette={palette} motion={motion} />
            ))}
          </>
        )}

        {/* Skills station — the tile orbit around the ice planet. Mounted
            within 0.14 of the station (unmounted past 0.18), so it never
            churns at the Work station (0.55). */}
        <ProximityGate stationT={skillsT} threshold={0.14} hysteresis={0.04}>
          <Suspense fallback={null}>
            <SkillsAnchor curve={curve} stationT={skillsT} motion={motion} sea={sea} />
          </Suspense>
        </ProximityGate>

        {/* Links every off-screen station's shaders (the Work ring) once,
            after the first frame and under the loader, instead of mid
            flight. Keyed on the world so a theme swap gets the same. */}
        <Precompile key={sea ? 'sea' : 'space'} />

        {/* No EffectComposer: grain and vignette are CSS layers above the
            canvas. Bloom allocates 5–8 viewport-sized framebuffers and an
            extra pass per frame; it stays off unless measured on high. */}
      </Canvas>
    </div>
  )
}

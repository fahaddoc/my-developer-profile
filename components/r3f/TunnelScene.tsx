'use client'

// TunnelScene — the desktop WebGL journey (DESIGN.md section 7).
//
// The camera flies a CatmullRom curve driven by scroll progress. Each station
// on the curve owns one planet from a single restrained family (graphite,
// stone, ice, dust, a desaturated Earth), lit by one warm key light from the
// upper left with a soft terminator and a cold rim. Ember appears only as the
// hero planet's lit limb. A quiet station name hangs under each planet while
// the camera is near. The sky (nebula + stars) lives in NebulaBackground.
//
// Colours come from useScenePalette() (lib/palette.ts, a hex mirror of the CSS
// tokens) and flip in place on a theme change: the Canvas is never keyed on
// theme. Cost scales with the quality preset (stars, nebula octaves, warp).
//
// Performance guards kept on purpose: frameloop="demand" + RenderDriver at
// 36fps (paused while the tab is hidden), dpr 1, ProximityGate around every
// drei <Html>, context-loss remount, material/geometry disposal, time-based
// animation only.

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FaGithub, FaLinkedinIn, FaRegEnvelope } from 'react-icons/fa6'
import { type QualityPreset, PRESETS } from '@/lib/quality'
import { type ScenePalette, useScenePalette } from '@/lib/palette'
import { NebulaBackground } from '@/components/r3f/NebulaBackground'
import { SkillsOrbit } from '@/components/r3f/SkillsOrbit'

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

// Station names as wayfinding (same names as the rail, DESIGN.md section 5).
const STATION_NAMES: Record<string, string> = {
  hero:       'Intro',
  about:      'About',
  skills:     'Skills',
  projects:   'Work',
  opensource: 'Open source',
  experience: 'Experience',
  contact:    'Contact',
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

// Places a group on the curve at `t`, facing the approaching camera: the
// group's +Z points back along the path, so its axes line up with the
// camera's (x right, y up, -z ahead) when the camera reaches `t`.
function useCurveAnchor(curve: THREE.CatmullRomCurve3, t: number) {
  const ref = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!ref.current) return
    const pos     = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    curve.getPointAt(t, pos)
    curve.getTangentAt(t, tangent)
    ref.current.position.copy(pos)
    ref.current.lookAt(pos.clone().sub(tangent))
  }, [curve, t])
  return ref
}

// ─────────────────────────────────────────────────────────────────────────────
// Planets — one restrained family. Offsets are in station space (x right,
// y up, -z ahead of the camera when it reaches the station), so every planet
// sits in the right half of the frame: the left belongs to the HUD copy.
// ─────────────────────────────────────────────────────────────────────────────
interface PlanetConfig {
  deep:        string
  mid:         string
  bright:      string
  brightMix:   number              // how far the bright tone takes over
  brightEdge:  [number, number]    // smoothstep window for the bright tone
  bands:       number              // 0 = noise only, 1 = latitude bands
  bandFreq:    number
  noiseScale:  number
  polarCap:    number
  cloud:       number
  rimStrength: number              // cold rim on the shadow side
  atmo:        'accent' | 'key' | 'rim'
  atmoStrength: number             // lit-limb atmosphere
  radius:      number
  offset:      [number, number, number]
  tilt:        number              // axial tilt (rad)
  spin:        number              // rad/s
  segments:    [number, number]
  halo?:       number              // ember shell radius multiple (hero only)
  ring?:       { inner: number; outer: number; tiltX: number; tiltZ: number; color: string; opacity: number }
  midEdge?:    [number, number]    // smoothstep window deep → mid (contrast)
  capColor?:   string
  cloudColor?: string
  labelY?:     number              // override for the station-name height
  showLabel?:  boolean             // false where HUD content owns that part of the frame
}

const PLANETS: Record<string, PlanetConfig> = {
  // Graphite giant, far and large, with the one ember limb.
  hero: {
    // Low-contrast surface on purpose: it is a backdrop for the intro.
    deep: '#0d0f12', mid: '#1f2227', bright: '#3a3e45',
    brightMix: 0.45, brightEdge: [0.6, 0.92], midEdge: [0.1, 0.9],
    bands: 0.55, bandFreq: 13, noiseScale: 2.2,
    polarCap: 0, cloud: 0,
    rimStrength: 0.45, atmo: 'accent', atmoStrength: 1.3,
    radius: 7.5, offset: [14.5, 4.4, -21.5], tilt: 0.32, spin: 0.012,
    segments: [96, 64], halo: 1.075,
    // The intro owns its frame (name, portrait); a label over this planet
    // runs into the top bar as the camera closes in.
    showLabel: false,
  },
  // Stone: warm grey, rocky noise.
  about: {
    deep: '#1b1b1b', mid: '#484643', bright: '#828079',
    brightMix: 0.5, brightEdge: [0.6, 0.88],
    bands: 0, bandFreq: 0, noiseScale: 4.2,
    polarCap: 0, cloud: 0,
    rimStrength: 0.5, atmo: 'key', atmoStrength: 0.18,
    radius: 2.3, offset: [5.0, -0.7, -10], tilt: 0.2, spin: 0.05,
    segments: [56, 40],
  },
  // Ice: pale blue-grey, faint bands, caps. The skills orbit circles it.
  skills: {
    deep: '#253039', mid: '#62788b', bright: '#c3d0dc',
    brightMix: 0.55, brightEdge: [0.58, 0.88],
    bands: 0.25, bandFreq: 7, noiseScale: 3.4,
    polarCap: 0.7, cloud: 0, capColor: '#d5dde4',
    rimStrength: 0.6, atmo: 'rim', atmoStrength: 0.22,
    radius: 1.3, offset: [4.4, 0.25, -9], tilt: 0.28, spin: 0.06,
    segments: [48, 32], labelY: 2.7,
  },
  // Dust: banded, desaturated sand gas giant with a thin ring.
  projects: {
    deep: '#25231f', mid: '#55504a', bright: '#9b958b',
    brightMix: 0.45, brightEdge: [0.62, 0.92], midEdge: [0.12, 0.88],
    bands: 0.8, bandFreq: 11, noiseScale: 2.6,
    polarCap: 0, cloud: 0,
    rimStrength: 0.45, atmo: 'key', atmoStrength: 0.16,
    radius: 2.6, offset: [6.6, 1.1, -13], tilt: 0.38, spin: 0.05,
    segments: [56, 40],
    ring: { inner: 1.45, outer: 2.15, tiltX: 1.2, tiltZ: 0.35, color: '#8a867f', opacity: 0.42 },
    // The Work HUD (showcase + library) covers this side of the frame, so a
    // label here would only peek out cut in half.
    showLabel: false,
  },
  // Graphite, cool and small: a moon-like body.
  opensource: {
    deep: '#121519', mid: '#30363e', bright: '#69717c',
    brightMix: 0.55, brightEdge: [0.6, 0.86],
    bands: 0, bandFreq: 0, noiseScale: 5.5,
    polarCap: 0, cloud: 0,
    rimStrength: 0.55, atmo: 'key', atmoStrength: 0.12,
    radius: 1.6, offset: [4.3, -0.5, -8], tilt: 0.1, spin: 0.045,
    segments: [48, 32],
  },
  // Ice giant: soft bands, cold.
  experience: {
    deep: '#18232d', mid: '#44596a', bright: '#93a5b4',
    brightMix: 0.35, brightEdge: [0.6, 0.92],
    bands: 0.6, bandFreq: 8, noiseScale: 3.0, midEdge: [0.15, 0.85],
    polarCap: 0.25, cloud: 0, capColor: '#b9c4cf',
    rimStrength: 0.6, atmo: 'rim', atmoStrength: 0.25,
    radius: 2.5, offset: [6.0, 0.5, -12], tilt: 0.24, spin: 0.05,
    segments: [56, 40],
    // The HUD timeline wraps this planet; the planet is its backdrop.
    showLabel: false,
  },
  // Natural, desaturated Earth.
  contact: {
    deep: '#0c1d2c', mid: '#1c3b55', bright: '#4b5039',
    brightMix: 0.85, brightEdge: [0.555, 0.615],
    bands: 0, bandFreq: 0, noiseScale: 2.8,
    polarCap: 0.85, cloud: 0.5, capColor: '#d9dfe4', cloudColor: '#e3e7ea',
    rimStrength: 0.5, atmo: 'rim', atmoStrength: 0.45,
    radius: 2.2, offset: [4.6, -0.3, -9], tilt: 0.41, spin: 0.04,
    segments: [64, 48],
  },
}

// Per-theme lighting that is not a token: ambient fill and key intensity.
// Daylight gets a cool sky fill so the shadow side reads as haze, not ink.
function lightingFor(palette: ScenePalette) {
  return palette.mode === 'light'
    ? { ambient: [0.30, 0.33, 0.38] as const, keyIntensity: 1.2, rimScale: 0.55, fade: [12, 38, 1.0] as const, haloScale: 0.5, haze: 0.24 }
    : { ambient: [0.010, 0.013, 0.022] as const, keyIntensity: 1.55, rimScale: 1.0, fade: [12, 38, 1.0] as const, haloScale: 1.0, haze: 0 }
}

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
  void main() {
    vObjNormal  = normalize(normal);
    vViewNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
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
  uniform vec3  uAmbient;
  uniform vec3  uRim;
  uniform float uRimStrength;
  uniform vec3  uAtmo;
  uniform float uAtmoStrength;
  uniform float uAtmoPow;
  uniform vec3  uBg;
  uniform vec3  uFade;
  uniform float uHaze;       // daylight: constant aerial haze toward the sky
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

    // Key light from the upper left, soft (wrapped) terminator.
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(-vViewPos);
    vec3 L = normalize(uLightDir);
    float ndl  = dot(N, L);
    // Full-face gradient (gives volume) with a soft, wrapped terminator.
    float diff = smoothstep(-0.14, 1.0, ndl);
    vec3 col = albedo * (uAmbient + uLightColor * diff * uKeyIntensity);

    float fres = 1.0 - clamp(dot(N, V), 0.0, 1.0);
    // Cold rim from behind: lives on the shadow side of the silhouette.
    col += uRim * pow(fres, 3.0) * smoothstep(0.35, -0.55, ndl) * uRimStrength;
    // Lit-limb atmosphere (ember on the hero, neutral elsewhere).
    // Tight exponent: lighting is linear, so a soft falloff would wash the
    // whole face; this keeps it to a thin crescent on the lit limb.
    col += uAtmo * pow(fres, uAtmoPow) * smoothstep(0.0, 0.7, ndl) * uAtmoStrength;

    // Depth: with distance the planet sinks toward the sky colour and
    // dissolves into whatever nebula is behind it (alpha), so far planets
    // read as haze rather than dark discs. Gamma-ish mix for an even fade.
    float fade = smoothstep(uFade.x, uFade.y, length(vViewPos)) * uFade.z;
    col = pow(mix(sqrt(max(col, 0.0)), sqrt(uBg), uHaze + (1.0 - uHaze) * fade * 0.45), vec3(2.0));

    gl_FragColor = vec4(col, 1.0 - fade);
    #include <colorspace_fragment>
  }
`

// Ember shell around the hero planet: a thin back-face halo, brightest at the
// planet's lit limb, gone on the shadow side.
const HALO_FRAG = /* glsl */ `
  uniform vec3  uColor;
  uniform vec3  uLightDir;
  uniform float uStrength;
  uniform float uInner;      // -dot(N,V) at the planet silhouette
  uniform vec3  uFade;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(-vViewPos);
    float k = clamp(-dot(N, V) / uInner, 0.0, 1.0);
    float glow = k * k * k;
    vec2 side = normalize(N.xy + 1e-4);
    float lit = smoothstep(-0.15, 0.85, dot(side, normalize(uLightDir.xy)));
    float fade = 1.0 - smoothstep(uFade.x, uFade.y, length(vViewPos)) * uFade.z;
    gl_FragColor = vec4(uColor, glow * lit * uStrength * fade);
    #include <colorspace_fragment>
  }
`

const RING_VERT = /* glsl */ `
  varying vec2 vLocal;
  varying vec3 vViewPos;
  void main() {
    vLocal = position.xy;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const RING_FRAG = /* glsl */ `
  uniform vec3  uColor;
  uniform float uOpacity;
  uniform float uInner;
  uniform float uOuter;
  uniform vec3  uLight;      // already multiplied: ambient + key * 0.7
  uniform vec3  uBg;
  uniform vec3  uFade;
  varying vec2 vLocal;
  varying vec3 vViewPos;
  void main() {
    float r = length(vLocal);
    float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
    float bands = 0.6 + 0.4 * sin(t * 46.0 + sin(t * 11.0) * 2.0);
    float edge  = smoothstep(0.0, 0.07, t) * (1.0 - smoothstep(0.86, 1.0, t));
    float gap   = 1.0 - 0.8 * (1.0 - smoothstep(0.0, 0.035, abs(t - 0.64)));
    vec3 col = uColor * uLight;
    float fade = smoothstep(uFade.x, uFade.y, length(vViewPos)) * uFade.z;
    col = pow(mix(sqrt(max(col, 0.0)), sqrt(uBg), fade), vec3(2.0));
    gl_FragColor = vec4(col, edge * bands * gap * uOpacity * (1.0 - fade));
    #include <colorspace_fragment>
  }
`

function Planet({ cfg, palette, motion }: {
  cfg:     PlanetConfig
  palette: ScenePalette
  motion:  number
}) {
  const spinRef = useRef<THREE.Mesh>(null)
  // Big planets stay readable from further away: the dissolve distance
  // scales with size, so small bodies emerge late and the giant early.
  const fadeK = Math.max(1, cfg.radius / 2.4)

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:         { value: 0 },
      uDeep:         { value: new THREE.Color(cfg.deep) },
      uMid:          { value: new THREE.Color(cfg.mid) },
      uBright:       { value: new THREE.Color(cfg.bright) },
      uBrightMix:    { value: cfg.brightMix },
      uBrightEdge:   { value: new THREE.Vector2(...cfg.brightEdge) },
      uBands:        { value: cfg.bands },
      uBandFreq:     { value: cfg.bandFreq },
      uNoiseScale:   { value: cfg.noiseScale },
      uPolarCap:     { value: cfg.polarCap },
      uCloud:        { value: cfg.cloud },
      uMidEdge:      { value: new THREE.Vector2(...(cfg.midEdge ?? [0.28, 0.72])) },
      uCapColor:     { value: new THREE.Color(cfg.capColor ?? '#c9d0d6') },
      uCloudColor:   { value: new THREE.Color(cfg.cloudColor ?? '#dfe3e7') },
      uLightDir:     { value: new THREE.Vector3() },
      uLightColor:   { value: new THREE.Color() },
      uKeyIntensity: { value: 1 },
      uAmbient:      { value: new THREE.Color() },
      uRim:          { value: new THREE.Color() },
      uRimStrength:  { value: cfg.rimStrength },
      uAtmo:         { value: new THREE.Color() },
      uAtmoStrength: { value: cfg.atmoStrength },
      uAtmoPow:      { value: cfg.atmo === 'accent' ? 6.0 : 4.0 },
      uBg:           { value: new THREE.Color() },
      uFade:         { value: new THREE.Vector3() },
      uHaze:         { value: 0 },
    },
    vertexShader:   PLANET_VERT,
    fragmentShader: PLANET_FRAG,
    // Transparent only for the distance dissolve; it still writes depth, and
    // renderOrder keeps each planet ahead of its own ring and halo.
    transparent: true,
    depthWrite:  true,
    toneMapped:  false,
  }), [cfg])
  useEffect(() => () => mat.dispose(), [mat])

  const haloMat = useMemo(() => {
    if (!cfg.halo) return null
    // -dot(N,V) on the shell's back face where it meets the planet silhouette
    const inner = Math.sqrt(1 - 1 / (cfg.halo * cfg.halo))
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor:    { value: new THREE.Color() },
        uLightDir: { value: new THREE.Vector3() },
        uStrength: { value: 1 },
        uInner:    { value: inner },
        uFade:     { value: new THREE.Vector3() },
      },
      vertexShader:   PLANET_VERT,
      fragmentShader: HALO_FRAG,
      side:        THREE.BackSide,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      toneMapped:  false,
    })
  }, [cfg])
  useEffect(() => () => { haloMat?.dispose() }, [haloMat])

  const ringMat = useMemo(() => {
    if (!cfg.ring) return null
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor:   { value: new THREE.Color(cfg.ring.color) },
        uOpacity: { value: cfg.ring.opacity },
        uInner:   { value: cfg.radius * cfg.ring.inner },
        uOuter:   { value: cfg.radius * cfg.ring.outer },
        uLight:   { value: new THREE.Color() },
        uBg:      { value: new THREE.Color() },
        uFade:    { value: new THREE.Vector3() },
      },
      vertexShader:   RING_VERT,
      fragmentShader: RING_FRAG,
      side:        THREE.DoubleSide,
      transparent: true,
      depthWrite:  false,
      toneMapped:  false,
    })
  }, [cfg])
  useEffect(() => () => { ringMat?.dispose() }, [ringMat])

  // Theme: write palette + lighting into the existing uniforms.
  useEffect(() => {
    const lt = lightingFor(palette)
    const [lx, ly, lz] = palette.keyLight.dir
    const u = mat.uniforms
    ;(u.uLightDir.value as THREE.Vector3).set(lx, ly, lz).normalize()
    ;(u.uLightColor.value as THREE.Color).set(palette.keyLight.color)
    u.uKeyIntensity.value = lt.keyIntensity
    ;(u.uAmbient.value as THREE.Color).setRGB(lt.ambient[0], lt.ambient[1], lt.ambient[2])
    ;(u.uRim.value as THREE.Color).set(palette.keyLight.rim)
    u.uRimStrength.value = cfg.rimStrength * lt.rimScale
    const atmo = cfg.atmo === 'accent' ? palette.accent : cfg.atmo === 'rim' ? palette.keyLight.rim : palette.keyLight.color
    ;(u.uAtmo.value as THREE.Color).set(atmo)
    ;(u.uBg.value as THREE.Color).set(palette.bg)
    ;(u.uFade.value as THREE.Vector3).set(lt.fade[0] * fadeK, lt.fade[1] * fadeK, lt.fade[2])
    u.uHaze.value = lt.haze

    if (haloMat) {
      const h = haloMat.uniforms
      ;(h.uColor.value as THREE.Color).set(palette.accent)
      ;(h.uLightDir.value as THREE.Vector3).set(lx, ly, lz).normalize()
      h.uStrength.value = 0.7 * lt.haloScale
      ;(h.uFade.value as THREE.Vector3).set(lt.fade[0] * fadeK, lt.fade[1] * fadeK, lt.fade[2])
      haloMat.blending = palette.mode === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending
    }
    if (ringMat) {
      const r = ringMat.uniforms
      const key = new THREE.Color(palette.keyLight.color).multiplyScalar(0.75 * lt.keyIntensity)
      ;(r.uLight.value as THREE.Color).setRGB(lt.ambient[0] + key.r, lt.ambient[1] + key.g, lt.ambient[2] + key.b)
      ;(r.uBg.value as THREE.Color).set(palette.bg)
      ;(r.uFade.value as THREE.Vector3).set(lt.fade[0] * fadeK, lt.fade[1] * fadeK, lt.fade[2])
    }
  }, [palette, mat, haloMat, ringMat, cfg, fadeK])

  // Past the fade-out distance a planet is pure sky colour: skip the draw.
  const rootRef = useRef<THREE.Group>(null)
  const tmp     = useMemo(() => new THREE.Vector3(), [])
  const cullAt  = lightingFor(palette).fade[1] * fadeK + cfg.radius * (cfg.ring ? cfg.ring.outer : cfg.halo ?? 1)

  useFrame(({ camera }, delta) => {
    const root = rootRef.current
    if (root) {
      const visible = root.getWorldPosition(tmp).distanceTo(camera.position) < cullAt
      if (root.visible !== visible) root.visible = visible
      if (!visible) return
    }
    const dt = Math.min(delta, 0.25) * motion
    mat.uniforms.uTime.value += dt
    if (spinRef.current) spinRef.current.rotation.y += dt * cfg.spin
  })

  return (
    <group ref={rootRef} position={cfg.offset}>
      <group rotation={[0, 0, cfg.tilt]}>
        <mesh ref={spinRef} material={mat} renderOrder={1}>
          <sphereGeometry args={[cfg.radius, cfg.segments[0], cfg.segments[1]]} />
        </mesh>
        {cfg.ring && ringMat && (
          <mesh rotation={[cfg.ring.tiltX, 0, cfg.ring.tiltZ]} material={ringMat} renderOrder={2}>
            <ringGeometry args={[cfg.radius * cfg.ring.inner, cfg.radius * cfg.ring.outer, 128, 1]} />
          </mesh>
        )}
      </group>
      {haloMat && cfg.halo && (
        <mesh material={haloMat} renderOrder={3}>
          <sphereGeometry args={[cfg.radius * cfg.halo, cfg.segments[0], cfg.segments[1]]} />
        </mesh>
      )}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Station name in space — quiet wayfinding, not a headline. Archivo wide 600,
// ink at half alpha (large-text AA in both themes), sentence case, no float.
// Mounted only near its station (ProximityGate), faded + scaled by proximity.
// ─────────────────────────────────────────────────────────────────────────────
const LABEL_WINDOW  = 0.07
const LABEL_FONT_PX = 96
// world units per screen px at distance d ≈ d / 643 (fov 70, 900px tall);
// one CSS px = 0.025 world units in drei transform mode (distanceFactor 10).
const LABEL_SCALE_PER_UNIT = 26 / 643 / (LABEL_FONT_PX * 0.025)

function StationLabel({ station, cfg }: { station: StationDef; cfg: PlanetConfig }) {
  const groupRef = useRef<THREE.Group>(null)
  const elRef    = useRef<HTMLDivElement>(null)
  const dist     = Math.hypot(cfg.offset[0], cfg.offset[1], cfg.offset[2])
  const scale    = LABEL_SCALE_PER_UNIT * dist
  // Above the planet by default (the upper frame is empty; the HUD copy and
  // its actions sit mid-left and low).
  const y        = cfg.labelY ?? cfg.offset[1] + cfg.radius + 0.06 * dist + 0.3
  const name     = STATION_NAMES[station.id] ?? station.id

  useFrame(() => {
    const p = Math.max(0, 1 - Math.abs(scrollRef.current - station.t) / LABEL_WINDOW)
    const e = p * p * (3 - 2 * p)
    if (elRef.current) elRef.current.style.opacity = e.toFixed(3)
    if (groupRef.current) groupRef.current.scale.setScalar(scale * (0.94 + 0.06 * e))
  })

  return (
    <group ref={groupRef} position={[cfg.offset[0], y, cfg.offset[2]]} scale={scale}>
      <Html transform center zIndexRange={[18, 0]} pointerEvents="none">
        <div
          ref={elRef}
          aria-hidden="true"
          style={{
            opacity: 0,
            fontFamily: 'var(--font-display), system-ui, sans-serif',
            fontVariationSettings: "'wdth' 125",
            fontWeight: 600,
            fontSize: LABEL_FONT_PX,
            letterSpacing: '0.01em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            color: 'rgb(var(--ink) / 0.5)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {name}
        </div>
      </Html>
    </group>
  )
}

function Station({ curve, station, palette, motion }: {
  curve:   THREE.CatmullRomCurve3
  station: StationDef
  palette: ScenePalette
  motion:  number
}) {
  const ref = useCurveAnchor(curve, station.t)
  const cfg = PLANETS[station.id] ?? PLANETS.hero
  return (
    <group ref={ref}>
      <Planet cfg={cfg} palette={palette} motion={motion} />
      {cfg.showLabel !== false && (
        <ProximityGate stationT={station.t} threshold={LABEL_WINDOW + 0.02}>
          <StationLabel station={station} cfg={cfg} />
        </ProximityGate>
      )}
    </group>
  )
}

// SkillsAnchor — places its children exactly where the skills planet sits, so
// the tile orbit circles the visible planet.
function SkillsAnchor({ curve, stationT, children }: {
  curve:    THREE.CatmullRomCurve3
  stationT: number
  children: React.ReactNode
}) {
  const ref = useCurveAnchor(curve, stationT)
  return (
    <group ref={ref}>
      <group position={PLANETS.skills.offset}>{children}</group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SocialsEnd3D — a calm sign-off at the very end of the line: one title and
// three links. Ink, accent on hover (.link-quiet), tokens only. It peaks at
// the bottom of the page (progress 1), after the Contact HUD has faded, and
// sits just ahead of where the camera parks (curve t 0.999).
// ─────────────────────────────────────────────────────────────────────────────
const SOCIALS_T      = 1.0
const SOCIALS_WINDOW = 0.05
const SOCIALS = [
  { href: 'https://github.com/fahaddoc',             label: 'GitHub',   Icon: FaGithub,      external: true  },
  { href: 'https://www.linkedin.com/in/fahaddoc600', label: 'LinkedIn', Icon: FaLinkedinIn,  external: true  },
  { href: 'mailto:hello@shahfahad.dev',              label: 'Email',    Icon: FaRegEnvelope, external: false },
] as const

function SocialsEnd3D({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const ref      = useCurveAnchor(curve, 0.999)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const shownRef = useRef(false)

  useFrame(() => {
    const dist      = Math.abs(scrollRef.current - SOCIALS_T)
    const proximity = Math.max(0, 1 - dist / SOCIALS_WINDOW)
    const o         = Math.pow(proximity, 2.4)
    const el = wrapRef.current
    if (!el) return
    el.style.opacity = o.toFixed(3)
    const shown = o > 0.02
    if (shown !== shownRef.current) {
      shownRef.current = shown
      el.style.visibility = shown ? 'visible' : 'hidden'
    }
  })

  return (
    <group ref={ref}>
      <group position={[0, 0, -3.2]}>
        <Html transform center distanceFactor={2.1} pointerEvents="none">
          <div
            ref={wrapRef}
            style={{
              opacity: 0,
              visibility: 'hidden',
              width: 560,
              textAlign: 'center',
              color: 'rgb(var(--ink))',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <p className="t-title" style={{ fontSize: 52, margin: 0 }}>
              Stay in touch.
            </p>
            <ul
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 32,
                marginTop: 28,
                listStyle: 'none',
                padding: 0,
              }}
            >
              {SOCIALS.map(({ href, label, Icon, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="link-quiet t-label"
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      minHeight: 32,
                      fontSize: 17,
                      pointerEvents: 'auto',
                      userSelect: 'auto',
                    }}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Html>
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CameraRig: a dolly, not a rollercoaster. Frame-rate independent damping on
// progress, a damped look direction slightly ahead on the curve, and a small
// bank into turns (gain 1.5, clamped to 0.08 rad).
// ─────────────────────────────────────────────────────────────────────────────
function CameraRig({ curve }: { curve: THREE.CatmullRomCurve3 }) {
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
  const primed   = useRef(false)

  useFrame(({ camera }, delta) => {
    // No clamp: exponential damping is stable for any step, and after a
    // paused tab a long step should simply land on the target.
    const dt     = Number.isFinite(delta) && delta > 0 ? delta : 0
    const target = THREE.MathUtils.clamp(scrollRef.current, 0, 0.999)

    // Snap on big jumps (the bottom-of-page loop back to the start) instead
    // of rewinding through the whole tunnel.
    if (!primed.current || Math.abs(target - tRef.current) > 0.5) {
      tRef.current = target
    } else {
      tRef.current = THREE.MathUtils.damp(tRef.current, target, 5, dt)
    }
    const t = THREE.MathUtils.clamp(tRef.current, 0, 0.999)

    curve.getPointAt(t, pos)
    curve.getPointAt(Math.min(0.9999, t + 0.015), ahead)
    wantDir.copy(ahead).sub(pos).normalize()
    if (!primed.current) lookDir.copy(wantDir)
    else lookDir.lerp(wantDir, 1 - Math.exp(-6 * dt)).normalize()

    curve.getTangentAt(t, tanNow)
    curve.getTangentAt(Math.min(0.999, t + 0.02), tanAhead)
    const targetRoll = THREE.MathUtils.clamp((tanAhead.x - tanNow.x) * 1.5, -0.08, 0.08)
    rollRef.current = primed.current
      ? THREE.MathUtils.damp(rollRef.current, targetRoll, 2.5, dt)
      : targetRoll
    primed.current = true

    up.set(0, 1, 0).applyQuaternion(rollQuat.setFromAxisAngle(lookDir, rollRef.current))
    look.copy(pos).add(lookDir)
    camera.up.copy(up)
    camera.position.copy(pos)
    camera.lookAt(look)
  })

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// ProximityGate — only mounts its children when the camera is within
// `threshold` of `stationT`. Heavy nodes (drei <Html>, large geometries) cost
// memory + DOM even when fully transparent, so unmounting them when the user
// is at the other end of the tunnel keeps the page light.
// ─────────────────────────────────────────────────────────────────────────────
function ProximityGate({
  stationT, threshold = 0.18, children,
}: {
  stationT: number
  threshold?: number
  children: React.ReactNode
}) {
  const [near, setNear] = useState(false)
  useFrame(() => {
    const isNear = Math.abs(scrollRef.current - stationT) < threshold
    if (isNear !== near) setNear(isNear)
  })
  return near ? <>{children}</> : null
}

// ─────────────────────────────────────────────────────────────────────────────
// RenderDriver — with the Canvas in frameloop="demand", this is the ONLY thing
// that pumps frames. It caps rendering to ~36fps (the scene is slow/ambient, so
// 60fps just heats the GPU) and fully PAUSES when the tab is hidden — no wasted
// GPU/CPU while the page is in a background tab. All scene animations are
// time-based (delta / clock.elapsedTime), so a lower frame rate stays correct.
// ─────────────────────────────────────────────────────────────────────────────
function RenderDriver({ fps = 36 }: { fps?: number }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let raf = 0
    let last = 0
    const minDelta = 1000 / fps
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (typeof document !== 'undefined' && document.hidden) return
      if (t - last < minDelta) return
      last = t
      invalidate()
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [invalidate, fps])
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

  const curve = useMemo(() => new THREE.CatmullRomCurve3(
    CURVE_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'catmullrom',
    0.5,
  ), [])

  const skillsT = STATIONS.find((s) => s.id === 'skills')?.t ?? 0.35

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
        // Canvas needs pointer events so the skills tiles and the sign-off
        // links can be clicked. HUD chrome sits on top in a higher z-index.
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
        // On-demand: RenderDriver pumps frames at a capped FPS and stops when
        // the tab is hidden (huge heat/battery saver vs the default 'always').
        frameloop="demand"
        camera={{ fov: 70, near: 0.05, far: 400, position: [0, 0, 0] }}
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
        <RenderDriver fps={36} />

        {/* First subscriber: the camera moves before anything reads it. */}
        <CameraRig curve={curve} />

        {/* Clear colour + fog match the page background token (--space-0). */}
        <color attach="background" args={[palette.bg]} />
        <fog attach="fog" args={[palette.bg, 30, 170]} />

        {/* Sky: nebula + stars, drawn first and following the camera. */}
        <NebulaBackground palette={palette} preset={preset} motion={motion} />

        {STATIONS.map((s) => (
          <Station key={s.id} curve={curve} station={s} palette={palette} motion={motion} />
        ))}

        {/* Skills station — monochrome tiles orbiting the ice planet. */}
        <ProximityGate stationT={skillsT} threshold={0.20}>
          <Suspense fallback={null}>
            <SkillsAnchor curve={curve} stationT={skillsT}>
              <SkillsOrbit stationT={skillsT} motion={motion} />
            </SkillsAnchor>
          </Suspense>
        </ProximityGate>

        {/* Sign-off at the very end of the tunnel */}
        <ProximityGate stationT={SOCIALS_T} threshold={SOCIALS_WINDOW + 0.04}>
          <SocialsEnd3D curve={curve} />
        </ProximityGate>

        {/* No EffectComposer: grain and vignette are CSS layers above the
            canvas. Bloom allocates 5–8 viewport-sized framebuffers and an
            extra pass per frame; it stays off unless measured on high. */}
      </Canvas>
    </div>
  )
}

// components/r3f/sea/paint.ts — the painterly look shared by the islands and
// their props (trees, palms, lighthouse, arch).
//
// Ghibli-like rather than physically based:
//   - warm key light with a soft but readable terminator, and the shadow side
//     tinted cool blue-violet instead of going grey
//   - a faint posterisation (a hint of painted light bands, not cel shading)
//   - sky fill from above, sea-bounce from below
//   - a soft sky-coloured rim on the silhouette
//   - painted variation: low-frequency colour patches + fine brush grain in
//     world space, rock strata on cliffs, wet sand at the waterline
//   - atmospheric perspective: distance tints toward the sky haze

import * as THREE from 'three'
import type { SeaPalette } from '@/lib/palette'

export const PAINT_NOISE_GLSL = /* glsl */ `
  float pHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float pNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(pHash(i + vec3(0, 0, 0)), pHash(i + vec3(1, 0, 0)), f.x),
                   mix(pHash(i + vec3(0, 1, 0)), pHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(pHash(i + vec3(0, 0, 1)), pHash(i + vec3(1, 0, 1)), f.x),
                   mix(pHash(i + vec3(0, 1, 1)), pHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float pFbm(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += a * pNoise(p); p = p * 2.07 + 13.1; a *= 0.5; }
    return s;
  }
`

/** Uniforms + the lighting function. Call paint(albedo, N, worldPos, ao). */
export const PAINT_LIGHT_GLSL = /* glsl */ `
  uniform vec3 uKeyDir;
  uniform vec3 uKey;
  uniform vec3 uShadowTint;
  uniform vec3 uSkyFill;
  uniform vec3 uSeaFill;
  uniform vec3 uRim;
  uniform vec3 uHaze;
  uniform vec3 uCamPos;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uOpacity;

  vec3 paint(vec3 albedo, vec3 N, vec3 W, float ao) {
    vec3 L = normalize(uKeyDir);
    vec3 V = normalize(uCamPos - W);
    float ndl = dot(N, L);
    float lit = smoothstep(-0.12, 0.5, ndl);
    // a hint of painted light bands
    lit = mix(lit, floor(lit * 3.0 + 0.5) / 3.0, 0.22);
    vec3 light = mix(uShadowTint, uKey, lit);
    vec3 fill = mix(uSeaFill, uSkyFill, N.y * 0.5 + 0.5) * 0.42;
    vec3 col = albedo * (light + fill) * mix(0.62, 1.0, ao);
    // warm bloom where the sun hits square on
    col += albedo * uKey * pow(max(ndl, 0.0), 6.0) * 0.12;
    // soft sky rim on the silhouette
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col += uRim * rim * 0.22 * (0.4 + 0.6 * lit);
    // atmospheric perspective
    float d = length(uCamPos - W);
    float haze = smoothstep(uFogNear, uFogFar, d);
    col = mix(col, uHaze, clamp(haze + smoothstep(uFogNear * 0.4, uFogFar, d) * 0.15, 0.0, 1.0));
    return col;
  }
`

export function paintUniforms() {
  return {
    uKeyDir:     { value: new THREE.Vector3() },
    uKey:        { value: new THREE.Color() },
    uShadowTint: { value: new THREE.Color() },
    uSkyFill:    { value: new THREE.Color() },
    uSeaFill:    { value: new THREE.Color() },
    uRim:        { value: new THREE.Color() },
    uHaze:       { value: new THREE.Color() },
    uCamPos:     { value: new THREE.Vector3() },
    uFogNear:    { value: 70 },
    uFogFar:     { value: 330 },
    uOpacity:    { value: 1 },
  }
}

/** Write the sea palette into a painterly material's shared uniforms. */
export function applyPaint(mat: THREE.ShaderMaterial, sea: SeaPalette) {
  const u = mat.uniforms
  ;(u.uKeyDir.value as THREE.Vector3).set(...sea.keyDir).normalize()
  ;(u.uKey.value as THREE.Color).set(sea.sun)
  ;(u.uShadowTint.value as THREE.Color).set(sea.shadowTint)
  ;(u.uSkyFill.value as THREE.Color).set(sea.skyMid)
  ;(u.uSeaFill.value as THREE.Color).set(sea.waterMid)
  ;(u.uRim.value as THREE.Color).set(sea.skyHorizon)
  ;(u.uHaze.value as THREE.Color).set(sea.skyHorizon)
  u.uFogNear.value = sea.fog.near
  u.uFogFar.value  = sea.fog.far
}

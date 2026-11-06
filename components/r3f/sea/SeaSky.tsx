'use client'

// SeaSky — the daylight dome over the sea world. One BackSide sphere that
// follows the camera (so it sits at infinity), drawn first with no depth test:
// a zenith → horizon gradient, the warm sun glow from the upper left (the sun
// disc itself is just above frame), and a layer of soft painterly clouds
// projected onto the dome and drifting slowly. The intro video's audio level
// (window.__sfIntroLevel, 0..1) warms the sun glow while it plays.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SeaPalette } from '@/lib/palette'
import { NOISE2_GLSL } from './seaShared'

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunGlow;
  uniform vec3 uCloud;
  uniform vec3 uCloudShade;
  uniform vec3 uSunDir;
  uniform float uTime;
  uniform float uIntro;
  uniform int uOctaves;
  varying vec3 vDir;
  ${NOISE2_GLSL}
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;

    vec3 col = mix(uHorizon, uMid, smoothstep(-0.01, 0.2, h));
    col = mix(col, uZenith, smoothstep(0.18, 0.75, h));

    // sun: wide warm glow + a tighter bloom; the disc sits above frame
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    float glow = pow(s, 6.0) * 0.32 + pow(s, 48.0) * 0.45;
    col += uSunGlow * glow * (1.0 + uIntro * 0.8);
    col = mix(col, uSun, smoothstep(0.9993, 0.9997, s));

    // clouds: fbm projected onto a flat layer overhead, thinned near the
    // zenith and faded into the horizon haze
    if (h > -0.02) {
      vec2 p = d.xz / (h + 0.16) * 0.55 + vec2(uTime * 0.0045, uTime * 0.0016);
      float c = fbm2(p * 1.25, uOctaves);
      float shape = smoothstep(0.5, 0.78, c);
      float band  = smoothstep(0.0, 0.1, h) * (1.0 - smoothstep(0.5, 0.85, h));
      // lit from the sun side: sample the density a step toward the sun
      float toward = fbm2((p + normalize(uSunDir.xz) * 0.06) * 1.25, uOctaves);
      float lit = clamp(0.55 + (c - toward) * 5.0, 0.0, 1.0);
      vec3 cloud = mix(uCloudShade, uCloud, lit);
      cloud += uSunGlow * pow(s, 10.0) * 0.25;
      col = mix(col, cloud, shape * band * 0.92);
    }

    // haze band hugging the horizon (matches the ocean's far fog)
    col = mix(col, uHorizon, exp(-abs(h) * 22.0) * 0.55);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export function SeaSky({ sea, octaves, motion }: { sea: SeaPalette; octaves: number; motion: number }) {
  const groupRef = useRef<THREE.Group>(null)

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uZenith:     { value: new THREE.Color() },
      uMid:        { value: new THREE.Color() },
      uHorizon:    { value: new THREE.Color() },
      uSun:        { value: new THREE.Color() },
      uSunGlow:    { value: new THREE.Color() },
      uCloud:      { value: new THREE.Color() },
      uCloudShade: { value: new THREE.Color() },
      uSunDir:     { value: new THREE.Vector3() },
      uTime:       { value: 0 },
      uIntro:      { value: 0 },
      uOctaves:    { value: 3 },
    },
    vertexShader:   VERT,
    fragmentShader: FRAG,
    side:        THREE.BackSide,
    depthTest:   false,
    depthWrite:  false,
    toneMapped:  false,
  }), [])
  useEffect(() => () => mat.dispose(), [mat])

  useEffect(() => {
    const u = mat.uniforms
    ;(u.uZenith.value as THREE.Color).set(sea.skyZenith)
    ;(u.uMid.value as THREE.Color).set(sea.skyMid)
    ;(u.uHorizon.value as THREE.Color).set(sea.skyHorizon)
    ;(u.uSun.value as THREE.Color).set(sea.sun)
    ;(u.uSunGlow.value as THREE.Color).set(sea.sunGlow)
    ;(u.uCloud.value as THREE.Color).set(sea.cloud)
    ;(u.uCloudShade.value as THREE.Color).set(sea.cloudShade)
    ;(u.uSunDir.value as THREE.Vector3).set(...sea.sunDir).normalize()
    u.uOctaves.value = Math.max(2, Math.min(5, octaves + 1))
  }, [sea, octaves, mat])

  useFrame(({ camera }, delta) => {
    groupRef.current?.position.copy(camera.position)
    mat.uniforms.uTime.value += Math.min(delta, 0.25) * motion
    const lvl = (window as unknown as { __sfIntroLevel?: number }).__sfIntroLevel ?? 0
    mat.uniforms.uIntro.value += (lvl - mat.uniforms.uIntro.value) * 0.25
  })

  return (
    <group ref={groupRef}>
      <mesh material={mat} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[200, 48, 24]} />
      </mesh>
    </group>
  )
}

'use client'

// IslandProps — set dressing for the sea world, lit with the same painterly
// shader as the islands: clumpy round trees (Ghibli-like canopies), palms
// with curved trunks, a white lighthouse with ember bands and a softly
// breathing lamp, and a rock arch between sea stacks.
//
// Everything is placed in the island's UNSCALED local space (world units),
// so props keep their proportions on any island.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { SeaPalette } from '@/lib/palette'
import { PAINT_LIGHT_GLSL, PAINT_NOISE_GLSL, applyPaint, paintUniforms } from './paint'

// ─── shared prop material ──────────────────────────────────────────────────
const PROP_VERT = /* glsl */ `
  attribute float aTint;
  varying vec3 vW;
  varying vec3 vN;
  varying vec3 vCol;
  varying float vTint;
  varying float vLocalY;
  void main() {
    vec4 local = vec4(position, 1.0);
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
    #endif
    vec4 w = m * local;
    vW = w.xyz;
    vN = normalize(mat3(m) * normal);
    #ifdef USE_COLOR
      vCol = color;
    #else
      vCol = vec3(1.0);
    #endif
    vTint = aTint;
    vLocalY = position.y;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const PROP_FRAG = /* glsl */ `
  ${PAINT_NOISE_GLSL}
  ${PAINT_LIGHT_GLSL}
  uniform float uEmber;
  varying vec3 vW;
  varying vec3 vN;
  varying vec3 vCol;
  varying float vTint;
  varying float vLocalY;
  void main() {
    vec3 albedo = vCol * (0.86 + vTint * 0.28);
    albedo *= 0.92 + pNoise(vW * 3.1) * 0.16;
    // canopies darken toward their underside (self-shadowing clumps)
    float ao = mix(0.6, 1.0, smoothstep(0.35, 0.9, vLocalY));
    // thin two-sided parts (sails, fronds) are lit from whichever side we see
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 col = paint(albedo, n, vW, ao);
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`

export function propMaterial(sea: SeaPalette) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...paintUniforms(), uEmber: { value: 0 } },
    vertexShader: PROP_VERT,
    fragmentShader: PROP_FRAG,
    vertexColors: true,
    transparent: true,
    depthWrite: true,
    toneMapped: false,
  })
  applyPaint(m, sea)
  return m
}

export function colorize(g: THREE.BufferGeometry, c: THREE.Color) {
  const n = g.getAttribute('position').count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}

// ─── geometries (unit height ≈ 1) ──────────────────────────────────────────
function treeGeometry(sea: SeaPalette) {
  const trunk = colorize(new THREE.CylinderGeometry(0.035, 0.06, 0.42, 6, 1).toNonIndexed(), new THREE.Color(sea.trunk))
  trunk.translate(0, 0.21, 0)
  const leaf = new THREE.Color(sea.foliage)
  const leafD = new THREE.Color(sea.foliageDark)
  const blobs: THREE.BufferGeometry[] = [trunk]
  const puffs: [number, number, number, number, THREE.Color][] = [
    [0, 0.62, 0, 0.3, leaf],
    [0.16, 0.52, 0.06, 0.22, leafD],
    [-0.15, 0.55, -0.05, 0.21, leafD],
    [0.04, 0.8, -0.03, 0.2, leaf],
  ]
  for (const [x, y, z, r, c] of puffs) {
    const g = colorize(new THREE.IcosahedronGeometry(r, 2), c)
    g.scale(1, 0.86, 1)
    g.translate(x, y, z)
    blobs.push(g)
  }
  return mergeGeometries(blobs)!
}

function palmGeometry(sea: SeaPalette) {
  const parts: THREE.BufferGeometry[] = []
  const trunkC = new THREE.Color(sea.trunk).lerp(new THREE.Color(sea.sand), 0.35)
  // curved trunk: stacked tapered segments along a gentle arc
  const SEG = 7
  let px = 0, py = 0
  for (let i = 0; i < SEG; i++) {
    const t = i / SEG
    const len = 0.13
    const r0 = 0.045 * (1 - t * 0.45), r1 = 0.045 * (1 - (t + 1 / SEG) * 0.45)
    const g = colorize(new THREE.CylinderGeometry(r1, r0, len, 6, 1).toNonIndexed(), trunkC)
    const lean = 0.18 + t * 0.32
    g.rotateZ(-lean)
    g.translate(px + Math.sin(lean) * len / 2, py + Math.cos(lean) * len / 2, 0)
    parts.push(g)
    px += Math.sin(lean) * len
    py += Math.cos(lean) * len
  }
  // fronds: drooping blades fanned round the crown
  const frondC = new THREE.Color(sea.palm)
  const F = 8
  for (let k = 0; k < F; k++) {
    const blade = new THREE.PlaneGeometry(0.5, 0.11, 6, 1)
    const p = blade.getAttribute('position') as THREE.BufferAttribute
    for (let v = 0; v < p.count; v++) {
      const x = p.getX(v) + 0.25          // 0..0.5 along the blade
      const y = p.getY(v) * (1 - x * 1.6)  // taper to a point
      p.setXYZ(v, x, -x * x * 1.6, y)       // droop
    }
    blade.computeVertexNormals()
    blade.rotateY((k / F) * Math.PI * 2 + (k % 2) * 0.2)
    blade.translate(px, py, 0)
    parts.push(colorize(blade.toNonIndexed(), frondC))
  }
  const g = mergeGeometries(parts)!
  g.computeBoundingSphere()
  return g
}

function lighthouseGeometry(sea: SeaPalette) {
  const white = new THREE.Color(sea.lighthouse)
  const ember = new THREE.Color('#e0682a')
  const dark  = new THREE.Color('#3b3f4a')
  const prof = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.17, 0), new THREE.Vector2(0.15, 0.62),
    new THREE.Vector2(0.11, 0.66), new THREE.Vector2(0.11, 0.8), new THREE.Vector2(0.14, 0.8),
    new THREE.Vector2(0.09, 0.95), new THREE.Vector2(0.0, 1.0),
  ]
  const g = new THREE.LatheGeometry(prof, 28).toNonIndexed()
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  const col = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const c = y > 0.8 ? ember : y > 0.66 ? dark : (y > 0.2 && y < 0.3) || (y > 0.44 && y < 0.53) ? ember : white
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

// ─── components ────────────────────────────────────────────────────────────
export interface PlacedProp { x: number; y: number; z: number; scale: number; yaw: number; tint: number }

function usePropMaterial(sea: SeaPalette, opacity: React.MutableRefObject<number>) {
  const mat = useMemo(() => propMaterial(sea), [sea])
  useEffect(() => () => mat.dispose(), [mat])
  useFrame(({ camera }) => {
    ;(mat.uniforms.uCamPos.value as THREE.Vector3).copy(camera.position)
    mat.uniforms.uOpacity.value = opacity.current
  })
  return mat
}

function Instanced({ geo, items, mat }: { geo: THREE.BufferGeometry; items: PlacedProp[]; mat: THREE.ShaderMaterial }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const tinted = useMemo(() => {
    const g = geo.clone()
    g.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(items.map((i) => i.tint)), 1))
    return g
  }, [geo, items])
  useEffect(() => () => tinted.dispose(), [tinted])
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z)
      o.rotation.set(0, it.yaw, 0)
      o.scale.setScalar(it.scale)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [items])
  if (!items.length) return null
  return <instancedMesh ref={ref} args={[tinted, mat, items.length]} frustumCulled={false} />
}

export function Trees({ sea, items, opacity }: { sea: SeaPalette; items: PlacedProp[]; opacity: React.MutableRefObject<number> }) {
  const geo = useMemo(() => treeGeometry(sea), [sea])
  useEffect(() => () => geo.dispose(), [geo])
  const mat = usePropMaterial(sea, opacity)
  return <Instanced geo={geo} items={items} mat={mat} />
}

export function Palms({ sea, items, opacity }: { sea: SeaPalette; items: PlacedProp[]; opacity: React.MutableRefObject<number> }) {
  const geo = useMemo(() => palmGeometry(sea), [sea])
  useEffect(() => () => geo.dispose(), [geo])
  const mat = usePropMaterial(sea, opacity)
  mat.side = THREE.DoubleSide
  return <Instanced geo={geo} items={items} mat={mat} />
}

export function Lighthouse({ sea, at, size, opacity, motion }: {
  sea: SeaPalette
  at: THREE.Vector3
  size: number
  opacity: React.MutableRefObject<number>
  motion: number
}) {
  const geo = useMemo(() => lighthouseGeometry(sea), [sea])
  useEffect(() => () => geo.dispose(), [geo])
  const mat = usePropMaterial(sea, opacity)
  const glowRef = useRef<THREE.Mesh>(null)
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ff9a4a', transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false,
  }), [])
  useEffect(() => () => glowMat.dispose(), [glowMat])
  useFrame(({ clock, camera }) => {
    const breathe = motion ? 0.5 + 0.5 * Math.sin(clock.elapsedTime * 1.6) : 0.7
    glowMat.opacity = (0.35 + breathe * 0.35) * opacity.current
    glowRef.current?.lookAt(camera.position)
  })
  return (
    <group position={at} scale={size}>
      <mesh geometry={geo} material={mat} />
      <mesh ref={glowRef} position={[0, 0.73, 0]} material={glowMat}>
        <circleGeometry args={[0.13, 24]} />
      </mesh>
    </group>
  )
}

/** A rock arch springing between two points (world units, island local). */
export function Arch({ sea, from, to, base, opacity }: {
  sea: SeaPalette
  from: THREE.Vector3
  to: THREE.Vector3
  base: number
  opacity: React.MutableRefObject<number>
}) {
  const span = from.distanceTo(new THREE.Vector3(to.x, from.y, to.z))
  const R = span / 2
  const geo = useMemo(() => {
    const g = new THREE.TorusGeometry(R, R * 0.16, 14, 40, Math.PI)
    g.scale(1, 0.75, 1.25)
    return colorize(g.toNonIndexed(), new THREE.Color(sea.rock))
  }, [R, sea])
  useEffect(() => () => geo.dispose(), [geo])
  const mat = usePropMaterial(sea, opacity)
  const mid = new THREE.Vector3((from.x + to.x) / 2, base, (from.z + to.z) / 2)
  const yaw = Math.atan2(-(to.z - from.z), to.x - from.x)
  return <mesh geometry={geo} material={mat} position={mid} rotation={[0, yaw, 0]} />
}

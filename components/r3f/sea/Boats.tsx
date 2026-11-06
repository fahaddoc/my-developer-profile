'use client'

// Boats — a few small sailboats (kashti) on the sea world: a wooden hull with
// an ember stripe, a mast, a cream dhow-style triangular sail and a small jib,
// painted with the shared painterly shader. Each one sails a slow, wide loop
// around its anchor, bobbing, pitching and rolling on the swell, and writes
// its position + heading into `state` every frame so the ocean can draw a
// V-shaped wake behind it. One is moored by the Contact cove (no loop).

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { SeaPalette } from '@/lib/palette'
import { SEA_Y, islandVisibility } from './seaShared'
import { colorize, propMaterial } from './IslandProps'

/** Boat geometry, length ~1.2 along +z (bow at +z), waterline at y 0. */
function boatGeometry(sea: SeaPalette) {
  const wood  = new THREE.Color(sea.trunk)
  const deckC = new THREE.Color(sea.sand).lerp(wood, 0.35)
  const ember = new THREE.Color('#d9672a')
  const sailC = new THREE.Color(sea.lighthouse)

  // hull: the bottom half of a sphere, squashed, with a pointed bow
  const hull = new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)
  const hp = hull.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < hp.count; i++) {
    let x = hp.getX(i) * 0.22, y = hp.getY(i) * 0.17
    const z = hp.getZ(i) * 0.6
    x *= 1 - Math.max(0, z) / 0.6 * 0.72               // pointed bow
    y *= 1 - Math.max(0, -z) / 0.6 * 0.25               // shallower stern
    hp.setXYZ(i, x, y + 0.035, z)
  }
  hull.computeVertexNormals()
  const hullNI = hull.toNonIndexed()
  const hpos = hullNI.getAttribute('position') as THREE.BufferAttribute
  const hcol = new Float32Array(hpos.count * 3)
  for (let i = 0; i < hpos.count; i++) {
    const c = hpos.getY(i) > 0.0 ? ember : wood
    hcol[i * 3] = c.r; hcol[i * 3 + 1] = c.g; hcol[i * 3 + 2] = c.b
  }
  hullNI.setAttribute('color', new THREE.BufferAttribute(hcol, 3))

  // deck
  const deck = new THREE.CircleGeometry(1, 22)
  deck.rotateX(-Math.PI / 2)
  const dp = deck.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < dp.count; i++) {
    let x = dp.getX(i) * 0.2
    const z = dp.getZ(i) * 0.57
    x *= 1 - Math.max(0, z) / 0.57 * 0.72
    dp.setXYZ(i, x, 0.03, z)
  }
  const deckNI = colorize(deck.toNonIndexed(), deckC)

  const mast = colorize(new THREE.CylinderGeometry(0.012, 0.017, 0.95, 6).toNonIndexed(), wood)
  mast.translate(0, 0.5, 0.06)

  // dhow-style sail: a billowed triangle (top, front-bottom, back-bottom)
  const sail = new THREE.BufferGeometry()
  const top = [0, 0.96, 0.08], fb = [0, 0.16, 0.48], bb = [0, 0.12, -0.42]
  const belly = [0.09, 0.42, 0.04]
  sail.setAttribute('position', new THREE.Float32BufferAttribute([
    ...top, ...belly, ...fb,
    ...top, ...bb, ...belly,
    ...belly, ...bb, ...fb,
  ], 3))
  sail.computeVertexNormals()
  const sailNI = colorize(sail, sailC)
  const jib = new THREE.BufferGeometry()
  jib.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.62, 0.1, 0.03, 0.14, 0.5, 0, 0.1, 0.62], 3))
  jib.computeVertexNormals()
  const jibNI = colorize(jib, sailC)
  const flag = new THREE.BufferGeometry()
  flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.0, 0.06, 0, 0.96, -0.08, 0, 0.92, 0.06], 3))
  flag.computeVertexNormals()
  const flagNI = colorize(flag, ember)

  for (const g of [hullNI, deckNI, mast, sailNI, jibNI, flagNI]) {
    g.deleteAttribute('uv')
  }
  const g = mergeGeometries([hullNI, deckNI, mast, sailNI, jibNI, flagNI])!
  g.computeBoundingSphere()
  return g
}

export interface BoatSpec {
  /** where it sits when its station is at rest */
  anchor: THREE.Vector3
  /** world size multiplier (boat length ≈ 1.2 × size) */
  size: number
  /** loop radius in boat lengths (0 = moored) */
  loop: number
  /** initial heading (radians, 0 = +z) */
  heading: number
  /** +1 / -1 sailing direction around the loop */
  dir: number
  stationT: number
  last: boolean
  seed: number
}

/** Live boat state shared with the ocean (for wakes). */
export interface BoatLive { x: number; z: number; heading: number; len: number; vis: number; moving: number }

export function Boats({ sea, boats, motion, getCamT, state }: {
  sea: SeaPalette
  boats: BoatSpec[]
  motion: number
  getCamT: () => number
  state: React.MutableRefObject<BoatLive[]>
}) {
  const geo = useMemo(() => boatGeometry(sea), [sea])
  useEffect(() => () => geo.dispose(), [geo])
  // one material per boat, so each can dissolve on its own after it is passed
  const mats = useMemo(() => boats.map(() => {
    const m = propMaterial(sea)
    m.side = THREE.DoubleSide
    return m
  }), [sea, boats])
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats])

  const refs = useRef<(THREE.Group | null)[]>([])
  const time = useRef(0)

  // each boat sails a circle whose centre is offset so it starts on its anchor
  const paths = useMemo(() => boats.map((b) => {
    const R = b.loop * 1.2 * b.size
    const left = new THREE.Vector3(Math.cos(b.heading), 0, -Math.sin(b.heading)).multiplyScalar(b.dir)
    const centre = b.anchor.clone().addScaledVector(left, R)
    const theta0 = Math.atan2(b.anchor.z - centre.z, b.anchor.x - centre.x)
    const speed = 0.22 * b.size                         // world units / s
    return { R, centre, theta0, omega: R > 0 ? (speed / R) * b.dir : 0 }
  }), [boats])

  useEffect(() => {
    state.current = boats.map((b) => ({ x: b.anchor.x, z: b.anchor.z, heading: b.heading, len: 1.2 * b.size, vis: 1, moving: b.loop > 0 ? 1 : 0 }))
  }, [boats, state])

  useFrame(({ camera }, delta) => {
    time.current += Math.min(delta, 0.25) * motion
    const t = time.current
    const camT = getCamT()
    boats.forEach((b, i) => {
      const g = refs.current[i]
      if (!g) return
      const p = paths[i]
      let x = b.anchor.x, z = b.anchor.z, heading = b.heading
      if (p.R > 0) {
        const th = p.theta0 + p.omega * t
        x = p.centre.x + Math.cos(th) * p.R
        z = p.centre.z + Math.sin(th) * p.R
        // tangent of the circle, in the direction of travel
        const tx = -Math.sin(th) * Math.sign(p.omega), tz = Math.cos(th) * Math.sign(p.omega)
        heading = Math.atan2(tx, tz)
      }
      const ph = b.seed * 1.7
      const bob = Math.sin(t * 1.35 + ph) * 0.035 * b.size
      g.position.set(x, SEA_Y + bob, z)
      g.rotation.set(Math.sin(t * 1.1 + ph) * 0.05, heading, Math.sin(t * 0.9 + ph * 2) * 0.07)
      const vis = islandVisibility(camT, b.stationT, b.last)
      g.visible = vis > 0.002
      const m = mats[i]
      ;(m.uniforms.uCamPos.value as THREE.Vector3).copy(camera.position)
      m.uniforms.uOpacity.value = vis
      const s = state.current[i]
      if (s) { s.x = x; s.z = z; s.heading = heading; s.vis = vis }
    })
  })

  return (
    <>
      {boats.map((b, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el }} scale={b.size}>
          <mesh geometry={geo} material={mats[i]} />
        </group>
      ))}
    </>
  )
}

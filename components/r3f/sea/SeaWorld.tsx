'use client'

// SeaWorld — light mode's world: sky, ocean, sun and one island per station.
// Mounted by TunnelScene in place of the nebula + planets when the theme is
// light. Islands are real objects at fixed world positions (the camera flies
// past them like an archipelago); each is solved from its screen-authored
// shot for the current viewport, so the station frames match DESIGN.md at
// any desktop size.

import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ScenePalette } from '@/lib/palette'
import type { QualityPreset } from '@/lib/quality'
import { STATIONS } from '@/lib/tunnel'
import { SeaSky } from './SeaSky'
import { Ocean, type OceanIsland } from './Ocean'
import { Island } from './Island'
import { ISLANDS, placeIsland, seaLookDir, type IslandId } from './seaShared'

export function SeaWorld({ palette, preset, motion, curve, lookAhead, skillsSx, onActive, getCamT }: {
  palette:   ScenePalette
  preset:    QualityPreset
  motion:    number
  curve:     THREE.CatmullRomCurve3
  lookAhead: number
  /** screen x (fraction) of the skills orbit centre, so its islet sits under it */
  skillsSx:  (W: number, H: number) => number
  onActive?: (ms?: number) => void
  /** damped camera progress (what is on screen) */
  getCamT:   () => number
}) {
  const sea = palette.sea!
  const W = useThree((s) => s.size.width)
  const H = useThree((s) => s.size.height)

  const placed = useMemo(() => {
    const pos = new THREE.Vector3()
    const ahead = new THREE.Vector3()
    const dir = new THREE.Vector3()
    return STATIONS.filter((s) => s.id in ISLANDS).map((s) => {
      const id = s.id as IslandId
      curve.getPointAt(s.t, pos)
      curve.getPointAt(Math.min(0.9999, s.t + lookAhead), ahead)
      seaLookDir(pos, ahead, dir)
      const sx = id === 'skills' ? skillsSx(Math.max(1, W), Math.max(1, H)) : undefined
      return { id, t: s.t, shape: ISLANDS[id], ...placeIsland(ISLANDS[id], pos, dir, Math.max(1, W), Math.max(1, H), sx) }
    })
  }, [curve, lookAhead, skillsSx, W, H])

  const oceanIslands: OceanIsland[] = useMemo(
    () => placed.map((p, i) => ({
      x: p.position.x, z: p.position.z, radius: p.radius * 1.02, stretch: p.shape.stretch,
      stationT: p.t, last: i === placed.length - 1,
    })),
    [placed],
  )

  const birds  = preset.starCount >= 3000 ? 12 : preset.starCount >= 1500 ? 9 : 6
  const detail = preset.starCount >= 3000 ? 1 : preset.starCount >= 1500 ? 0.7 : 0.4

  return (
    <>
      <SeaSky sea={sea} octaves={preset.nebulaOctaves} motion={motion} />
      <Ocean sea={sea} octaves={preset.nebulaOctaves} motion={motion} islands={oceanIslands} getCamT={getCamT} />


      {placed.map((p) => (
        <Island
          key={p.id}
          shape={p.shape}
          sea={sea}
          position={p.position}
          yaw={p.yaw}
          radius={p.radius}
          height={p.height}
          birds={birds}
          motion={motion}
          onActive={onActive}
          stationT={p.t}
          getCamT={getCamT}
          last={p.id === placed[placed.length - 1].id}
          detail={detail}
        />
      ))}
    </>
  )
}

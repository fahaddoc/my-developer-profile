'use client'

// Precompile — links every shader program in the scene up front, so no
// station pays for a shader compile when it first enters the frustum mid
// flight (the Work station's ring was a long main-thread task there).
//
// three only builds a program the first time a mesh using it is drawn, and
// planets outside the view are culled or hidden (root.visible = false), so
// their programs used to link during the scroll. renderer.compile() walks the
// graph with traverse() (not traverseVisible(), no frustum culling), so it
// reaches every mounted material, including both passes of a transparent
// DoubleSide ring. It only issues compileShader / linkProgram; the driver
// links in the background and nothing waits on it until that mesh is first
// drawn, by which time the program is ready.
//
// It runs once, after the first frame has rendered (that frame compiles what
// is on screen, so this never delays it) and in idle time, while the boot
// loader is still up. Mount it with a key that changes when the world swaps
// (space <-> sea) so the new world gets the same treatment. It renders
// nothing and never touches the frameloop.
//
// Plain compile() rather than compileAsync(): we never await readiness, and
// compileAsync's 10ms readiness poll throws (uncaught, in a timer) if a
// material is disposed while it polls, e.g. a theme flip during load.

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
}

export function Precompile() {
  const gl     = useThree((s) => s.gl)
  const scene  = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const armed  = useRef(true)
  // A pending compile is dropped if the Canvas unmounts first (context-loss
  // remount, world swap). A flag, not a cancel: StrictMode's dev re-run of
  // effects must not lose the one compile this component ever schedules.
  const alive  = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  useFrame(() => {
    if (!armed.current) return
    armed.current = false
    const run = () => { if (alive.current) gl.compile(scene, camera) }
    const w = window as IdleWindow
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 1000 })
    else window.setTimeout(run, 150)
  })

  return null
}
